import path from "path";
import fs from "fs";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ParkingService } from "../services/parkingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper for calling Python server
function getPyServerUrl() {
  return process.env.PY_SERVER_URL || "http://127.0.0.1:8000";
}

async function postJson(urlStr, payload) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const mod = u.protocol === "https:" ? https : http;
      const data = Buffer.from(JSON.stringify(payload));
      const req = mod.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === "https:" ? 443 : 80),
          path: u.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": data.length,
          },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(new Error("Invalid JSON from Python server"));
              }
            } else {
              reject(new Error(`Python server error: ${res.statusCode} ${body}`));
            }
          });
        }
      );
      req.on("error", reject);
      req.setTimeout(10000, () => {
        req.destroy(new Error("Python server request timed out"));
      });
      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

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

async function loadParkingBoxesFromDB(parkingLotId = 1) {
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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const parkingLotId = parseInt(req.query.parkingLotId) || 1;
    const parkingBoxes = await loadParkingBoxesFromDB(parkingLotId);

    // Call Python FastAPI server (equivalent to Main.sendImageUrl in Java)
    const absolutePath = path.resolve(req.file.path);
    const pyUrl = getPyServerUrl();
    const pyResponse = await postJson(`${pyUrl}/predict/path`, {
      image_path: absolutePath,
    });

    if (!pyResponse || !Array.isArray(pyResponse.detections)) {
      throw new Error("Invalid detections response from Python server");
    }

    const detections = pyResponse.detections;
    const occupied = new Set(); // Using Set to avoid duplicates if multiple detections hit the same slot

    // Iterate exactly like Java code
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

    res.json({
      success: true,
      occupied: occupiedList,
      available,
      total: allSlots.length,
      log: logEntry,
      detections: pyResponse.detections
    });
  } catch (error) {
    console.error("❌ Error in processFile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
