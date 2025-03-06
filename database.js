const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");

const app = express();
const PORT = process.env.PORT || 5001; // Changed from 5000 to 5001

// Multer configuration for handling image uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Route to upload an image and process it with Tesseract OCR
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;

    // Process image with Tesseract OCR
    const { data } = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log(m), // Logs progress
    });

    const numberPlate = data.text ? data.text.trim().replace(/\s+/g, "") : "Not detected";

    // Cleanup local file after processing
    fs.unlinkSync(filePath);

    res.json({ success: true, number_plate: numberPlate });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
