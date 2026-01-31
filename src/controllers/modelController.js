import path from "path";
import Jimp from "jimp";
import * as ort from "onnxruntime-node";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ParkingService } from "../services/parkingService.js";

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

class ParkingBoxes {
  constructor(parkingBoxes) {
    this.parkingBoxes = parkingBoxes;
  }

  getParkingBoxes() {
    return this.parkingBoxes;
  }
}

class ParkingBox {
  constructor(label, x1, y1, x2, y2) {
    this.label = label;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  getLabel() {
    return this.label;
  }
  getX1() {
    return this.x1;
  }
  getY1() {
    return this.y1;
  }
  getX2() {
    return this.x2;
  }
  getY2() {
    return this.y2;
  }
}

class Detection {
  constructor(x1, y1, x2, y2, confidence, label) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.confidence = confidence;
    this.label = label;
  }

  getX1() {
    return this.x1;
  }
  getY1() {
    return this.y1;
  }
  getX2() {
    return this.x2;
  }
  getY2() {
    return this.y2;
  }
  getConfidence() {
    return this.confidence;
  }
}

function doesIntersect(parkingBox, detection) {
  const x_left = Math.max(parkingBox.getX1(), detection.getX1());
  const x_right = Math.min(parkingBox.getX2(), detection.getX2());
  const y_top = Math.max(parkingBox.getY1(), detection.getY1());
  const y_bottom = Math.min(parkingBox.getY2(), detection.getY2());

  if (x_right < x_left || y_bottom < y_top) return false;

  const intersectionArea = (x_right - x_left) * (y_bottom - y_top);
  const parkingArea =
    (parkingBox.getX2() - parkingBox.getX1()) *
    (parkingBox.getY2() - parkingBox.getY1());
  const detectionArea =
    (detection.getX2() - detection.getX1()) *
    (detection.getY2() - detection.getY1());

  const percentageOfParking = (intersectionArea / parkingArea) * 100;
  const percentageOfDetection = (intersectionArea / detectionArea) * 100;

  // More sensitive thresholds
  if (percentageOfParking > 30) return true; // Lowered from 50%
  if (percentageOfDetection > 50) return true; // New check

  // Check if detection center is in parking slot
  const xCenter = (detection.getX2() + detection.getX1()) / 2;
  const yCenter = (detection.getY2() + detection.getY1()) / 2;

  if (
    xCenter > parkingBox.getX1() &&
    xCenter < parkingBox.getX2() &&
    yCenter > parkingBox.getY1() &&
    yCenter < parkingBox.getY2()
  ) {
    return true;
  }

  // Check if any corner of detection is in parking slot
  const corners = [
    [detection.getX1(), detection.getY1()],
    [detection.getX2(), detection.getY1()],
    [detection.getX1(), detection.getY2()],
    [detection.getX2(), detection.getY2()],
  ];

  for (const [x, y] of corners) {
    if (
      x > parkingBox.getX1() &&
      x < parkingBox.getX2() &&
      y > parkingBox.getY1() &&
      y < parkingBox.getY2()
    ) {
      return true;
    }
  }

  return false;
}

async function loadParkingBoxesFromDB(parkingLotId = 1) {
  try {
    const parkingService = new ParkingService();
    const slots = await parkingService.getParkingSlots(parkingLotId);

    if (!slots || slots.length === 0) {
      throw new Error(`No parking slots found for parking lot ${parkingLotId}`);
    }

    const parkingBoxes = slots.map(
      (slot) => new ParkingBox(slot.label, slot.x1, slot.y1, slot.x2, slot.y2)
    );

    return new ParkingBoxes(parkingBoxes);
  } catch (error) {
    console.error("Error loading parking boxes from database:", error);
    throw error;
  }
}

export const processFile = async (req, res) => {
  try {
    if (!session) return res.status(500).json({ error: "Model not loaded yet" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Load parking slots from database (ORIGINAL image coordinate system)
    const parkingLotId = parseInt(req.query.parkingLotId) || 1;
    const parkingBoxes = await loadParkingBoxesFromDB(parkingLotId);

    // Read original image (NO direct resize here)
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

    const resized = orig.clone().resize(newW, newH);          // keeps aspect ratio
    const letter = new Jimp(TARGET, TARGET, 0x000000FF);      // black background
    letter.composite(resized, padX, padY);                    // center the image

    // === Build CHW float32 tensor [1,3,640,640] ===
    const W = TARGET, H = TARGET;
    const chw = new Float32Array(3 * W * H);
    letter.scan(0, 0, W, H, (x, y, idx) => {
      const r = letter.bitmap.data[idx + 0] / 255;
      const g = letter.bitmap.data[idx + 1] / 255;
      const b = letter.bitmap.data[idx + 2] / 255;
      const i = y * W + x;
      chw[i] = r;                 // R plane
      chw[W * H + i] = g;         // G plane
      chw[2 * W * H + i] = b;     // B plane
    });

    const inputName =
      (session.inputNames && session.inputNames[0]) ||
      (session.inputMetadata && Object.keys(session.inputMetadata)[0]) ||
      "images";

    const tensor = new ort.Tensor("float32", chw, [1, 3, H, W]);

    // === Run ONNX model (expects NMS-enabled output: (1, 300, 6) xyxy+conf+cls in 640 space) ===
    const output = await session.run({ [inputName]: tensor });
    const outName = Object.keys(output)[0];
    // out tensor is usually { data: Float32Array, dims: [1,300,6], type:'float32' }
    const data = output[outName].data || output[outName]; // flattened length = 300 * 6

    // === Parse detections: xyxy pixels in MODEL space (640) -> map back to ORIGINAL space ===
    const detections = [];
    for (let i = 0; i + 5 < data.length; i += 6) {
      const x1m = data[i + 0];
      const y1m = data[i + 1];
      const x2m = data[i + 2];
      const y2m = data[i + 3];
      const conf = data[i + 4];
      const classId = data[i + 5];

      // Match Ultralytics default conf ~0.25; keep your class filter if cars are class 0
      if (conf < 0.25) continue;
      if (classId !== 0) continue; // remove this line if your model/class mapping differs

      // Invert letterbox: model(640) -> ORIGINAL pixels
      let x1 = (x1m - padX) / scale;
      let y1 = (y1m - padY) / scale;
      let x2 = (x2m - padX) / scale;
      let y2 = (y2m - padY) / scale;

      // Clamp to image bounds
      x1 = Math.max(0, Math.min(origW, x1));
      x2 = Math.max(0, Math.min(origW, x2));
      y1 = Math.max(0, Math.min(origH, y1));
      y2 = Math.max(0, Math.min(origH, y2));

      // (Optional) size sanity check in ORIGINAL space
      const bw = (x2 - x1) / origW;
      const bh = (y2 - y1) / origH;
      if (bw < 0.02 || bh < 0.02 || bw > 0.9 || bh > 0.9) continue;

      detections.push(new Detection(x1, y1, x2, y2, conf, "car"));
    }

    // Sort detections by confidence (highest first)
    detections.sort((a, b) => b.getConfidence() - a.getConfidence());

    // Check each parking slot (ORIGINAL coords) vs detections (also ORIGINAL coords)
    const occupied = [];
    for (const box of parkingBoxes.getParkingBoxes()) {
      let isOccupied = false;
      for (const det of detections) {
        if (doesIntersect(box, det)) { isOccupied = true; break; }
      }
      if (isOccupied) occupied.push(box.getLabel());
    }

    // Build response
    const allSlots = parkingBoxes.getParkingBoxes().map(b => b.getLabel());
    const available = allSlots.filter(s => !occupied.includes(s));

    res.json({
      success: true,
      occupied: occupied.sort((a, b) => parseInt(a) - parseInt(b)),
      available: available.sort((a, b) => parseInt(a) - parseInt(b)),
      total: allSlots.length,
      debug: {
        modelInput: [1, 3, TARGET, TARGET],
        scale, padX, padY, origW, origH,
        detectionsFound: detections.length,
        occupiedCount: occupied.length,
        availableCount: available.length
      }
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
};
