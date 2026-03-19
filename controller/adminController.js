const { pool } = require("../db/conntctDB");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { GenerateAccessToken } = require("../services/auth");


const handleCreateAdmin = async (req, res) => {
    try {
        const { name, email, phone_number, role, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        const normalizedEmail = email.toLowerCase();


        const existing = await pool.query(
            "SELECT id FROM admin WHERE email=$1",
            [normalizedEmail]
        );

        if (existing.rows.length) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
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
        return res.status(201).json({
            success: true,
            admin: result.rows[0],
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};




const handleLoginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password required",
            });
        }

        const result = await pool.query(
            "SELECT * FROM admin WHERE email=$1",
            [email.toLowerCase()]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const admin = result.rows[0];

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
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

        return res.status(200).json({
            success: true,
            message: "Login successful",
            admin: safeAdmin,
            accessToken,
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};




const handleGetAdmin = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const result = await pool.query(`
      SELECT *
      FROM admin
      WHERE id=$1`, [adminId]);
        const { password, refresh_tokens,role, role_id , ...data } = result.rows[0];
        res.json({
            success: true,
            data: data,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};


const handleGetAllAdmin = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM admin"
        )

        const data = result.rows.map(({ password, refresh_tokens, ...res }) => res)
        res.status(200).json({ success: true, message: "fetch all admin", data })
    } catch (error) {
        console.log(error);

    }
}

const handleUpdateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone_number, role, password, status } = req.body;


        const existing = await pool.query(
            "SELECT * FROM admin WHERE id=$1",
            [id]
        );

        if (!existing.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
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
            updatedStatus =
                status === true ||
                status === "true" ||
                status === 1 ||
                status === "1";
        }


        const updated = await pool.query(
            `UPDATE admin SET
        name=$1,
        phone_number=$2,
        role=$3,
        password=$4,
        image=$5,
        status=$6
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

        return res.status(200).json({
            success: true,
            message: "Admin updated successfully",
            admin: updated.rows[0],
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

const handleDeleteAdmin = async (req, res) => {
    try {

        const { id } = req.params;

        const isMatch = await pool.query(
            "SELECT * FROM admin WHERE id = $1",
            [id]
        )

        if (!isMatch.rows.length) {
            res.status(404).json({ message: "profile not exist" })
        }

        await pool.query(
            "DELETE  FROM admin WHERE id = $1",
            [id]
        )


        res.status(200).json({ success: true, message: "Profile Delete Sucessfully", })
    } catch (error) {

    }
}

const handleGetAllAdminWithRoles = async (req, res) => {
    try {
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
        res.status(200).json({ 
            success: true, 
            message: "fetch all admin", 
            data 
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

module.exports = {
    handleCreateAdmin,
    handleLoginAdmin,
    handleGetAdmin,
    handleGetAllAdmin,
    handleUpdateAdmin,
    handleDeleteAdmin,
    handleGetAllAdminWithRoles
};