import dotenv from "dotenv";
import pkg from "pg";
import fs from "fs";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetDatabase() {
  try {
    console.log("🗑️  Clearing existing data...");
    
    // Clear all existing data
    await pool.query("DELETE FROM detection_logs");
    await pool.query("DELETE FROM parking_slots");
    await pool.query("DELETE FROM parking_lots");
    
    console.log("✅ Database cleared successfully!");
    
    // Read parking data from JSON file
    console.log("📖 Reading parking data from parking3.json...");
    const parkingData = JSON.parse(fs.readFileSync("parking3.json", "utf8"));
    
    if (!parkingData.boxes || !Array.isArray(parkingData.boxes)) {
      throw new Error("Invalid parking data format");
    }
    
    console.log(`📊 Found ${parkingData.boxes.length} parking slots in JSON file`);
    
    // Create parking lot
    console.log("🏢 Creating parking lot...");
    const lotResult = await pool.query(`
      INSERT INTO parking_lots (id, name, description) 
      VALUES (1, 'Main Parking Lot', 'Parking lot with 25 slots from parking3.json')
      RETURNING *
    `);
    console.log("✅ Parking lot created:", lotResult.rows[0].name);
    
    // Insert parking slots
    console.log("🅿️  Inserting parking slots...");
    let insertedCount = 0;
    
    for (const slot of parkingData.boxes) {
      const { label, x1, y1, x2, y2 } = slot;
      
      await pool.query(`
        INSERT INTO parking_slots (parking_lot_id, label, x1, y1, x2, y2) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [1, label, x1, y1, x2, y2]);
      
      insertedCount++;
      if (insertedCount % 5 === 0) {
        console.log(`   Inserted ${insertedCount}/${parkingData.boxes.length} slots...`);
      }
    }
    
    console.log(`✅ Successfully inserted ${insertedCount} parking slots!`);
    
    // Verify the data
    const slotCount = await pool.query("SELECT COUNT(*) as count FROM parking_slots");
    const lotCount = await pool.query("SELECT COUNT(*) as count FROM parking_lots");
    
    console.log("\n📊 Database Summary:");
    console.log(`   Parking Lots: ${lotCount.rows[0].count}`);
    console.log(`   Parking Slots: ${slotCount.rows[0].count}`);
    
    // Show first few slots as verification
    const sampleSlots = await pool.query(`
      SELECT label, x1, y1, x2, y2 
      FROM parking_slots 
      ORDER BY label::integer 
      LIMIT 5
    `);
    
    console.log("\n🔍 Sample slots (first 5):");
    sampleSlots.rows.forEach(slot => {
      console.log(`   Slot ${slot.label}: (${slot.x1}, ${slot.y1}) to (${slot.x2}, ${slot.y2})`);
    });
    
    console.log("\n🎉 Database reset and populated successfully!");
    
  } catch (error) {
    console.error("❌ Error resetting database:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
