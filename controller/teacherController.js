const { pool } = require("../db/conntctDB");
const HandleCreateTeacher = async (req, res) => {
    try {

        const {
            name,
            account_id,
            revenue_share,
            assigned_course_id,
            teacherdetails,
            rating
        } = req.body;

        const image = req.files?.image?.[0]?.location || null;

        const result = await pool.query(
            `INSERT INTO teachers
      (name, account_id, revenue_share, assigned_course_id, rating, teacherdetails, image)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
            [
                name,
                account_id,
                revenue_share,
                assigned_course_id,
                rating,
                teacherdetails,
                image
            ]
        );

        const data = result.rows.map(({ account_id, revenue_share, ...res }) => res)

        res.status(201).json({
            success: true,
            message: "Teacher created and course assigned",
            data
        });

    } catch (error) {

        console.error("Create Teacher Error:", error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};
const HandleGetTeacher = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM teachers"
        )
        const data = result.rows.map((res) => res)


        res.status(200).json({ success: true, message: "Get Teacher sucessfully", data })

    } catch (error) {
        console.log(error);

    }
}

const HandleGetTeacherById = async (req, res) => {
    try {

        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, name, account_id, revenue_share
       FROM teachers
       WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Teacher not found"
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = { HandleCreateTeacher, HandleGetTeacher, HandleGetTeacherById };