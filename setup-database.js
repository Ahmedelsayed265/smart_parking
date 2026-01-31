import dotenv from "dotenv";
import pkg from "pg";
import fs from "fs";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  try {
    console.log("🔧 Setting up database...");
    
    // Read and execute the SQL setup file
    const sql = fs.readFileSync("database-setup.sql", "utf8");
    await pool.query(sql);
    
    console.log("✅ Database setup completed successfully!");
    console.log("📊 Tables created:");
    console.log("   - users");
    console.log("   - parking_lots");
    console.log("   - parking_slots (25 slots added)");
    console.log("   - detection_logs");
    
    // Test the connection
    const result = await pool.query("SELECT COUNT(*) as slot_count FROM parking_slots");
    console.log(`🅿️  Parking slots in database: ${result.rows[0].slot_count}`);
    
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
