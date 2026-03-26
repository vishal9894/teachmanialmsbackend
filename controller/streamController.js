const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateStream = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  const image = req.file ? req.file.location : null;

  if (!name) {
    throw new ApiError(400, "Stream name is required");
  }

  const existing = await pool.query(
    "SELECT * FROM streams WHERE name = $1",
    [name]
  );
  
  if (existing.rows.length > 0) {
    throw new ApiError(400, "Stream name already exists. Please choose a different name.");
  }

  const result = await pool.query(
    `INSERT INTO streams (name, description, image)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description, image]
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Stream created successfully",
    data: result.rows[0],
  });
});

const handleGetStream = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM streams ORDER BY created_at DESC"
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Streams fetched successfully",
    total: result.rows.length,
    data: result.rows,
  });
});

const handleUpdateStream = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const image = req.file ? req.file.location : null;

  const existingStream = await pool.query(
    "SELECT * FROM streams WHERE id = $1",
    [id]
  );

  if (existingStream.rows.length === 0) {
    throw new ApiError(404, "Stream not found");
  }

  if (name) {
    const duplicateCheck = await pool.query(
      "SELECT * FROM streams WHERE name = $1 AND id != $2",
      [name, id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      throw new ApiError(400, "Another stream with this name already exists.");
    }
  }

  const result = await pool.query(
    `UPDATE streams
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         image = COALESCE($3, image),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [name, description, image, id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Stream updated successfully",
    data: result.rows[0],
  });
});

const handleDeleteStream = catchAsync(async (req, res) => {
  const { id } = req.params;

  const existingStream = await pool.query(
    "SELECT * FROM streams WHERE id = $1",
    [id]
  );

  if (existingStream.rows.length === 0) {
    throw new ApiError(404, "Stream not found");
  }

  const result = await pool.query(
    `DELETE FROM streams
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Stream deleted successfully",
    data: result.rows[0],
  });
});

module.exports = {
  handleCreateStream,
  handleGetStream,
  handleUpdateStream,
  handleDeleteStream,
};