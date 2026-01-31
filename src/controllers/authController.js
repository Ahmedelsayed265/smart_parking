import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// =================== REGISTER ===================
export const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, phone, password, is_verified)
       VALUES ($1,$2,$3,$4,false) 
       RETURNING id, name, email, phone`,
      [name, email, phone, hashedPassword]
    );

    const code = crypto.randomInt(100000, 999999).toString();

    await pool.query(
      "INSERT INTO email_verifications (user_id, code) VALUES ($1, $2)",
      [newUser.rows[0].id, code]
    );

    res.status(201).json({
      message: "User registered. Please verify email.",
      verify_code: code,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =================== VERIFY REGISTER ===================
export const verifyRegister = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (user.rows.length === 0)
      return res.status(400).json({ message: "User not found" });

    const check = await pool.query(
      "SELECT * FROM email_verifications WHERE user_id=$1 AND code=$2",
      [user.rows[0].id, code]
    );

    if (check.rows.length === 0)
      return res.status(400).json({ message: "Invalid code" });

    await pool.query("UPDATE users SET is_verified=true WHERE id=$1", [
      user.rows[0].id,
    ]);

    await pool.query("DELETE FROM email_verifications WHERE user_id=$1", [
      user.rows[0].id,
    ]);

    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Email verified successfully",
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
        phone: user.rows[0].phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =================== LOGIN ===================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = userRes.rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =================== LOGOUT ===================
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ message: "No token provided" });

    await pool.query("INSERT INTO token_blacklist (token) VALUES ($1)", [
      token,
    ]);

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =================== UPDATE PASSWORD ===================
export const requestPasswordUpdate = async (req, res) => {
  try {
    const { email } = req.body;

    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (userRes.rows.length === 0)
      return res.status(400).json({ message: "User not found" });

    const code = crypto.randomInt(100000, 999999).toString();

    // Upsert code for this email
    await pool.query(
      `INSERT INTO password_resets (email, code, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (email)
       DO UPDATE SET code=$2, created_at=CURRENT_TIMESTAMP`,
      [email, code]
    );

    // Normally send code via email here

    res.json({
      message: "Password update code generated and sent",
      code, // for testing only, in prod remove this line
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =================== CONFIRM UPDATE PASSWORD ===================
export const verifyPasswordCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const check = await pool.query(
      "SELECT * FROM password_resets WHERE email=$1 AND code=$2",
      [email, code]
    );

    if (check.rows.length === 0)
      return res.status(400).json({ message: "Invalid or expired code" });

    res.json({ message: "Code verified, proceed to update password" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =================== RESET PASSWORD ===================
export const updatePasswordFinal = async (req, res) => {
  try {
    const { email, code, new_password, confirm_new_password } = req.body;

    if (!new_password || !confirm_new_password)
      return res.status(400).json({ message: "Provide new password" });

    if (new_password !== confirm_new_password)
      return res.status(400).json({ message: "Passwords do not match" });

    // Verify code again before updating
    const check = await pool.query(
      "SELECT * FROM password_resets WHERE email=$1 AND code=$2",
      [email, code]
    );

    if (check.rows.length === 0)
      return res.status(400).json({ message: "Invalid or expired code" });

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query("UPDATE users SET password=$1 WHERE email=$2", [
      hashedPassword,
      email,
    ]);

    // Delete used reset record
    await pool.query("DELETE FROM password_resets WHERE email=$1", [email]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
