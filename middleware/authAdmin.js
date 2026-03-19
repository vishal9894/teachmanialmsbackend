const jwt = require("jsonwebtoken");
const { pool } = require("../db/conntctDB");
const { VerifyAccessToken } = require("../services/auth");

const authAdmin = async (req, res, next) => {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const token = header.split(" ")[1];

        const decoded = await VerifyAccessToken(token)

        // verify session still valid
        const result = await pool.query(
            "SELECT * FROM admin WHERE id=$1 AND session_id=$2",
            [decoded.id, decoded.sessionId]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                success: false,
                message: "Session expired",
            });
        }

        req.admin = result.rows[0];

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};

module.exports = authAdmin;