import pool from "../db.js";

// =================== ADD FAVOURITE PARKING ===================
export const addFavourite = async (req, res) => {
  try {
    // Get username from token (email is used as username)
    const username = req.user.email;
    const { parking_id } = req.body;

    if (!parking_id) {
      return res.status(400).json({ 
        success: false, 
        message: "parking_id is required in request body" 
      });
    }

    const parkingIdInt = parseInt(parking_id, 10);
    if (isNaN(parkingIdInt)) {
      return res.status(400).json({ 
        success: false, 
        message: "parking_id must be a valid integer" 
      });
    }

    // Insert favourite parking (created_at will be set to CURRENT_TIMESTAMP by default)
    const result = await pool.query(
      `INSERT INTO favourite_parkings (username, parking_id, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (username, parking_id) 
       DO UPDATE SET created_at = CURRENT_TIMESTAMP
       RETURNING id, username, parking_id, created_at`,
      [username, parkingIdInt]
    );

    res.status(201).json({
      success: true,
      message: "Parking added to favourites successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error in addFavourite:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
};

// =================== GET FAVOURITE PARKINGS ===================
export const getFavourites = async (req, res) => {
  try {
    // Get username from token (email is used as username)
    const username = req.user.email;

    // Get all favourite parkings for this user
    const result = await pool.query(
      `SELECT id, username, parking_id, created_at
       FROM favourite_parkings
       WHERE username = $1
       ORDER BY created_at DESC`,
      [username]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Error in getFavourites:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
};

// =================== GET PARKING HISTORY ===================
export const getParkingHistory = async (req, res) => {
  try {
    // Get username from token (email is used as username)
    const username = req.user.email;

    // Get all parking history for this user
    const result = await pool.query(
      `SELECT id, username, parking_id, last_visited
       FROM parking_history
       WHERE username = $1
       ORDER BY last_visited DESC`,
      [username]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Error in getParkingHistory:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
};
