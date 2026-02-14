import express from "express";
import multer from "multer";
import { processFile, getLatestDetectionResult } from "../controllers/modelController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/process", upload.single("file"), processFile);
router.post("/latest", authenticateToken, getLatestDetectionResult);

export default router;
