const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com", // Replace with your Firebase DB URL
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer configuration for handling image uploads
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Route to upload an image, process it with Tesseract, and store it in Firebase
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;

    // Process image with Tesseract OCR
    Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log(m),
    })
      .then(async ({ data: { text } }) => {
        const numberPlate = text.trim().replace(/\s+/g, " ");

        // Store extracted data in Firebase Firestore
        const docRef = db.collection("vehicle_data").doc(numberPlate);
        await docRef.set({
          number_plate: numberPlate,
          timestamp: new Date().toISOString(),
        });

        // Cleanup local file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        res.json({ success: true, number_plate: numberPlate });
      })
      .catch((error) => {
        console.error("Error processing image:", error);
        res.status(500).json({ error: "OCR processing failed" });
      });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
