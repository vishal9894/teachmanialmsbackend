const { pool } = require("../db/conntctDB");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { GenerateAccessToken } = require("../services/auth");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateAdmin = catchAsync(async (req, res) => {
    const { name, email, phone_number, role, password } = req.body;

    if (!name || !email || !password) {
        throw new ApiError(400, "Name, email and password are required");
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await pool.query(
        "SELECT id FROM admin WHERE email=$1",
        [normalizedEmail]
    );

    if (existing.rows.length) {
        throw new ApiError(400, "Email already exists");
    }

    const hashpassword = await bcrypt.hash(password, 10);
    const sessionId = crypto.randomBytes(32).toString("hex");

    const result = await pool.query(
        `INSERT INTO admin
      (name,email,phone_number,role,password,session_id,login_count)
      VALUES ($1,$2,$3,$4,$5,$6,1)
      RETURNING id,name,email,phone_number,role,status,created_at`,
        [
            name,
            normalizedEmail,
            phone_number,
            role || "admin",
            hashpassword,
            sessionId,
        ]
    );

    sendResponse(res, {
        statusCode: 201,
        message: "Admin created successfully",
        data: result.rows[0]
    });
});

const handleLoginAdmin = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password required");
    }

    const result = await pool.query(
        "SELECT * FROM admin WHERE email=$1",
        [email.toLowerCase()]
    );

    if (!result.rows.length) {
        throw new ApiError(401, "Invalid credentials");
    }

    const admin = result.rows[0];

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        throw new ApiError(401, "Invalid credentials");
    }

    const sessionId = crypto.randomBytes(32).toString("hex");

    await pool.query(
        `UPDATE admin
       SET session_id=$1,
           login_count = COALESCE(login_count,0)+1
       WHERE id=$2`,
        [sessionId, admin.id]
    );

    const accessToken = GenerateAccessToken(admin, sessionId);


    const { password: _, ...safeAdmin } = admin;

    sendResponse(res, {
        statusCode: 200,
        message: "Login successful",
     admin: safeAdmin,
         accessToken
        
    });
});

const handleGetAdmin = catchAsync(async (req, res) => {
    const adminId = req.admin.id;
    
    const result = await pool.query(`
        SELECT *
        FROM admin
        WHERE id=$1`, 
        [adminId]
    );
    
    if (!result.rows.length) {
        throw new ApiError(404, "Admin not found");
    }
    
    const { password, refresh_tokens, role_id, ...data } = result.rows[0];
    
    sendResponse(res, {
        statusCode: 200,
        message: "Admin fetched successfully",
        data: data
    });
});

const handleGetAllAdmin = catchAsync(async (req, res) => {
    const result = await pool.query(
        "SELECT * FROM admin ORDER BY created_at DESC"
    );

    const data = result.rows.map(({ password, refresh_tokens, ...rest }) => rest);
    
    sendResponse(res, {
        statusCode: 200,
        message: "Fetch all admin successfully",
        total: data.length,
        data
    });
});

const handleUpdateAdmin = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, phone_number, role, password, status } = req.body;

    const existing = await pool.query(
        "SELECT * FROM admin WHERE id=$1",
        [id]
    );

    if (!existing.rows.length) {
        throw new ApiError(404, "Admin not found");
    }

    const admin = existing.rows[0];

    let image = admin.image;
    if (req.file) {
        image = req.file.location || req.file.path;
    }

    let hashedPassword = admin.password;
    if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
    }

    let updatedStatus = admin.status;
    if (status !== undefined) {
        updatedStatus = status === true || status === "true" || status === 1 || status === "1";
    }

    const updated = await pool.query(
        `UPDATE admin SET
            name=$1,
            phone_number=$2,
            role=$3,
            password=$4,
            image=$5,
            status=$6,
            updated_at=NOW()
        WHERE id=$7
        RETURNING id,name,email,phone_number,role,image,status,created_at`,
        [
            name || admin.name,
            phone_number || admin.phone_number,
            role || admin.role,
            hashedPassword,
            image,
            updatedStatus,
            id,
        ]
    );

    sendResponse(res, {
        statusCode: 200,
        message: "Admin updated successfully",
        data: updated.rows[0]
    });
});

const handleDeleteAdmin = catchAsync(async (req, res) => {
    const { id } = req.params;

    const isMatch = await pool.query(
        "SELECT * FROM admin WHERE id = $1",
        [id]
    );

    if (!isMatch.rows.length) {
        throw new ApiError(404, "Profile does not exist");
    }

    await pool.query(
        "DELETE FROM admin WHERE id = $1",
        [id]
    );

    sendResponse(res, {
        statusCode: 200,
        message: "Profile deleted successfully"
    });
});

const handleGetAllAdminWithRoles = catchAsync(async (req, res) => {
    const result = await pool.query(`
        SELECT a.*, r.name as role_name, r.description as role_description,
               COUNT(DISTINCT rp.permission_id) as role_permission_count
        FROM admin a
        LEFT JOIN roles r ON a.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        GROUP BY a.id, r.id, r.name, r.description
        ORDER BY a.created_at DESC
    `);

    const data = result.rows.map(({ password, refresh_tokens, ...rest }) => rest);
    
    sendResponse(res, {
        statusCode: 200,
        message: "Fetch all admin with roles successfully",
        total: data.length,
        data
    });
});

module.exports = {
    handleCreateAdmin,
    handleLoginAdmin,
    handleGetAdmin,
    handleGetAllAdmin,
    handleUpdateAdmin,
    handleDeleteAdmin,
    handleGetAllAdminWithRoles
};