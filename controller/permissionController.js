const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleGetAllPermissions = catchAsync(async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM permissions 
    ORDER BY group_name, id
  `);

  const groupedPermissions = {};
  result.rows.forEach(perm => {
    if (!groupedPermissions[perm.group_name]) {
      groupedPermissions[perm.group_name] = [];
    }
    groupedPermissions[perm.group_name].push({
      id: perm.id,
      name: perm.name,
      description: perm.description
    });
  });

  sendResponse(res, {
    statusCode: 200,
    message: "Permissions fetched successfully",
    total: result.rows.length,
    data: groupedPermissions
  });
});

const handleGetAllPermissionsFlat = catchAsync(async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM permissions 
    ORDER BY group_name, id
  `);

  sendResponse(res, {
    statusCode: 200,
    message: "Permissions fetched successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleGetUserPermissions = catchAsync(async (req, res) => {
  const adminId = req.admin.id;

  const result = await pool.query(`
    SELECT p.* FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN admin a ON a.role_id = rp.role_id
    WHERE a.id = $1
    ORDER BY p.group_name, p.id
  `, [adminId]);

  const groupedPermissions = {};
  result.rows.forEach(perm => {
    if (!groupedPermissions[perm.group_name]) {
      groupedPermissions[perm.group_name] = [];
    }
    groupedPermissions[perm.group_name].push({
      id: perm.id,
      name: perm.name,
      description: perm.description
    });
  });

  sendResponse(res, {
    statusCode: 200,
    message: "User permissions fetched successfully",
    total: result.rows.length,
    data: groupedPermissions
  });
});

const handleCheckPermission = catchAsync(async (req, res) => {
  const adminId = req.admin.id;
  const { permission } = req.query;

  if (!permission) {
    throw new ApiError(400, "Permission name is required");
  }

  const result = await pool.query(`
    SELECT COUNT(*) FROM admin a
    INNER JOIN role_permissions rp ON a.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
    WHERE a.id = $1 AND p.name = $2
  `, [adminId, permission]);

  const hasPermission = parseInt(result.rows[0].count) > 0;

  sendResponse(res, {
    statusCode: 200,
    message: "Permission checked successfully",
    data: { hasPermission }
  });
});

module.exports = {
  handleGetAllPermissions,
  handleGetAllPermissionsFlat,
  handleGetUserPermissions,
  handleCheckPermission
};