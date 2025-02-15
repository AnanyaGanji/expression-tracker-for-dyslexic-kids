const express = require("express");
const router = express.Router();
const Session = require("../models/sessionModel.js");
const AdminDetails = require("../models/adminModel.js");
const fs = require("fs");
const authenticateToken = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/roleMiddleware.js");
const {
  getSessionMedia,
  sendImageToModel,
  saveAnalysisResults,
} = require("../controllers/admin_helper.js");

// Get all session IDs, session names, and timestamps
router.get("/sessions", async (req, res) => {
  try {
    // Fetch all sessions with sessionId, sessionName, gameName, and timestamp fields
    const sessions = await Session.find(
      {},
      "sessionId sessionName gameName timestamp"
    );
    // Map to create an array of objects with sessionId, sessionName, gameName, and formatted timestamp
    const sessionData = sessions.map((session) => {
      const date = new Date(session.timestamp);
      return {
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        gameName: session.gameName || "N/A", // Include gameName
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
    });

    res.status(200).json(sessionData);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Endpoint to check if analysis exists for a session
router.post("/sessions/analyze/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Fetch the session from the database
    const session = await Session.findOne({ sessionId: sessionId });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Check if analysis results already exist in the database
    if (session.modelResponse && session.modelResponse.length > 0) {
      // If analysis results are already present, skip sending images to the model
      console.log("Analysis already exists for this session");
      return res.status(200).json({
        message: "Analysis already exists for this session",
        analysisResults: session.modelResponse, // Return the existing analysis
      });
    }

    // If no analysis exists, fetch images for analysis
    const { imagePaths = [] } = await getSessionMedia(sessionId);
    console.log(
      "this is the image paths that are being send to the model for analysis",
      imagePaths
    );

    if (!imagePaths || imagePaths.length === 0) {
      return res
        .status(400)
        .json({ message: "No images available for analysis" });
    }

    const analysisResults = [];
    console.log("before for loop of analyzing the images");

    // Process images and send them to the model for analysis
    for (const imagePath of imagePaths) {
      try {
        console.log(`Processing image: ${imagePath}`);

        // Read the image as a buffer
        const imageBuffer = fs.readFileSync(imagePath);
        // console.log("this is imageBuffer i guess", imageBuffer);

        // Call the helper function to send the image to the Hugging Face model
        const modelResult = await sendImageToModel(imageBuffer);
        console.log(modelResult);
        analysisResults.push(modelResult); // Add the analysis result to the array
      } catch (error) {
        console.error(`Failed to process image ${imagePath}:`, error.message);
        continue; // Continue processing other images even if one fails
      }
    }

    // After processing all images, save the analysis results
    console.log("Saving analysis results...");
    const saveResponse = await saveAnalysisResults(sessionId, analysisResults);

    if (saveResponse.success) {
      console.log("Results saved:", saveResponse.session);
    } else {
      console.log("Failed to save results:", saveResponse.message);
    }

    // Refresh the session data after saving results to ensure the latest analysis is fetched
    const updatedSession = await Session.findOne({ sessionId: sessionId });

    // Return the newly collected analysis results
    return res.status(200).json({
      analysisResults: updatedSession.modelResponse || [],
      message: "Analysis completed and results saved.",
    });
  } catch (error) {
    console.error("Error analyzing images:", error);
    return res.status(500).json({ message: "Error analyzing images" });
  }
});

// Get images for a specific session ID
router.get("/sessions/media/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    // Fetch the session by sessionId from MongoDB
    const session = await Session.findOne({ sessionId: sessionId });
    if (!session) {
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

// API to get all sessions
router.get("/detailed_sessions/:sessionId", async (req, res) => {
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

router.get("/sessions/analysis/:sessionId", async (req, res) => {
  console.log("hi hi");
  const { sessionId } = req.params;
  try {
    // Find the session by sessionId
    const session = await Session.findOne({ sessionId });
    console.log(session);
    if (!(session.modelResponse.length === session.imagePaths.length)) {
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
});

// Endpoint to fetch all data related to a session by ID in overallAnalysis.js
router.get("/sessions/:sessionId", async (req, res) => {
  console.log("Fetching session data for overall analysis");
  const { sessionId } = req.params;
  console.log(sessionId);

  try {
    // Fetch session data by sessionId from MongoDB
    const sessionData = await Session.findOne({ sessionId }, "modelResponse"); // Only fetch the modelResponse field
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
// for the admin to manage child accounnts
// Fetch verified admin details
router.get("/verified/:username", async (req, res) => {
  console.log("hello hello");

  const { username } = req.params;
  const admin_email = username;

  console.log("finding the child accounts of user : ", admin_email);

  try {
    // Find the admin by username and check if their status is "approved"
    const admin = await AdminDetails.findOne({ admin_email });
    console.log(admin);
    if (!admin) {
      return res
        .status(404)
        .json({ message: "Admin not found or not approved." });
    }

    // Return the children_accounts array
    res.status(200).json({ children_accounts: admin.children_accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Update children_accounts for a verified admin
router.post("/add-child/:username", async (req, res) => {
  const { username } = req.params;
  const admin_email = username;
  console.log("fAdding child accounts for  : ", admin_email);

  const { name, age, password } = req.body;

  if (!name || !age || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const updatedAdmin = await AdminDetails.findOneAndUpdate(
      { admin_email: username },
      {
        $push: {
          children_accounts: { name, age, password },
        },
      },
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "No verified admin found." });
    }

    res.json(updatedAdmin.children_accounts);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating children accounts.", error: err });
  }
});

module.exports = router;
