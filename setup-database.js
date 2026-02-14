import dotenv from "dotenv";
import fs from "fs";
import pool from "./src/db.js";

dotenv.config();

export async function setupDatabase() {
  try {
    console.log("🔧 Setting up database...");

    const sql = fs.readFileSync("database-setup.sql", "utf8");
    await pool.query(sql);

    console.log("✅ Database setup completed successfully!");

    const result = await pool.query("SELECT COUNT(*) as slot_count FROM parking_slots");
    console.log(`🅿️  Parking slots in database: ${result.rows[0].slot_count}`);
  } catch (error) {
    console.error("❌ Database setup failed:", error && error.message ? error.message : error);
    throw error;
  }
}

if (process.env.RUN_DB_SETUP === "true") {
  setupDatabase().catch(() => {});
}
