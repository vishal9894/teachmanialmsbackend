const { pool } = require("../db/conntctDB");

const handleCreateSocialmedia = async (req, res) => {
    try {

        const { name, url } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: "Name and URL are required"
            });
        }

        const image = req.files?.image?.[0]?.location || null;

        const result = await pool.query(
            `INSERT INTO social_media (name, url, image)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [name, url, image]
        );

        res.status(201).json({
            success: true,
            message: "Social media created successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};

const handleGetSocialmedia = async (req, res) => {
    try {

        const result = await pool.query(
            "SELECT * FROM  social_media"
        )

        const data = result.rows.map((res) => res);

        const total = data.length;

        res.status(200).json({ success: true, message: " fetch socialmedia", total , data })

    } catch (error) {

        console.log(error);


    }
}


const handleUpdateSocialmedia = async (req, res) => {
    try {

        const { id } = req.params;
        const { name, url } = req.body;

        const image = req.files?.image?.[0]?.location || null;

        const check = await pool.query(
            `SELECT * FROM social_media WHERE id = $1`,
            [id]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Social media not found"
            });
        }

        const result = await pool.query(
            `UPDATE social_media
       SET name = $1,
           url = $2,
           image = COALESCE($3, image)
       WHERE id = $4
       RETURNING *`,
            [name, url, image, id]
        );

        res.status(200).json({
            success: true,
            message: "Social media updated successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};


const handleDeleteSocialmedia = async (req, res) => {
    try {

        const { id } = req.params;

        const check = await pool.query(
            `SELECT * FROM social_media WHERE id = $1`,
            [id]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Social media not found"
            });
        }

        await pool.query(
            `DELETE FROM social_media WHERE id = $1`,
            [id]
        );

        res.status(200).json({
            success: true,
            message: "Social media deleted successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};


module.exports = {
    handleCreateSocialmedia,
    handleUpdateSocialmedia,
    handleDeleteSocialmedia,
    handleGetSocialmedia
};