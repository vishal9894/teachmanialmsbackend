const { pool } = require("../db/conntctDB");

const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

const handleGetAllRoles = async (req, res) => {
    try {
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

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("Error getting roles:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get roles: " + error.message
        });
    }
};

const handleGetRoleById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(id);


        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID format"
            });
        }

        const roleResult = await pool.query(`
            SELECT r.*, creator.name as created_by_name
            FROM roles r
            LEFT JOIN admin creator ON creator.id = r.created_by
            WHERE r.id = $1
        `, [id]);

        if (roleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
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

        res.status(200).json({
            success: true,
            data: {
                role: roleResult.rows[0],
                permissions: groupedPermissions,
                permissionIds: permissionsResult.rows.map(p => p.id),
                users: usersResult.rows
            }
        });
    } catch (error) {
        console.error("Error getting role:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get role: " + error.message
        });
    }
};

const handleCreateRole = async (req, res) => {
    const client = await pool.connect();

    try {
        const { name, description, permissions } = req.body;
        const adminId = req.admin.id;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Role name is required",
            });
        }

        await client.query("BEGIN");

        const existingCheck = await client.query(
            `SELECT id FROM roles WHERE LOWER(name) = LOWER($1)`,
            [name.trim()]
        );

        if (existingCheck.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "Role name already exists",
            });
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

        return res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: newRole,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Create Role Error:", error);

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Role already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create role: " + error.message,
        });
    } finally {
        client.release();
    }
};

const handleUpdateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID format"
            });
        }

        const roleCheck = await pool.query(
            "SELECT * FROM roles WHERE id = $1",
            [id]
        );

        if (roleCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        if (name && name.trim() !== "" && name !== roleCheck.rows[0].name) {
            const nameCheck = await pool.query(
                "SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND id != $2",
                [name.trim(), id]
            );

            if (nameCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Role name already exists"
                });
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

        res.status(200).json({
            success: true,
            message: "Role updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating role:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update role: " + error.message
        });
    }
};

const handleDeleteRole = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID format"
            });
        }

        await client.query('BEGIN');

        const roleCheck = await client.query(
            "SELECT * FROM roles WHERE id = $1",
            [id]
        );

        if (roleCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        if (roleCheck.rows[0].is_default) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Cannot delete default system role"
            });
        }

        const adminCheck = await client.query(
            "SELECT COUNT(*) FROM admin WHERE role_id = $1",
            [id]
        );

        if (parseInt(adminCheck.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: "Cannot delete role because it is assigned to users"
            });
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

        res.status(200).json({
            success: true,
            message: "Role deleted successfully"
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error deleting role:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete role: " + error.message
        });
    } finally {
        client.release();
    }
};


const handleUpdateRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID format"
            });
        }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: "Permissions must be an array"
            });
        }

        const roleCheck = await pool.query(
            "SELECT * FROM roles WHERE id = $1",
            [id]
        );

        if (roleCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

       
        console.log("Received permissions:", permissions);

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

        res.status(200).json({
            success: true,
            message: "Role permissions updated successfully",
            data: {
                permissionIds: updatedPermissions.rows.map(p => p.id),
                permissions: updatedPermissions.rows
            }
        });
    } catch (error) {
        console.error("Error updating role permissions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update role permissions: " + error.message
        });
    }
};

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


const handleAssignRoleToAdmin = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { role_id } = req.body;

        if (!isValidUUID(adminId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID format"
            });
        }

        const adminCheck = await pool.query(
            "SELECT * FROM admin WHERE id = $1",
            [adminId]
        );

        if (adminCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        if (role_id) {
            if (!isValidUUID(role_id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role ID format"
                });
            }

            const roleCheck = await pool.query(
                "SELECT * FROM roles WHERE id = $1",
                [role_id]
            );

            if (roleCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Role not found"
                });
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

            res.status(200).json({
                success: true,
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

            res.status(200).json({
                success: true,
                message: "Role removed successfully"
            });
        }
    } catch (error) {
        console.error("Error assigning role:", error);
        res.status(500).json({
            success: false,
            message: "Failed to assign role: " + error.message
        });
    }
};


const handleGetAllPermissions = async (req, res) => {
    try {
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

        res.status(200).json({
            success: true,
            data: groupedPermissions
        });
    } catch (error) {
        console.error("Error getting permissions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get permissions: " + error.message
        });
    }
};

const handleGetAllPermissionsFlat = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM permissions 
            ORDER BY group_name, id
        `);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("Error getting permissions flat:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get permissions: " + error.message
        });
    }
};

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