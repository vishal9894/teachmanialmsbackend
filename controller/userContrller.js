const { pool } = require("../db/conntctDB");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { GenerateAccessToken } = require("../services/auth");


const handleSignup = async (req, res) => {
  try {
    const { name, email, password, phone_number, city } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All required fields missing" });
    }

    const normalizedEmail = email.toLowerCase();

    const userExist = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const sessionId = crypto.randomBytes(32).toString("hex");

    const result = await pool.query(
      `INSERT INTO users 
       (name, email, password, phone_number, city, login_count, session_id)
       VALUES ($1, $2, $3, $4, $5, 1, $6)
       RETURNING *`,
      [name, normalizedEmail, hashpassword, phone_number, city, sessionId]
    );

    const user = result.rows[0];

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
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const handleLogin = async (req, res) => {
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

    const updatedUserResult = await pool.query(
      `UPDATE users
       SET session_id = $1,
           login_count = login_count + 1
       WHERE id = $2
       RETURNING *`,
      [sessionId, user.id]
    );

    const updatedUser = updatedUserResult.rows[0];

    const accessToken = GenerateAccessToken(updatedUser, sessionId);

    const refreshToken = crypto.randomBytes(64).toString("hex");

    const hash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [updatedUser.id, hash]
    );

    const { password: _, ...safeUser } = updatedUser;

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


const handleRefresh = async (req, res) => {
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


const handleLogout = async (req, res) => {
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


const handleGetProfile = async (req, res) => {
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


const handleGetAllProfile = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const offset = (page - 1) * limit;

    let query = `SELECT * FROM users`;
    let countQuery = `SELECT COUNT(*) FROM users`;
    let values = [];

    if (search) {
      query += ` WHERE phone_number ILIKE $1`;
      countQuery += ` WHERE phone_number ILIKE $1`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    const countValues = search ? [`%${search}%`] : [];
    const totalResult = await pool.query(countQuery, countValues);

    const total = parseInt(totalResult.rows[0].count);

    const users = result.rows.map(({ password, ...rest }) => rest);

    res.json({
      message: "Users fetched successfully",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: users,
    });

  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const handleUpdateUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone_number, city, state } = req.body;

    const image = req.file ? req.file.filename : null;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User id is required",
      });
    }

    const userExist = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [id]
    );

    if (userExist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await pool.query(
      `UPDATE users
       SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone_number = COALESCE($3, phone_number),
         city = COALESCE($4, city),
         state = COALESCE($5, state),
         image = COALESCE($6, image),
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, email, phone_number, city, state, image, id]
    );

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser.rows[0],
    });

  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


module.exports = {
  handleSignup,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleGetProfile,
  handleGetAllProfile,
  handleUpdateUsers,
};