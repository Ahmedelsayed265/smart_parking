import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { ParkingService } from "../src/services/parkingService.js";

dotenv.config();

// Parse CLI args: allow an optional file path and `--force` flag.
const rawArgs = process.argv.slice(2);
const forceArg = rawArgs.includes("--force");
const providedPathArg = rawArgs.find((a) => !a.startsWith("-"));
// Default to `boxes_converted.json` in the project root.
const defaultPath = providedPathArg || path.join(process.cwd(), "boxes_converted.json");
const filePath = path.resolve(defaultPath);

(async () => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      process.exit(2);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const payload = JSON.parse(raw);

    // Accept several possible shapes: an array of slots, { slots: [...] }, or { parkingSlots: [...] }
    let slots = null;
    if (Array.isArray(payload)) {
      slots = payload;
    } else if (Array.isArray(payload.slots)) {
      slots = payload.slots;
    } else if (Array.isArray(payload.boxes)) {
      slots = payload.boxes;
    } else if (Array.isArray(payload.parkingSlots)) {
      slots = payload.parkingSlots;
    } else if (Array.isArray(payload.data)) {
      slots = payload.data;
    }

    if (!slots) {
      console.error("Unable to locate slots array in JSON file. Expected an array or { slots: [...] }.");
      process.exit(3);
    }

    // Allow forcing an update/upsert of existing slots with `--force` or
    // `FORCE_IMPORT=true` (useful when correcting previously-imported wrong data).
    const force = forceArg || process.env.FORCE_IMPORT === "true";

    // Normalize slots to required shape: { label, x1, y1, x2, y2 }
    const normalized = slots.map((s, idx) => {
      // Use the array index -> label mapping requested: index 0 => label '1', index 1 => '2', ...
      const label = String(idx + 1);

      // Prefer explicit x1/y1/x2/y2 keys. Support common alternate key names.
      const rawX1 = s.x1 ?? s.x ?? s.left ?? s.left_x ?? s["left"];
      const rawY1 = s.y1 ?? s.y ?? s.top ?? s.top_y ?? s["top"];
      let rawX2 = s.x2 ?? s.right ?? s.right_x ?? s["right"];
      let rawY2 = s.y2 ?? s.bottom ?? s.bottom_y ?? s["bottom"];

      // If width/height + x/y are provided, compute x2/y2
      if ((rawX2 === undefined || rawX2 === null) && s.x != null && s.width != null) {
        rawX2 = s.x + s.width;
      }
      if ((rawY2 === undefined || rawY2 === null) && s.y != null && s.height != null) {
        rawY2 = s.y + s.height;
      }

      const x1 = Number(rawX1) || 0;
      const y1 = Number(rawY1) || 0;
      const x2 = Number(rawX2) || 0;
      const y2 = Number(rawY2) || 0;

      return { label, x1, y1, x2, y2 };
    });

    const parkingId = 2;
    const svc = new ParkingService();

    const existing = await svc.getParkingSlots(parkingId);
    if (existing && existing.length > 0 && !force) {
      console.log(`Slots already exist for parking_lot_id=${parkingId}, skipping insert. Use --force to upsert.`);
      process.exit(0);
    }

    // `registerParkingSlots` performs an upsert on (parking_lot_id, label), so
    // using it with `force` will update existing records to the corrected values.
    const result = await svc.registerParkingSlots(parkingId, normalized);
    console.log(`Inserted/updated ${result.length} slots for parking_lot_id=${parkingId}`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to import slots:", err.message || err);
    process.exit(1);
  }
})();
