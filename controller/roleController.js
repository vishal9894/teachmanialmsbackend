const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const handleGetAllRoles = catchAsync(async (req, res) => {
  const result = await pool.query(`
    SELECT r.*, 
           COUNT(DISTINCT rp.permission_id) as permission_count,
           COUNT(DISTINCT a.id) as user_count,
           creator.name as created_by_name
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN admin a ON a.role_id = r.id
    LEFT JOIN admin creator ON creator.id = r.created_by
    GROUP BY r.id, creator.name
    ORDER BY r.is_default DESC, r.created_at DESC
  `);

  sendResponse(res, {
    statusCode: 200,
    message: "Roles fetched successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleGetRoleById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    throw new ApiError(400, "Invalid role ID format");
  }

  const roleResult = await pool.query(`
    SELECT r.*, creator.name as created_by_name
    FROM roles r
    LEFT JOIN admin creator ON creator.id = r.created_by
    WHERE r.id = $1
  `, [id]);

  if (roleResult.rows.length === 0) {
    throw new ApiError(404, "Role not found");
  }

  const permissionsResult = await pool.query(`
    SELECT p.* FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = $1
    ORDER BY p.group_name, p.id
  `, [id]);

  const usersResult = await pool.query(`
    SELECT id, name, email, status, created_at
    FROM admin
    WHERE role_id = $1
    ORDER BY created_at DESC
  `, [id]);

  const groupedPermissions = {};
  permissionsResult.rows.forEach(perm => {
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
    message: "Role fetched successfully",
    data: {
      role: roleResult.rows[0],
      permissions: groupedPermissions,
      permissionIds: permissionsResult.rows.map(p => p.id),
      users: usersResult.rows
    }
  });
});

const handleCreateRole = catchAsync(async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, description, permissions } = req.body;
    const adminId = req.admin.id;

    if (!name || name.trim() === "") {
      throw new ApiError(400, "Role name is required");
    }

    await client.query("BEGIN");

    const existingCheck = await client.query(
      `SELECT id FROM roles WHERE LOWER(name) = LOWER($1)`,
      [name.trim()]
    );

    if (existingCheck.rows.length > 0) {
      throw new ApiError(400, "Role name already exists");
    }

    const roleResult = await client.query(
      `INSERT INTO roles
        (name, description, created_by, is_default)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, name, description, created_at`,
      [name.trim(), description || null, adminId]
    );

    const newRole = roleResult.rows[0];

    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const validPermissionIds = [...new Set(permissions.filter(isValidUUID))];

      if (validPermissionIds.length > 0) {
        const values = validPermissionIds.map(permId => `('${newRole.id}', '${permId}')`).join(',');
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
          ON CONFLICT DO NOTHING
        `);
      }
    }

    await client.query("COMMIT");

    sendResponse(res, {
      statusCode: 201,
      message: "Role created successfully",
      data: newRole
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const handleUpdateRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!isValidUUID(id)) {
    throw new ApiError(400, "Invalid role ID format");
  }

  const roleCheck = await pool.query(
    "SELECT * FROM roles WHERE id = $1",
    [id]
  );

  if (roleCheck.rows.length === 0) {
    throw new ApiError(404, "Role not found");
  }

  if (name && name.trim() !== "" && name !== roleCheck.rows[0].name) {
    const nameCheck = await pool.query(
      "SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND id != $2",
      [name.trim(), id]
    );

    if (nameCheck.rows.length > 0) {
      throw new ApiError(400, "Role name already exists");
    }
  }

  const result = await pool.query(
    `UPDATE roles 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 
     RETURNING *`,
    [name ? name.trim() : null, description || null, id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Role updated successfully",
    data: result.rows[0]
  });
});

const handleDeleteRole = catchAsync(async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new ApiError(400, "Invalid role ID format");
    }

    await client.query('BEGIN');

    const roleCheck = await client.query(
      "SELECT * FROM roles WHERE id = $1",
      [id]
    );

    if (roleCheck.rows.length === 0) {
      throw new ApiError(404, "Role not found");
    }

    if (roleCheck.rows[0].is_default) {
      throw new ApiError(400, "Cannot delete default system role");
    }

    const adminCheck = await client.query(
      "SELECT COUNT(*) FROM admin WHERE role_id = $1",
      [id]
    );

    if (parseInt(adminCheck.rows[0].count) > 0) {
      throw new ApiError(400, "Cannot delete role because it is assigned to users");
    }

    await client.query(
      "DELETE FROM role_permissions WHERE role_id = $1",
      [id]
    );

    await client.query(
      "DELETE FROM roles WHERE id = $1",
      [id]
    );

    await client.query('COMMIT');

    sendResponse(res, {
      statusCode: 200,
      message: "Role deleted successfully"
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

const handleUpdateRolePermissions = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!isValidUUID(id)) {
    throw new ApiError(400, "Invalid role ID format");
  }

  if (!Array.isArray(permissions)) {
    throw new ApiError(400, "Permissions must be an array");
  }

  const roleCheck = await pool.query(
    "SELECT * FROM roles WHERE id = $1",
    [id]
  );

  if (roleCheck.rows.length === 0) {
    throw new ApiError(404, "Role not found");
  }

  await pool.query(
    "DELETE FROM role_permissions WHERE role_id = $1",
    [id]
  );

  if (permissions.length > 0) {
    const firstPerm = permissions[0];
    
    if (typeof firstPerm === 'number' || /^\d+$/.test(firstPerm)) {
      const validPermissionIds = await getPermissionUuidsFromIds(permissions);
      
      if (validPermissionIds.length > 0) {
        const values = validPermissionIds.map(permId => `('${id}', '${permId}')`).join(',');
        await pool.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
          ON CONFLICT DO NOTHING
        `);
      }
    } else {
      const validPermissionIds = [...new Set(permissions.filter(isValidUUID))];
      
      if (validPermissionIds.length > 0) {
        const values = validPermissionIds.map(permId => `('${id}', '${permId}')`).join(',');
        await pool.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
          ON CONFLICT DO NOTHING
        `);
      }
    }
  }

  const updatedPermissions = await pool.query(`
    SELECT p.id, p.name, p.description, p.group_name
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = $1
    ORDER BY p.group_name, p.id
  `, [id]);

  sendResponse(res, {
    statusCode: 200,
    message: "Role permissions updated successfully",
    data: {
      permissionIds: updatedPermissions.rows.map(p => p.id),
      permissions: updatedPermissions.rows
    }
  });
});

async function getPermissionUuidsFromIds(permissionIds) {
  try {
    const numericIds = permissionIds
      .map(id => parseInt(id))
      .filter(id => !isNaN(id) && id > 0);
    
    if (numericIds.length === 0) return [];
    
    const result = await pool.query(
      `SELECT id FROM permissions WHERE id = ANY($1::int[])`,
      [numericIds]
    );
    
    return result.rows.map(row => row.id);
  } catch (error) {
    console.error("Error converting permission IDs:", error);
    return [];
  }
}

const handleAssignRoleToAdmin = catchAsync(async (req, res) => {
  const { adminId } = req.params;
  const { role_id } = req.body;

  if (!isValidUUID(adminId)) {
    throw new ApiError(400, "Invalid admin ID format");
  }

  const adminCheck = await pool.query(
    "SELECT * FROM admin WHERE id = $1",
    [adminId]
  );

  if (adminCheck.rows.length === 0) {
    throw new ApiError(404, "Admin not found");
  }

  if (role_id) {
    if (!isValidUUID(role_id)) {
      throw new ApiError(400, "Invalid role ID format");
    }

    const roleCheck = await pool.query(
      "SELECT * FROM roles WHERE id = $1",
      [role_id]
    );

    if (roleCheck.rows.length === 0) {
      throw new ApiError(400, "Role not found");
    }

    const roleName = roleCheck.rows[0].name;

    await pool.query(
      `UPDATE admin 
       SET role_id = $1, 
           role = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [role_id, roleName, adminId]
    );

    sendResponse(res, {
      statusCode: 200,
      message: "Role assigned successfully",
      data: {
        role_id,
        role_name: roleName
      }
    });
  } else {
    await pool.query(
      `UPDATE admin 
       SET role_id = NULL, 
           role = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [adminId]
    );

    sendResponse(res, {
      statusCode: 200,
      message: "Role removed successfully"
    });
  }
});

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

module.exports = {
  handleGetAllRoles,
  handleGetRoleById,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
  handleUpdateRolePermissions,
  handleAssignRoleToAdmin,
  handleGetAllPermissions,
  handleGetAllPermissionsFlat
};