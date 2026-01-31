import express from "express";
import multer from "multer";
import { processFile } from "../controllers/modelController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/process", upload.single("file"), processFile);

export default router;
