const { pool } = require("../db/conntctDB");

const handleCreateStream = async (req, res) => {
    try {
        const { name, description } = req.body;
        const image = req.file ? req.file.location : null; 

        const result = await pool.query(
            `INSERT INTO streams (name, description, image)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, description, image]
        );

        res.status(201).json({
            success: true,
            message: "Stream created successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create stream",
            error: error.message
        });
    }
};

const handleGetStream = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM streams"
        )

        
        const data = result.rows.map((res) => res)
        
        const total = data.length;
        res.status(200).json({ success: true, total, message: " fetch strime sucessfully", data });

    } catch (error) {

    }
}

const handleUpdateStream = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const image = req.file ? req.file.location : null;

        const result = await pool.query(
            `UPDATE streams
       SET name = $1,
           description = $2,
           image = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
            [name, description, image, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stream not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Stream updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update stream",
            error: error.message
        });
    }
};
const handleDeleteStream = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM streams
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stream not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Stream deleted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete stream",
      error: error.message
    });
  }
};

module.exports = { handleCreateStream, handleGetStream , handleUpdateStream , handleDeleteStream };