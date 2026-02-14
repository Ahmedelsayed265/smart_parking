import path from "path";
import Jimp from "jimp";
import * as ort from "onnxruntime-node";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ParkingService } from "../services/parkingService.js";
import pool from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let session;

(async () => {
  try {
    const modelPath = path.join(process.cwd(), "best.onnx");
    console.log("🧩 Loading model from:", modelPath);

    session = await ort.InferenceSession.create(modelPath);
    console.log("✅ ONNX model loaded successfully");
  } catch (error) {
    console.error("❌ Error loading model:", error);
  }
})();

function doesIntersect(parkingBox, detection) {
  const x_left = Math.max(parkingBox.x1, detection.x1);
  const x_right = Math.min(parkingBox.x2, detection.x2);
  const y_top = Math.max(parkingBox.y1, detection.y1);
  const y_bottom = Math.min(parkingBox.y2, detection.y2);

  if (x_right < x_left || y_bottom < y_top) {
    return false;
  }

  const intersectionArea = (x_right - x_left) * (y_bottom - y_top);
  const parkingArea = (parkingBox.x2 - parkingBox.x1) * (parkingBox.y2 - parkingBox.y1);
  const percentageOfIntersection = (intersectionArea / parkingArea) * 100;

  if (percentageOfIntersection > 50) {
    return true;
  } else if (percentageOfIntersection < 35) {
    return false;
  } else {
    const xCenter = (detection.x2 + detection.x1) / 2;
    const yCenter = (detection.y2 + detection.y1) / 2;

    return (
      xCenter > parkingBox.x1 &&
      xCenter < parkingBox.x2 &&
      yCenter > parkingBox.y1 &&
      yCenter < parkingBox.y2
    );
  }
}

async function loadParkingBoxesFromDB(parkingLotId) {
  try {
    const parkingService = new ParkingService();
    const slots = await parkingService.getParkingSlots(parkingLotId);
    if (!slots || slots.length === 0) {
      throw new Error(`No parking slots found for lot ${parkingLotId}`);
    }
    return slots;
  } catch (error) {
    console.error("Error loading parking boxes:", error);
    throw error;
  }
}

export const processFile = async (req, res) => {
  try {
    if (!session) {
      return res.status(500).json({ error: "Model not loaded yet" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Extract parking_id from form body or query parameter and parse as integer
    const parking_id = req.body.parking_id || req.query.parking_id;
    const parking_id_int = parking_id ? parseInt(parking_id, 10) : null;
    
    const parkingLotId = parseInt(req.body.parking_id) || parseInt(req.query.parking_id) || 1;;
    const parkingBoxes = await loadParkingBoxesFromDB(parkingLotId);

    // Read original image
    const orig = await Jimp.read(req.file.path);
    const origW = orig.bitmap.width;
    const origH = orig.bitmap.height;

    // === Letterbox to 640x640 (keep aspect ratio + pad) ===
    const TARGET = 640;
    const scale = Math.min(TARGET / origW, TARGET / origH);
    const newW = Math.round(origW * scale);
    const newH = Math.round(origH * scale);
    const padX = Math.floor((TARGET - newW) / 2);
    const padY = Math.floor((TARGET - newH) / 2);

    const resized = orig.clone().resize(newW, newH);
    const letter = new Jimp(TARGET, TARGET, 0x000000FF);
    letter.composite(resized, padX, padY);

    // === Build CHW float32 tensor [1,3,640,640] ===
    const W = TARGET, H = TARGET;
    const chw = new Float32Array(3 * W * H);
    letter.scan(0, 0, W, H, (x, y, idx) => {
      const r = letter.bitmap.data[idx + 0] / 255;
      const g = letter.bitmap.data[idx + 1] / 255;
      const b = letter.bitmap.data[idx + 2] / 255;
      const i = y * W + x;
      chw[i] = r;
      chw[W * H + i] = g;
      chw[2 * W * H + i] = b;
    });

    const inputName =
      (session.inputNames && session.inputNames[0]) ||
      (session.inputMetadata && Object.keys(session.inputMetadata)[0]) ||
      "images";

    const tensor = new ort.Tensor("float32", chw, [1, 3, H, W]);

    // === Run ONNX model (expects NMS-enabled output: (1, 300, 6) xyxy+conf+cls in 640 space) ===
    const output = await session.run({ [inputName]: tensor });
    const outName = Object.keys(output)[0];
    const data = output[outName].data || output[outName];

    // === Parse detections: xyxy pixels in MODEL space (640) -> map back to ORIGINAL space ===
    const detections = [];
    for (let i = 0; i + 5 < data.length; i += 6) {
      const x1m = data[i + 0];
      const y1m = data[i + 1];
      const x2m = data[i + 2];
      const y2m = data[i + 3];
      const conf = data[i + 4];
      const classId = data[i + 5];

      if (conf < 0.25) continue;
      if (classId !== 0) continue; // Cars

      // Invert letterbox
      let x1 = (x1m - padX) / scale;
      let y1 = (y1m - padY) / scale;
      let x2 = (x2m - padX) / scale;
      let y2 = (y2m - padY) / scale;

      // Clamp
      x1 = Math.max(0, Math.min(origW, x1));
      x2 = Math.max(0, Math.min(origW, x2));
      y1 = Math.max(0, Math.min(origH, y1));
      y2 = Math.max(0, Math.min(origH, y2));

      detections.push({
        x1,
        y1,
        x2,
        y2,
        confidence: conf,
        label: "car"
      });
    }

    const occupied = new Set();
    // Iterate exactly like requested logic
    for (const d of detections) {
      for (const box of parkingBoxes) {
        if (doesIntersect(box, d)) {
          occupied.add(box.label);
          break; // Move to next detection once an intersection is found
        }
      }
    }

    const occupiedList = Array.from(occupied).sort((a, b) => parseInt(a) - parseInt(b));

    // Log to database
    const parkingService = new ParkingService();
    let logEntry = null;
    try {
      logEntry = await parkingService.logDetection(
        parkingLotId,
        occupiedList,
        occupiedList.length,
        req.file.path
      );
    } catch (logError) {
      console.error("⚠️ Failed to log to DB:", logError);
    }

    // Build final response
    const allSlots = parkingBoxes.map((b) => b.label);
    const available = allSlots
      .filter((s) => !occupiedList.includes(s))
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Store results in parking_detection_results table if parking_id is provided
    if (parking_id_int && !isNaN(parking_id_int)) {
      try {
        await parkingService.saveParkingDetectionResult(
          parking_id_int,
          occupiedList,
          available
        );
      } catch (saveError) {
        console.error("⚠️ Failed to save parking detection result:", saveError);
      }
    }

    res.json({
      success: true,
      occupied: occupiedList,
      available,
      total: allSlots.length,
    });
  } catch (error) {
    console.error("❌ Error in processFile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getLatestDetectionResult = async (req, res) => {
  try {
    const { parking_id } = req.body;

    if (!parking_id) {
      return res.status(400).json({ 
        success: false, 
        error: "parking_id is required in request body" 
      });
    }

    const parkingIdInt = parseInt(parking_id, 10);
    if (isNaN(parkingIdInt)) {
      return res.status(400).json({ 
        success: false, 
        error: "parking_id must be a valid integer" 
      });
    }

    const parkingService = new ParkingService();
    
    // Fetch both detection results and layout
    const [result, layout] = await Promise.all([
      parkingService.getLatestParkingDetectionResult(parkingIdInt),
      parkingService.getParkingLayout(parkingIdInt),
    ]);

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        error: `No detection results found for parking_id: ${parkingIdInt}` 
      });
    }

    // Build response with detection results and layout (if available)
    const responseData = {
      id: result.id,
      parking_id: result.parking_id,
      occupied_slots: result.occupied_slots,
      available_slots: result.available_slots,
      created_at: result.created_at,
    };

    // Add layout if it exists
    if (layout) {
      responseData.layout = layout.layout;
      responseData.layout_updated_at = layout.updated_at;
    }

    // Update parking history for the user
    if (req.user && req.user.email) {
      const username = req.user.email;
      try {
        await pool.query(
          `INSERT INTO parking_history (username, parking_id, last_visited)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (username, parking_id)
           DO UPDATE SET last_visited = CURRENT_TIMESTAMP`,
          [username, parkingIdInt]
        );
      } catch (historyError) {
        console.error("⚠️ Failed to update parking history:", historyError);
        // Don't fail the request if history update fails
      }
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Error in getLatestDetectionResult:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};