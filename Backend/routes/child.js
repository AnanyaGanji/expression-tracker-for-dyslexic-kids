const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  storage,
  screenshotStorage,
  saveAnalysisResult,
} = require("../controllers/child_helper.js");
const Game = require("../models/gameModel.js");

const upload = multer({ storage: storage });

const uploadScreenshot = multer({ storage: screenshotStorage });

router.get("/", (req, res) => {
  res.send("child route is workingg!!!!");
});

router.post("/uploads", upload.single("image"), async (req, res) => {
  console.log("Uploaded file:", req.file);
  console.log("herreeeeeeee");
  try {
    console.log("Uploaded file:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { newSessionId, sessionName, gameName } = req.body; // Include gameName
    const imagePath = req.file.path; // Use the path from multer
    console.log(imagePath);

    await saveAnalysisResult(
      imagePath,
      newSessionId,
      sessionName,
      gameName,
      "image"
    ); // Save the result to MongoDB
    res.status(200).json({ message: "Image uploaded and data saved to DB" });
  } catch (error) {
    console.error("Error saving to DB:", error);
    res.status(500).json({ error: "Failed to save image or session data" });
  }
});

router.post(
  "/screenshots",
  uploadScreenshot.single("screenshot"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No screenshot uploaded" });
      }

      const { newSessionId, sessionName, gameName } = req.body; // Include gameName
      const screenshotPath = req.file.path; // Use the path from multer (screenshots/)

      // Save screenshot path to MongoDB
      await saveAnalysisResult(
        screenshotPath,
        newSessionId,
        sessionName,
        gameName,
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

router.get("/game/:gameId", async (req, res) => {
  const { gameId } = req.params;
  try {
    const game = await Game.findOne({ gameId });
    if (!game) return res.status(404).json({ message: "Game not found" });

    res.json(game.questions); // Return only questions
  } catch (error) {
    res.status(500).json({ message: "Error fetching game questions", error });
  }
});

module.exports = router;
