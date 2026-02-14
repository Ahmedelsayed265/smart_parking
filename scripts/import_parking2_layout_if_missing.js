import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { ParkingService } from "../src/services/parkingService.js";

dotenv.config();

// Default to `parking2_layout.json` located in the project root, but allow
// an override via the first CLI argument.
const defaultPath = process.argv[2] || path.join(process.cwd(), "parking2_layout.json");
const filePath = path.resolve(defaultPath);

(async () => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      process.exit(2);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const payload = JSON.parse(raw);

    const parkingIdRaw = payload.parkingId ?? payload.parking_id ?? payload.parkingId;
    const parkingId = parseInt(parkingIdRaw, 10);
    if (isNaN(parkingId)) {
      console.error("Invalid or missing parkingId in JSON file");
      process.exit(3);
    }

    const svc = new ParkingService();

    const existing = await svc.getParkingLayout(parkingId);
    if (existing) {
      console.log(`Layout already exists for parking_id=${parkingId}, skipping insert.`);
      process.exit(0);
    }

    // Save the entire JSON payload into the layout column so the original structure
    // is preserved (matches existing usage in the project).
    const saved = await svc.saveParkingLayout(parkingId, payload);
    console.log("Inserted layout:", saved);
    process.exit(0);
  } catch (err) {
    console.error("Failed to import layout:", err.message || err);
    process.exit(1);
  }
})();
