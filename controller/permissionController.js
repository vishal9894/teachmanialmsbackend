const { pool } = require("../db/conntctDB");


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
            message: "Failed to get permissions"
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
        console.error("Error getting permissions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get permissions"
        });
    }
};


const handleGetUserPermissions = async (req, res) => {
    try {
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

        res.status(200).json({
            success: true,
            data: groupedPermissions
        });
    } catch (error) {
        console.error("Error getting user permissions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get user permissions"
        });
    }
};

const handleCheckPermission = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { permission } = req.query;

        if (!permission) {
            return res.status(400).json({
                success: false,
                message: "Permission name is required"
            });
        }

        const result = await pool.query(`
            SELECT COUNT(*) FROM admin a
            INNER JOIN role_permissions rp ON a.role_id = rp.role_id
            INNER JOIN permissions p ON rp.permission_id = p.id
            WHERE a.id = $1 AND p.name = $2
        `, [adminId, permission]);

        const hasPermission = parseInt(result.rows[0].count) > 0;

        res.status(200).json({
            success: true,
            data: { hasPermission }
        });
    } catch (error) {
        console.error("Error checking permission:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check permission"
        });
    }
};

module.exports = {
    handleGetAllPermissions,
    handleGetAllPermissionsFlat,
    handleGetUserPermissions,
    handleCheckPermission
};