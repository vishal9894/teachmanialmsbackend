const { pool } = require("../db/conntctDB");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { GenerateAccessToken } = require("../services/auth");



const HandleSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExist = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashpassword]
    );

    const user = result.rows[0];


    const sessionId = crypto.randomBytes(32).toString("hex");

    await pool.query(
      "UPDATE users SET session_id = $1 WHERE id = $2",
      [sessionId, user.id]
    );

    
    const accessToken = GenerateAccessToken(user, sessionId);

    
    const refreshToken = crypto.randomBytes(64).toString("hex");

    const hash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, hash]
    );

    const { password: _, ...safeUser } = user;

    res.status(201).json({
      message: "User registered successfully",
      user: safeUser,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



const HandleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: "User not found" });

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const sessionId = crypto.randomBytes(32).toString("hex");

    await pool.query(
      "UPDATE users SET session_id = $1 WHERE id = $2",
      [sessionId, user.id]
    );

    const accessToken = GenerateAccessToken(user, sessionId);

    const refreshToken = crypto.randomBytes(64).toString("hex");

    const hash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, hash]
    );

    const { password: _, ...safeUser } = user;

    res.status(200).json({
      message: "Login successful",
      user: safeUser,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



const HandleRefresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(401).json({ message: "Refresh token required" });

    const hash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const tokenResult = await pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 
       AND is_revoked = false 
       AND expires_at > NOW()`,
      [hash]
    );

    if (tokenResult.rows.length === 0)
      return res.status(403).json({ message: "Invalid refresh token" });

    const oldToken = tokenResult.rows[0];

    await pool.query(
      "UPDATE refresh_tokens SET is_revoked = true WHERE id = $1",
      [oldToken.id]
    );

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [oldToken.user_id]
    );

    const user = userResult.rows[0];

    const newSessionId = crypto.randomBytes(32).toString("hex");

    await pool.query(
      "UPDATE users SET session_id = $1 WHERE id = $2",
      [newSessionId, user.id]
    );

    const newAccessToken = GenerateAccessToken(user, newSessionId);

    const newRefreshToken = crypto.randomBytes(64).toString("hex");

    const newHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, newHash]
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



const HandleLogout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(400).json({ message: "Refresh token required" });

    const hash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.query(
      "UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1",
      [hash]
    );

    res.json({ message: "Logged out successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


const HandleGetProfile = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const { password, ...safeUser } = result.rows[0];

    res.json({
      success: true,
      user: safeUser,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


const HandleGetAllProfile = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");

    const users = result.rows.map(({ password, ...rest }) => rest);

    const length = users.length;

    res.json({
      message: "All users fetched successfully",
      length,
      users,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  HandleSignup,
  HandleLogin,
  HandleRefresh,
  HandleLogout,
  HandleGetProfile,
  HandleGetAllProfile,
};