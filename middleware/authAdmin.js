const { pool } = require("../db/conntctDB");
const { VerifyAccessToken } = require("../services/auth");

const authAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
    }

    const token = header.split(" ")[1];

    const decoded = VerifyAccessToken(token); 

    if (!decoded || !decoded.id || !decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    const result = await pool.query(
      "SELECT * FROM admin WHERE id = $1 AND session_id = $2",
      [decoded.id, decoded.sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Session expired or admin not found",
      });
    }

    req.admin = result.rows[0];

    next();
  } catch (error) {
    console.error("Auth Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authAdmin;