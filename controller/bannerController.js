const { pool } = require("../db/conntctDB");



const handleCreateBanner = async (req, res) => {
    try {

        const {
            title,
            course,
            redirecttype,
            url_link,
            publish = false,
            type
        } = req.body;

        const image = req.file?.location;

        const result = await pool.query(
            `INSERT INTO banners
      (title, type, course, redirect_type, url_link, image, publish)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
            [title, type, course, redirecttype, url_link, image, publish]
        );

        res.status(201).json({
            success: true,
            message: `${type} created successfully`,
            data: result.rows[0],
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const handleGetBanner = async (req, res) => {
    try {

        const result = await pool.query(
            "SELECT * FROM banners WHERE type = 'banner' ORDER BY id DESC"
        );

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const handleGetNews = async (req, res) => {
    try {

        const result = await pool.query(
            "SELECT * FROM banners WHERE type = 'news' ORDER BY id DESC"
        );

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const handleBannerPublish = async (req, res) => {
    try {
        const { id } = req.params;
        const { publish } = req.body;

        if (publish === undefined) {
            return res.status(400).json({
                success: false,
                message: "Publish status is required",
            });
        }

        const checkBanner = await pool.query(
            "SELECT * FROM banners WHERE id = $1",
            [id]
        );

        if (checkBanner.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
            });
        }

        const result = await pool.query(
            "UPDATE banners SET publish = $1 WHERE id = $2 RETURNING *",
            [publish, id]
        );

        return res.status(200).json({
            success: true,
            message: `Banner ${publish ? "published" : "unpublished"
                } successfully`,
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Publish Banner Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const handleUpdateBanner = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Banner ID is required",
            });
        }

        const {
            title,
            course,
            redirecttype,
            url_link,
            type,
            publish,
        } = req.body;


        const checkBanner = await pool.query(
            "SELECT * FROM banners WHERE id = $1",
            [id]
        );

        if (checkBanner.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found",
            });
        }

        const existingBanner = checkBanner.rows[0];


        let image = existingBanner.image;

        if (req.file && req.file.location) {
            image = req.file.location;
        }


        let publishValue = existingBanner.publish;

        if (publish !== undefined) {
            publishValue = publish === "true" || publish === true;
        }


        const result = await pool.query(
            `UPDATE banners
       SET title = $1,
           course = $2,
           redirect_type = $3,
           url_link = $4,
           type = $5,
           publish = $6,
           image = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
            [
                title || existingBanner.title,
                course || existingBanner.course,
                redirecttype || existingBanner.redirect_type,
                url_link || existingBanner.url_link,
                type || existingBanner.type,
                publishValue,
                image,
                id,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Update Banner Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};
const handleDeleteBanner = async (req, res) => {
    try {
        const { id } = req.params;

        const isMatch = await pool.query(
            "SELECT * FROM banners WHERE id = $1",
            [id]
        );

        if (isMatch.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner does not exist",
            });
        }


        const result = await pool.query(
            "DELETE FROM banners WHERE id = $1 RETURNING *",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully",
            data: result.rows[0],
        });

    } catch (error) {
        console.error("Delete Banner Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = { handleCreateBanner, handleGetBanner, handleBannerPublish, handleUpdateBanner, handleDeleteBanner, handleGetNews };