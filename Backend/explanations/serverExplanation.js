const express = require("express");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const connectToDB = require("./db_connection"); // Import the db connection
const { Session, UserAuth } = require("./schema");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
require("dotenv").config(); // Load environment variables
const app = express();
app.use(bodyParser.json());
// Allow requests from localhost:3000
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// Endpoint to fetch all data related to a session by ID in overallAnalysis.js
app.get("/sessions/:sessionId", async (req, res) => {
  console.log("Fetching session data for overall analysis");
  const { sessionId } = req.params; //req.params has sessionId stored in it which we passing in the fetch url for get
  console.log(sessionId);

  try {
    // Fetch session data by sessionId from MongoDB
    const sessionData = await Session.findOne({ sessionId }, "modelResponse");
    // first argument finds a single document based on the sessionId field
    // second argument only fetches the modelResponse field
    console.log(sessionData);

    if (!sessionData) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Return only the modelResponse array
    res.status(200).json(sessionData.modelResponse);
  } catch (error) {
    console.error("Error fetching session data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all session IDs, session names, and timestamps
app.get("/sessions", async (req, res) => {
  try {
    // Fetch all sessions with sessionId, sessionName, and timestamp fields
    const sessions = await Session.find({}, "sessionId sessionName timestamp");
    // Seesion is a Mongodb schema you defined which has fields like sessionId, sessionName, and timestamp
    // using find, we retrieve all documents form Session collection
    // The first argument, {}, is an empty object, which means it will fetch all documents from the collection
    // the second argument specifies which fields to extract
    // this code is to retrieve data from mongodb

    // Map to create an array of objects with sessionId, sessionName, and formatted timestamp
    const sessionData = sessions.map((session) => {
      const date = new Date(session.timestamp); //converting timestamp property of session object to a javascript Date object
      return {
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        timestamp: [
          date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
        ],
      };
      // For each session object, it creates a new object with the following properties:
      // sessionId: The original sessionId from the database.
      // sessionName: The original sessionName from the database.
      // timestamp: An array containing two strings:
      // The formatted date in US format (MM/DD/YYYY) using toLocaleDateString.
      // The formatted time in US format (hh:mm:ss AM/PM) using toLocaleTimeString
    });

    res.status(200).json(sessionData);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Get the next available child name based on the current highest ChildXXX
app.get("/next-child", async (req, res) => {
  try {
    // Query the database for all session names that match the pattern 'ChildXXX'
    const sessions = await Session.find({ sessionName: /^Child\d{3}$/ }).select(
      "sessionName -_id"
    );

    let nextChildNum = 1; // Default to 'Child001' if no sessions exist

    if (sessions.length > 0) {
      // Extract the numeric part from each 'ChildXXX' session name
      const childNumbers = sessions.map((session) =>
        parseInt(session.sessionName.replace("Child", ""), 10)
      );

      // Get the maximum number found
      const maxChildNum = Math.max(...childNumbers);

      // Increment the max number by 1 for the next available child name
      nextChildNum = maxChildNum + 1;
    }

    const nextChildName = `Child${nextChildNum.toString().padStart(3, "0")}`;
    res.status(200).json({ nextChildName });
  } catch (error) {
    console.error("Error fetching next child name:", error);
    res.status(500).json({ error: "Failed to fetch next child name" });
  }
});

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve uploaded screenshots
app.use("/screenshots", express.static(path.join(__dirname, "screenshots")));

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads"); // Path to the uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

const screenshotStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const screenshotDir = "./screenshots"; // Path to the screenshots folder
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    cb(null, screenshotDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const uploadScreenshot = multer({ storage: screenshotStorage });

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint to handle image uploads
app.post("/uploads", upload.single("image"), async (req, res) => {
  try {
    console.log("Uploaded file:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { newSessionId, sessionName } = req.body;
    const imagePath = req.file.path; // Use the path from multer

    await saveAnalysisResult(imagePath, newSessionId, sessionName, "image"); // Save the result to MongoDB
    res.status(200).json({ message: "Image uploaded and data saved to DB" });
  } catch (error) {
    console.error("Error saving to DB:", error);
    res.status(500).json({ error: "Failed to save image or session data" });
  }
});

// Endpoint to handle screenshot uploads (stored in 'screenshots' folder)
app.post(
  "/screenshots",
  uploadScreenshot.single("screenshot"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No screenshot uploaded" });
      }

      const { newSessionId, sessionName } = req.body;
      const screenshotPath = req.file.path; // Use the path from multer (screenshots/)

      // Save screenshot path to MongoDB
      await saveAnalysisResult(
        screenshotPath,
        newSessionId,
        sessionName,
        "screenshot"
      ); // Indicate it's a screenshot
      res
        .status(200)
        .json({ message: "Screenshot uploaded and path saved to DB" });
    } catch (error) {
      console.error("Error saving screenshot to DB:", error);
      res
        .status(500)
        .json({ error: "Failed to save screenshot or session data" });
    }
  }
);

async function saveAnalysisResult(filePath, sessionId, sessionName, fileType) {
  try {
    console.log("Session Name : ", sessionName);
    const update = {
      sessionName: sessionName || "Unnamed Session", // Set default sessionName if not provided
      timestamp: new Date(), // Add this line to update the timestamp
    };
    // Store the correct path depending on file type (image or screenshot)
    if (fileType === "image") {
      update.$push = { imagePaths: filePath }; // Use $push to append to the imagePaths array
    } else if (fileType === "screenshot") {
      update.$push = { screenshotPaths: filePath }; // Use $push to append to the screenshotPaths array
    }

    // Find the session by sessionId and update with the file path and sessionName
    await Session.findOneAndUpdate({ sessionId: sessionId }, update, {
      upsert: true,
      new: true,
    });

    console.log(`${fileType} path and sessionName saved to MongoDB`);
  } catch (error) {
    console.error("Error saving file path or sessionName to MongoDB:", error);
    throw error;
  }
}
// full code for getting analysis

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const MODEL_URL =
  "https://api-inference.huggingface.co/models/trpakov/vit-face-expression";

// Endpoint to check if analysis exists for a session
app.get("/sessions/analysis/:sessionId", async (req, res) => {
  console.log("hi hi");
  const { sessionId } = req.params; //extracting sessionId from req.params
  try {
    // Find the session by sessionId
    const session = await Session.findOne({ sessionId });
    // finding the session object with thaat particular sessionId and storing it in session
    console.log(session);
    if (!(session.modelResponse.length === session.imagePaths.length)) {
      // checking if all the images have analysis or not
      console.log("not equal");
    }
    // Check if session or modelResponse exist
    if (
      !session ||
      !session.modelResponse ||
      session.modelResponse.length === 0 ||
      !(session.modelResponse.length === session.imagePaths.length)
    ) {
      // Return 404 if no analysis data is available or the array is empty
      console.log("not found ");
      return res
        .status(404)
        .json({ message: "No analysis found for this session" });
    }

    // Send back the existing analysis results
    res.status(200).json({ analysisResults: session.modelResponse });
  } catch (error) {
    console.error("Error checking for analysis:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
  //   the endpoint is to retrive a particular session based on sessionid, checking if analysis exists for all images, if yes, sends it as json response, if no analysis send error
});
// Get images for a specific session ID
app.get("/sessions/media/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    // Fetch the session by sessionId from MongoDB
    const session = await Session.findOne({ sessionId: sessionId }); //finding session with that particular sessionid
    if (!session) {
      //if session not found, then...
      return res.status(404).json({ error: "Session not found" });
    }

    // Return imagePaths and screenshotPaths
    res.status(200).json({
      imagePaths: session.imagePaths,
      //screenshotPaths: session.screenshotPaths
    });
    console.log("images sent");
  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

// Endpoint to send images to the model for analysis
app.post("/sessions/analyze/:sessionId", async (req, res) => {
  const { sessionId } = req.params; //req.params holds data from dynamic URL parameters
  const { images } = req.body; //req.body holds data sent in the request body

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ message: "No images provided for analysis" });
  }
  // checking if images exist for that session, if not, then sending an error message back

  try {
    const analysisResults = [];

    for (const imagePath of images) {
      //iterating thorugh each imagePath in images array
      try {
        console.log(`Processing image: ${imagePath}`);

        // Read the image as a buffer
        // uses fs.readFileSync to read the image data from the specified path (imagePath) into a buffer
        // buffer is a region of memory used to store data temporarily
        const imageBuffer = fs.readFileSync(imagePath);

        // Call the helper function to send the image to the Hugging Face model
        const modelResult = await sendImageToModel(imageBuffer);
        console.log(modelResult);
        analysisResults.push(modelResult);
        // Push the model result to the analysis results array
      } catch (error) {
        console.error(`Failed to process image ${imagePath}:`, error.message);
        // Optionally, continue processing other images or return an error immediately
        continue;
      }
    }
    console.log(analysisResults);
    saveAnalysisResults(sessionId, analysisResults)
      .then((response) => {
        if (response.success) {
          console.log("Results saved:", response.session);
        } else {
          console.log("Failed to save results:", response.message);
        }
      })
      .catch((error) => {
        console.error("Unexpected error:", error);
      });
    // Return the collected analysis results
    return res.status(200).json({ analysisResults });
  } catch (error) {
    console.error("Error analyzing images:", error);
    res.status(500).json({ message: "Error analyzing images" });
  }
});
// Endpoint to save analysis results in MongoDB
const saveAnalysisResults = async (sessionId, analysisResults) => {
  // Check if analysisResults is an array
  console.log("SaveAna.......... function called");
  if (!Array.isArray(analysisResults)) {
    console.error("Analysis results must be provided as an array");
    return { success: false, message: "Analysis results must be an array" };
  }

  try {
    // Find the session by sessionId and update the modelResponse field
    const updatedSession = await Session.findOneAndUpdate(
      { sessionId },
      { $set: { modelResponse: analysisResults } },
      // The $set operator is used to update the modelResponse field of the session document with the provided analysisResults array.
      { new: true }
      // ensures that updated document is returned
    );

    if (!updatedSession) {
      console.error("Session not found");
      return { success: false, message: "Session not found" };
    }

    console.log("Analysis results saved successfully:", updatedSession);
    return { success: true, session: updatedSession };
  } catch (error) {
    console.error("Error saving analysis results:", error);
    return { success: false, message: "Error saving analysis results" };
  }
};

// Helper function to send the image to Hugging Face model
async function sendImageToModel(imageBuffer, retries = 5, delay = 5000) {
  // retires: no of times to retry sending the images in case of errors
  // delay: delay between retries

  console.log("SendImageToModel function called ");
  const base64Image = imageBuffer.toString("base64");
  // Convert the image buffer to base64 encoded string
  // Many Hugging Face models accept base64 encoded images as input
  // base64 us used to send binary data through channels that only support text

  for (let i = 0; i < retries; i++) {
    try {
      // Send the image to the Hugging Face model as base64
      const response = await axios.post(
        MODEL_URL,
        { image: base64Image }, // Adjust the payload according to model requirements
        {
          headers: {
            Authorization: process.env.HUGGING_FACE_API_KEY,
            "Content-Type": "application/json", // Set content type to JSON
          },
        }
      );

      // If we get a successful response, return it
      return response.data;
    } catch (error) {
      if (
        error.response &&
        error.response.status === 503 &&
        error.response.data.error.includes("currently loading")
      ) {
        const estimatedTime = error.response.data.estimated_time || 5000;
        console.log(
          `Model is still loading, retrying in ${estimatedTime} milliseconds...`
        );

        // Wait for the estimated time before retrying
        await new Promise((resolve) => setTimeout(resolve, estimatedTime));
      } else if (error.response && error.response.status === 400) {
        console.error(
          "Bad request: Ensure you're sending the image in the correct format."
        );
        throw new Error(
          "Failed to process the image with Hugging Face: Bad Request"
        );
      } else {
        console.error(
          "Error sending image to Hugging Face model:",
          error.message
        );
        throw new Error("Failed to process the image with Hugging Face");
      }
    }
  }

  throw new Error("Exceeded retry limit, unable to process the image.");
}
// API to get all sessions
app.get("/detailed_sessions/:sessionId", async (req, res) => {
  console.log("detailed analysis ");
  const { sessionId } = req.params;
  try {
    const sessionData = await Session.findOne({ sessionId }); // Adjust based on your schema
    if (!sessionData) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.json(sessionData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching session data" });
  }
});

(async () => {
  try {
    await connectToDB(); // Establish the MongoDB connection
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
  }
})();

app.get("/", cors(), (req, res) => {
  res.status(200).json("Home works!");
});
app.get("/blah", cors(), (req, res) => {
  res.status(200).json("blah works!");
});

// async function insertSampleUsers() {
//   const users = [
//     { username: "admin", password: "adminpass", role: "admin" },
//     { username: "child1", password: "childpass1", role: "child" },
//     { username: "child2", password: "childpass2", role: "child" },
//     { username: "child3", password: "childpass4", role: "child" },
//   ];
//   for (const user of users) {
//     const hashedPassword = await bcrypt.hash(user.password, 10);
//     const newUser = new UserAuth({
//       username: user.username,
//       password: hashedPassword,
//       role: user.role,
//     });
//     await newUser.save();
//   }
//   console.log("Sample users inserted");
// }

const saltRounds = 10;

async function updatePassword(username, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  await UserAuth.updateOne(
    { username: username },
    { $set: { password: hashedPassword } }
  );
  console.log(`Password for ${username} updated successfully`);
}
updatePassword("child1", "childpass1");
updatePassword("child2", "childpass2");
updatePassword("child3", "childpass3");
updatePassword("admin", "adminpass");
app.post("/adminlogin", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await UserAuth.findOne({ username: username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // Check user role and send appropriate response
    if (user.role === "admin") {
      return res
        .status(200)
        .json({ message: "Welcome, Admin!", redirectTo: "/analysis" });
    } else if (user.role === "child") {
      return res
        .status(200)
        .json({ message: "Welcome, Child!", redirectTo: "/login" });
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// insertSampleUsers();
