const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateTeacher = catchAsync(async (req, res) => {
  const {
    name,
    account_id,
    revenue_share,
    assigned_course_id,
    teacherdetails,
    rating,
  } = req.body;

  if (!name) {
    throw new ApiError(400, "Teacher name is required");
  }

  const image = req.file?.location || req.file?.path || null;

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
      image,
    ]
  );

  const data = result.rows.map(({ account_id, revenue_share, ...res }) => res);

  sendResponse(res, {
    statusCode: 201,
    message: "Teacher created successfully",
    data: data[0],
  });
});

const handleGetTeacher = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM teachers ORDER BY created_at DESC"
  );

  const data = result.rows.map(({ account_id, revenue_share, ...res }) => res);

  sendResponse(res, {
    statusCode: 200,
    message: "Get teachers successfully",
    total: data.length,
    data,
  });
});

const handleGetTeacherById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT id, name, account_id, revenue_share, assigned_course_id, rating, teacherdetails, image, created_at
     FROM teachers
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Teacher not found");
  }

  const { account_id, revenue_share, ...teacherData } = result.rows[0];

  sendResponse(res, {
    statusCode: 200,
    message: "Teacher fetched successfully",
    data: teacherData,
  });
});

const handleUpdateTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    account_id,
    revenue_share,
    assigned_course_id,
    teacherdetails,
    rating,
  } = req.body;

  const existingTeacher = await pool.query(
    "SELECT * FROM teachers WHERE id = $1",
    [id]
  );

  if (existingTeacher.rows.length === 0) {
    throw new ApiError(404, "Teacher not found");
  }

  const image = req.file?.location || req.file?.path || null;

  const result = await pool.query(
    `UPDATE teachers
     SET name = COALESCE($1, name),
         account_id = COALESCE($2, account_id),
         revenue_share = COALESCE($3, revenue_share),
         assigned_course_id = COALESCE($4, assigned_course_id),
         teacherdetails = COALESCE($5, teacherdetails),
         rating = COALESCE($6, rating),
         image = COALESCE($7, image),
         updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      name,
      account_id,
      revenue_share,
      assigned_course_id,
      teacherdetails,
      rating,
      image,
      id
    ]
  );

  const { account_id: accId, revenue_share: revShare, ...teacherData } = result.rows[0];

  sendResponse(res, {
    statusCode: 200,
    message: "Teacher updated successfully",
    data: teacherData,
  });
});

const handleDeleteTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;

  const existingTeacher = await pool.query(
    "SELECT * FROM teachers WHERE id = $1",
    [id]
  );

  if (existingTeacher.rows.length === 0) {
    throw new ApiError(404, "Teacher not found");
  }

  const result = await pool.query(
    "DELETE FROM teachers WHERE id = $1 RETURNING *",
    [id]
  );

  const { account_id, revenue_share, ...teacherData } = result.rows[0];

  sendResponse(res, {
    statusCode: 200,
    message: "Teacher deleted successfully",
    data: teacherData,
  });
});

module.exports = { 
  handleCreateTeacher, 
  handleGetTeacher, 
  handleGetTeacherById,
  handleUpdateTeacher,
  handleDeleteTeacher 
};