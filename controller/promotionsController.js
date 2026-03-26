const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleAddTopTeacher = catchAsync(async (req, res) => {
  const { name, about, streamid } = req.body;

  if (!name || !about) {
    throw new ApiError(400, "Name and about are required");
  }

  if (!req.file) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = req.file.location;

  const result = await pool.query(
    `INSERT INTO top_teachers (name, about, stream_id, avatar)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, about, streamid, avatar]
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Teacher created successfully",
    data: result.rows[0],
  });
});

const handleGetTopTeacher = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM top_teachers ORDER BY created_at DESC"
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Fetch teachers successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleUpdateTopTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, about, streamid } = req.body;

  const existing = await pool.query(
    "SELECT * FROM top_teachers WHERE id = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    throw new ApiError(404, "Teacher not found");
  }

  let avatar = existing.rows[0].avatar;

  if (req.file) {
    avatar = req.file.location;
  }

  const result = await pool.query(
    `UPDATE top_teachers
     SET name = $1,
         about = $2,
         stream_id = $3,
         avatar = $4,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name || existing.rows[0].name, about || existing.rows[0].about, streamid || existing.rows[0].stream_id, avatar, id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Teacher updated successfully",
    data: result.rows[0],
  });
});

const handleDeleteTopTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;

  const existing = await pool.query(
    "SELECT * FROM top_teachers WHERE id = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    throw new ApiError(404, "Teacher not found");
  }

  await pool.query(
    "DELETE FROM top_teachers WHERE id = $1",
    [id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Teacher deleted successfully",
  });
});

const handleAddTopStudent = catchAsync(async (req, res) => {
  const { name, streamid, video } = req.body;

  if (!name || !streamid || !video) {
    throw new ApiError(400, "Name, stream ID, and video are required");
  }

  const streamIdInt = parseInt(streamid);
  if (isNaN(streamIdInt)) {
    throw new ApiError(400, "Stream ID must be a valid number");
  }

  if (!req.files || !req.files.avatar) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = req.files.avatar[0].location;

  if (!avatar) {
    throw new ApiError(400, "File upload failed");
  }

  const result = await pool.query(
    `INSERT INTO top_students (name, stream_id, avatar, video)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, streamIdInt, avatar, video]
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Student created successfully",
    data: result.rows[0],
  });
});

const handleGetTopStudent = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM top_students ORDER BY created_at DESC"
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Fetch top students successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleUpdateTopStudent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, streamid } = req.body;

  const existing = await pool.query(
    "SELECT * FROM top_students WHERE id = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    throw new ApiError(404, "Student does not exist");
  }

  const student = existing.rows[0];
  const updatedName = name || student.name;
  
  let updatedStreamId = student.stream_id;
  if (streamid !== undefined) {
    updatedStreamId = parseInt(streamid);
    if (isNaN(updatedStreamId)) {
      throw new ApiError(400, "Stream ID must be a number");
    }
  }

  const updatedAvatar = req.files?.avatar?.[0]?.location || student.avatar;
  const updatedVideo = req.files?.video?.[0]?.location || student.video;

  const result = await pool.query(
    `UPDATE top_students
     SET name = $1,
         stream_id = $2,
         avatar = $3,
         video = $4,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [updatedName, updatedStreamId, updatedAvatar, updatedVideo, id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Student updated successfully",
    data: result.rows[0],
  });
});

const handleDeleteStudent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const existing = await pool.query(
    "SELECT * FROM top_students WHERE id = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    throw new ApiError(404, "Student not found");
  }

  await pool.query(
    "DELETE FROM top_students WHERE id = $1",
    [id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Student deleted successfully",
  });
});

module.exports = { 
  handleAddTopTeacher, 
  handleGetTopTeacher, 
  handleUpdateTopTeacher, 
  handleDeleteTopTeacher, 
  handleAddTopStudent, 
  handleGetTopStudent, 
  handleUpdateTopStudent, 
  handleDeleteStudent 
};