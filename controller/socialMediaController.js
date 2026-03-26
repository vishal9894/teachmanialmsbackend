const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateSocialmedia = catchAsync(async (req, res) => {
  const { name, url } = req.body;

  if (!name || !url) {
    throw new ApiError(400, "Name and URL are required");
  }

  let image = null;

  if (req.file) {
    image = req.file.location || req.file.path;
  }

  if (req.files?.image?.[0]) {
    image = req.files.image[0].location || req.files.image[0].path;
  }

  const result = await pool.query(
    `INSERT INTO social_media (name, url, image)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [name, url, image]
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Social media created successfully",
    data: result.rows[0],
  });
});

const handleGetSocialmedia = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM social_media ORDER BY created_at DESC"
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Fetch social media successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleUpdateSocialmedia = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, url } = req.body;

  const image = req.files?.image?.[0]?.location || null;

  const check = await pool.query(
    `SELECT * FROM social_media WHERE id = $1`,
    [id]
  );

  if (check.rows.length === 0) {
    throw new ApiError(404, "Social media not found");
  }

  const result = await pool.query(
    `UPDATE social_media
     SET name = COALESCE($1, name),
         url = COALESCE($2, url),
         image = COALESCE($3, image),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [name, url, image, id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Social media updated successfully",
    data: result.rows[0]
  });
});

const handleDeleteSocialmedia = catchAsync(async (req, res) => {
  const { id } = req.params;

  const check = await pool.query(
    `SELECT * FROM social_media WHERE id = $1`,
    [id]
  );

  if (check.rows.length === 0) {
    throw new ApiError(404, "Social media not found");
  }

  await pool.query(
    `DELETE FROM social_media WHERE id = $1`,
    [id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Social media deleted successfully"
  });
});

module.exports = {
  handleCreateSocialmedia,
  handleUpdateSocialmedia,
  handleDeleteSocialmedia,
  handleGetSocialmedia
};