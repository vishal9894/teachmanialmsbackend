const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateSetting = catchAsync(async (req, res) => {
  const { setting_key, setting_value, description } = req.body;

  if (!setting_key || setting_value === undefined || setting_value === null) {
    throw new ApiError(400, "setting_key and setting_value required");
  }

  const stringValue = typeof setting_value === 'object' 
    ? JSON.stringify(setting_value) 
    : String(setting_value);

  const result = await pool.query(
    `
    INSERT INTO general_settings
    (setting_key, setting_value, description)
    VALUES ($1, $2, $3)
    ON CONFLICT (setting_key)
    DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      updated_at = NOW()
    RETURNING *;
    `,
    [setting_key, stringValue, description || '']
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Setting saved successfully",
    data: result.rows[0],
  });
});

const handleGetAllSettings = catchAsync(async (req, res) => {
  const result = await pool.query(
    `SELECT setting_key, setting_value FROM general_settings`
  );

  const settings = {};

  result.rows.forEach((row) => {
    const key = row.setting_key;
    const value = row.setting_value;

    try {
      if (value.startsWith('{') && value.endsWith('}')) {
        settings[key] = JSON.parse(value);
      } else if (value === 'true') {
        settings[key] = true;
      } else if (value === 'false') {
        settings[key] = false;
      } else if (!isNaN(value) && value.trim() !== '') {
        settings[key] = Number(value);
      } else {
        settings[key] = value;
      }
    } catch (e) {
      settings[key] = value;
    }
  });

  sendResponse(res, {
    statusCode: 200,
    message: "Settings fetched successfully",
    data: settings,
  });
});

const handleDeleteSetting = catchAsync(async (req, res) => {
  const { id } = req.params;

  const checkExists = await pool.query(
    `SELECT setting_key FROM general_settings WHERE setting_key = $1`,
    [id]
  );

  if (checkExists.rows.length === 0) {
    throw new ApiError(404, "Setting not found");
  }

  await pool.query(
    `DELETE FROM general_settings WHERE setting_key = $1`,
    [id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Setting deleted successfully",
  });
});

const handleCreateRouteSetting = catchAsync(async (req, res) => {
  const { status, account_id, percentage } = req.body;

  if (percentage === undefined || percentage === null) {
    throw new ApiError(400, "percentage is required");
  }

  if (percentage < 0 || percentage > 100) {
    throw new ApiError(400, "percentage must be between 0 and 100");
  }

  const result = await pool.query(
    `
    INSERT INTO route_settings
    (status, account_id, percentage)
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [status !== undefined ? status : true, account_id || null, percentage]
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Route setting created successfully",
    data: result.rows[0],
  });
});

const handleGetRoutingAccount = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM route_settings ORDER BY created_at DESC"
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Routing accounts fetched successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleDeleteRoutingAccount = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "ID is required");
  }

  const isMatch = await pool.query(
    `SELECT id FROM route_settings WHERE id = $1`,
    [id]
  );

  if (isMatch.rows.length === 0) {
    throw new ApiError(404, "Routing account not found");
  }

  await pool.query(
    `DELETE FROM route_settings WHERE id = $1`,
    [id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Routing account deleted successfully",
  });
});

module.exports = { 
  handleCreateSetting, 
  handleGetAllSettings, 
  handleDeleteSetting, 
  handleCreateRouteSetting, 
  handleGetRoutingAccount, 
  handleDeleteRoutingAccount 
};