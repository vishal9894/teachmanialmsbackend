const { pool } = require("../db/conntctDB");


const handleCreateSetting = async (req, res) => {
  try {
    const { setting_key, setting_value, description } = req.body;

    if (!setting_key || !setting_value) {
      return res.status(400).json({
        success: false,
        message: "setting_key and setting_value required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO general_settings
      (setting_key, setting_value, description)
      VALUES ($1,$2,$3)

      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        updated_at = NOW()

      RETURNING *;
      `,
      [setting_key, setting_value, description]
    );

    res.json({
      success: true,
      message: "Setting saved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const handleGetAllSettings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value FROM general_settings`
    );

    const settings = {};

    result.rows.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};



const handleDeleteSetting = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM general_settings WHERE setting_key=$1`,
      [id]
    );

    res.json({
      success: true,
      message: "Setting deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

const handleCreateRouteSetting = async (req, res) => {
  try {
    const { status, account_id, percentage } = req.body;




    if (!account_id) {
      return res.status(400).json({
        success: false,
        message: "account_id is required",
      });
    }

    if (percentage == null) {
      return res.status(400).json({
        success: false,
        message: "percentage is required",
      });
    }


    const result = await pool.query(
      `
      INSERT INTO route_settings
      (status, account_id, percentage)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [status ?? true, account_id, percentage]
    );

    res.status(201).json({
      success: true,
      message: "Route setting created successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Create Route Setting Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const handleGetRoutingAccount = async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT * FROM route_settings "
    )

    const data = result.rows.map((res) => res);

    res.status(200).json({ success: true, message: "get routing account", data });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

const handleDeleteRoutingAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }


    const isMatch = await pool.query(
      `SELECT id FROM route_settings WHERE id = $1`,
      [id]
    );

    if (isMatch.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Routing account not found",
      });
    }

    await pool.query(
      `DELETE FROM route_settings WHERE id = $1`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Routing account deleted successfully",
    });

  } catch (error) {
    console.error("Delete Routing Account Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = { handleCreateSetting, handleGetAllSettings, handleDeleteSetting, handleCreateRouteSetting, handleGetRoutingAccount , handleDeleteRoutingAccount }