import jwt from "jsonwebtoken";
import pool from "../db.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    // Check if token is blacklisted
    const blacklisted = await pool.query(
      "SELECT * FROM token_blacklist WHERE token = $1",
      [token]
    );

    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ message: "Token has been invalidated" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" });
    }
    return res.status(500).json({ message: "Authentication error" });
  }
};
