import pool from "../db.js";

export class ParkingService {
  async getParkingSlots(parkingLotId = 1) {
    try {
      const query = `
        SELECT id, label, x1, y1, x2, y2, is_active 
        FROM parking_slots 
        WHERE parking_lot_id = $1 AND is_active = true
        ORDER BY label
      `;
      const result = await pool.query(query, [parkingLotId]);
      return result.rows;
    } catch (error) {
      console.error("Error getting parking slots:", error);
      throw error;
    }
  }

  async registerParkingSlots(parkingLotId, slots) {
    try {
      const results = [];

      for (const slot of slots) {
        const { label, x1, y1, x2, y2 } = slot;

        const query = `
          INSERT INTO parking_slots (parking_lot_id, label, x1, y1, x2, y2)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (parking_lot_id, label) 
          DO UPDATE SET x1 = $3, y1 = $4, x2 = $5, y2 = $6
          RETURNING *
        `;

        const result = await pool.query(query, [
          parkingLotId,
          label,
          x1,
          y1,
          x2,
          y2,
        ]);
        results.push(result.rows[0]);
      }

      return results;
    } catch (error) {
      console.error("Error registering parking slots:", error);
      throw error;
    }
  }

  async logDetection(
    parkingLotId,
    occupiedSlots,
    totalOccupied,
    imagePath = null
  ) {
    try {
      const query = `
        INSERT INTO detection_logs (parking_lot_id, occupied_slots, total_occupied, image_path)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await pool.query(query, [
        parkingLotId,
        occupiedSlots,
        totalOccupied,
        imagePath,
      ]);
      return result.rows[0];
    } catch (error) {
      console.error("Error logging detection:", error);
      throw error;
    }
  }

  async getParkingLot(id) {
    try {
      const query = `SELECT * FROM parking_lots WHERE id = $1`;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error("Error getting parking lot:", error);
      throw error;
    }
  }

  async createParkingLot(name, description = "") {
    try {
      const query = `
        INSERT INTO parking_lots (name, description)
        VALUES ($1, $2)
        RETURNING *
      `;
      const result = await pool.query(query, [name, description]);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating parking lot:", error);
      throw error;
    }
  }

  async deleteParkingSlots(parkingLotId) {
    try {
      const query = `DELETE FROM parking_slots WHERE parking_lot_id = $1`;
      await pool.query(query, [parkingLotId]);
      return {
        success: true,
        message: `Deleted all slots for lot ${parkingLotId}`,
      };
    } catch (error) {
      console.error("Error deleting parking slots:", error);
      throw error;
    }
  }
}
