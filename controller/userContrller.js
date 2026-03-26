const { pool } = require("../db/conntctDB");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { GenerateAccessToken } = require("../services/auth");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleSignup = catchAsync(async (req, res) => {
  const { name, email, password, phone_number, city } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }

  const normalizedEmail = email.toLowerCase();

  const userExist = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (userExist.rows.length > 0) {
    throw new ApiError(400, "User already exists");
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

  sendResponse(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: {
      user: safeUser,
      accessToken,
      refreshToken,
    }
  });
});

const handleLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    throw new ApiError(400, "User not found");
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(400, "Invalid credentials");
  }

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

  sendResponse(res, {
    statusCode: 200,
    message: "Login successful",
    data: {
      user: safeUser,
      accessToken,
      refreshToken,
    }
  });
});

const handleRefresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token required");
  }

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

  if (tokenResult.rows.length === 0) {
    throw new ApiError(403, "Invalid refresh token");
  }

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

  sendResponse(res, {
    statusCode: 200,
    message: "Token refreshed successfully",
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  });
});

const handleLogout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token required");
  }

  const hash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await pool.query(
    "UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1",
    [hash]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Logged out successfully"
  });
});

const handleGetProfile = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "User not found");
  }

  const { password, ...safeUser } = result.rows[0];

  sendResponse(res, {
    statusCode: 200,
    message: "Profile fetched successfully",
    data: safeUser
  });
});

const handleGetAllProfile = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  const offset = (page - 1) * limit;

  let query = `SELECT * FROM users`;
  let countQuery = `SELECT COUNT(*) FROM users`;
  let values = [];

  if (search) {
    query += ` WHERE phone_number ILIKE $1 OR name ILIKE $1 OR email ILIKE $1`;
    countQuery += ` WHERE phone_number ILIKE $1 OR name ILIKE $1 OR email ILIKE $1`;
    values.push(`%${search}%`);
  }

  query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);

  const countValues = search ? [`%${search}%`] : [];
  const totalResult = await pool.query(countQuery, countValues);

  const total = parseInt(totalResult.rows[0].count);

  const users = result.rows.map(({ password, ...rest }) => rest);

  sendResponse(res, {
    statusCode: 200,
    message: "Users fetched successfully",
    data: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    }
  });
});

const handleUpdateUsers = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone_number, city, state } = req.body;

  const image = req.file ? req.file.location || req.file.path : null;

  if (!id) {
    throw new ApiError(400, "User id is required");
  }

  const userExist = await pool.query(
    `SELECT id FROM users WHERE id = $1`,
    [id]
  );

  if (userExist.rows.length === 0) {
    throw new ApiError(404, "User not found");
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

  const { password, ...safeUser } = updatedUser.rows[0];

  sendResponse(res, {
    statusCode: 200,
    message: "User updated successfully",
    data: safeUser
  });
});

module.exports = {
  handleSignup,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleGetProfile,
  handleGetAllProfile,
  handleUpdateUsers,
};