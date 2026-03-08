const { pool } = require("../db/conntctDB");

const handleAddTopTeacher = async (req, res) => {
  try {
    const { name, about, streamid } = req.body;


    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required",
      });
    }

   
    const avatar = req.file.location;



    const result = await pool.query(
      `INSERT INTO top_teachers (name, about, stream_id, avatar)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, about, streamid, avatar]
    );

    res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const handleGetTopTeacher = async (req, res) => {
  try {
    const tecacher = await pool.query(
      "SELECT * FROM top_teachers"
    )
    const data = tecacher.rows.map((res) => res)
    res.status(200).json({ message: "fetch Teacher sucessfully", data })

  } catch (error) {

  }
}

const handleUpdateTopTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, about, streamid } = req.body;


    const existing = await pool.query(
      "SELECT * FROM top_teachers WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }


    let avatar = existing.rows[0].image;

    if (req.file) {
      avatar = req.file.location;
    }

    const result = await pool.query(
      `UPDATE top_teachers
       SET name = $1,
           about = $2,
           stream_id = $3,
           avatar = $4
       WHERE id = $5
       RETURNING *`,
      [name, about, streamid, avatar, id]
    );

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
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

const handleDeleteTopTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT * FROM top_teachers WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    await pool.query(
      "DELETE FROM top_teachers WHERE id = $1",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const handleAddTopStudent = async (req, res) => {
  try {


    const { name, streamid } = req.body;

    if (!name || !streamid) {
      return res.status(400).json({
        success: false,
        message: "Name and Stream ID are required",
      });
    }

    const streamIdInt = Number(streamid);
    if (isNaN(streamIdInt)) {
      return res.status(400).json({
        success: false,
        message: "Stream ID must be a valid number",
      });
    }
    if (!req.files || !req.files.avatar || !req.files.video) {
      return res.status(400).json({
        success: false,
        message: "Avatar and Video are required",
      });
    }

    const avatar = req.files.avatar[0].location;
    const video = req.files.video[0].location;

    if (!avatar || !video) {
      return res.status(400).json({
        success: false,
        message: "File upload failed",
      });
    }

  
    const result = await pool.query(
      `INSERT INTO top_students (name, stream_id, avatar, video)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, streamIdInt, avatar, video]
    );

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("AddTopStudent Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const handleGetTopStudent = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM top_students",
    )

    const data = result.rows.map((res) => res)

    res.status(200).json({ message: "fetch top student sucessfully", data })

  } catch (error) {

  }
}

const handleUpdateTopStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, streamid } = req.body;

    const isExist = await pool.query(
      "SELECT * FROM top_students WHERE id = $1",
      [id]
    );
    if (isExist.rows.length === 0) {
      return res.status(404).json({ message: "Student does not exist" });
    }
    const student = isExist.rows[0];
    const updatedName = name || student.name;
    const updatedStreamId = streamid ? Number(streamid) : student.stream_id;
    if (streamid && isNaN(updatedStreamId)) {
      return res.status(400).json({ message: "Stream ID must be a number" });
    }
    const updatedAvatar = req.files?.avatar?.[0]?.location || student.avatar;
    const updatedVideo = req.files?.video?.[0]?.location || student.video;
    const result = await pool.query(
      `UPDATE top_students
       SET name = $1,
           stream_id = $2,
           avatar = $3,
           video = $4,
           created_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [updatedName, updatedStreamId, updatedAvatar, updatedVideo, id]
    );
    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("UpdateTopStudent Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const handleDeleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT * FROM top_students WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await pool.query(
      "DELETE FROM top_students WHERE id = $1",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = { handleAddTopTeacher, handleGetTopTeacher, handleUpdateTopTeacher, handleDeleteTopTeacher, handleAddTopStudent, handleGetTopStudent, handleUpdateTopStudent , handleDeleteStudent };