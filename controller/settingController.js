const { pool } = require("../db/conntctDB");

const handleCreateSetting = async (req, res) => {
  try {
    const { setting_key, setting_value, description } = req.body;

    if (!setting_key || setting_value === undefined || setting_value === null) {
      return res.status(400).json({
        success: false,
        message: "setting_key and setting_value required",
      });
    }

    
    const stringValue = typeof setting_value === 'object' 
      ? JSON.stringify(setting_value) 
      : String(setting_value);

    const result = await pool.query(
      `
      INSERT INTO general_settings
      (setting_key, setting_value, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING *;
      `,
      [setting_key, stringValue, description || '']
    );

    res.json({
      success: true,
      message: "Setting saved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create setting error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
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
      const key = row.setting_key;
      const value = row.setting_value;
      

      try {
        if (value.startsWith('{') && value.endsWith('}')) {
          settings[key] = JSON.parse(value);
        } else if (value === 'true') {
          settings[key] = true;
        } else if (value === 'false') {
          settings[key] = false;
        } else if (!isNaN(value) && value.trim() !== '') {

          settings[key] = Number(value);
        } else {
          settings[key] = value;
        }
      } catch (e) {
       
        settings[key] = value;
      }
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch settings" 
    });
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
    console.error("Delete setting error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete setting" 
    });
  }
};

const handleCreateRouteSetting = async (req, res) => {
  try {
    const { status, account_id, percentage } = req.body;

   

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
      message: "Server error: " + error.message,
    });
  }
};

const handleGetRoutingAccount = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM route_settings ORDER BY created_at DESC"
    );

    res.status(200).json({ 
      success: true, 
      message: "Routing accounts fetched successfully", 
      data: result.rows 
    });

  } catch (error) {
    console.error("Get routing accounts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

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
      message: "Server error: " + error.message,
    });
  }
};

module.exports = { 
  handleCreateSetting, 
  handleGetAllSettings, 
  handleDeleteSetting, 
  handleCreateRouteSetting, 
  handleGetRoutingAccount, 
  handleDeleteRoutingAccount 
};