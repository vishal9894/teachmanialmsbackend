const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateQuiz = catchAsync(async (req, res) => {
  const {
    name,
    category,
    duration,
    created_by,
    negative_mark,
    display_solution,
    advance_mode,
    questions
  } = req.body;

  if (!name || !category || !duration) {
    throw new ApiError(400, "Name, category, and duration are required");
  }

  const quizResult = await pool.query(
    `INSERT INTO quizzes
    (name, category, duration, created_by, negative_mark, display_solution, advance_mode)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [name, category, duration, created_by, negative_mark, display_solution, advance_mode]
  );

  const quizId = quizResult.rows[0].id;

  if (questions && questions.length > 0) {
    for (const q of questions) {
      await pool.query(
        `INSERT INTO quiz_question_config
        (quiz_id, question_category, number_of_questions)
        VALUES ($1,$2,$3)`,
        [quizId, q.category, q.count]
      );
    }
  }

  sendResponse(res, {
    statusCode: 201,
    message: "Quiz created successfully",
    data: quizResult.rows[0]
  });
});

const handleGetQuiz = catchAsync(async (req, res) => {
  const quizResult = await pool.query(
    "SELECT * FROM quizzes ORDER BY id DESC"
  );
  
  const quizzes = [];

  const activeQuizCountResult = await pool.query(
    "SELECT COUNT(*) FROM quizzes WHERE active = true"
  );

  const activeQuizCount = Number(activeQuizCountResult.rows[0].count);

  for (const quiz of quizResult.rows) {
    const configResult = await pool.query(
      `SELECT question_category, number_of_questions
       FROM quiz_question_config
       WHERE quiz_id = $1`,
      [quiz.id]
    );

    const questionCount = await pool.query(
      `SELECT COUNT(*) FROM questions WHERE quiz_id = $1`,
      [quiz.id]
    );

    quizzes.push({
      ...quiz,
      total_questions: Number(questionCount.rows[0].count),
      question_config: configResult.rows
    });
  }

  sendResponse(res, {
    statusCode: 200,
    message: "Quizzes fetched successfully",
    total: quizzes.length,
    activeQuizCount,
    data: quizzes
  });
});

const handleCreateQuestion = catchAsync(async (req, res) => {
  const {
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer,
    solution,
    category,
    quiz_id
  } = req.body;

  if (!question || !correct_answer || !quiz_id) {
    throw new ApiError(400, "Question, correct answer, and quiz ID are required");
  }

  const quizCheck = await pool.query(
    "SELECT id FROM quizzes WHERE id = $1",
    [quiz_id]
  );

  if (quizCheck.rows.length === 0) {
    throw new ApiError(404, "Quiz not found");
  }

  const question_image = req.files?.question_image?.[0]?.location || null;
  const option_a_image = req.files?.option_a_image?.[0]?.location || null;
  const option_b_image = req.files?.option_b_image?.[0]?.location || null;
  const option_c_image = req.files?.option_c_image?.[0]?.location || null;
  const option_d_image = req.files?.option_d_image?.[0]?.location || null;
  const solution_image = req.files?.solution_image?.[0]?.location || null;

  const result = await pool.query(
    `INSERT INTO questions(
      question, question_image,
      option_a, option_a_image,
      option_b, option_b_image,
      option_c, option_c_image,
      option_d, option_d_image,
      correct_answer, solution, solution_image,
      category, quiz_id
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *`,
    [
      question, question_image,
      option_a, option_a_image,
      option_b, option_b_image,
      option_c, option_c_image,
      option_d, option_d_image,
      correct_answer, solution, solution_image,
      category, quiz_id
    ]
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Question created successfully",
    data: result.rows[0]
  });
});

const handleGetQuestions = catchAsync(async (req, res) => {
  const { quizId } = req.params;

  const quizCheck = await pool.query(
    "SELECT id FROM quizzes WHERE id = $1",
    [quizId]
  );

  if (quizCheck.rows.length === 0) {
    throw new ApiError(404, "Quiz not found");
  }

  const result = await pool.query(
    `SELECT * FROM questions WHERE quiz_id = $1 ORDER BY id ASC`,
    [quizId]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Questions fetched successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleGetActiveQuiz = catchAsync(async (req, res) => {
  const { quizId } = req.params;

  const quizCheck = await pool.query(
    "SELECT id, active FROM quizzes WHERE id = $1",
    [quizId]
  );

  if (quizCheck.rows.length === 0) {
    throw new ApiError(404, "Quiz not found");
  }

  if (!quizCheck.rows[0].active) {
    throw new ApiError(403, "Quiz is not active");
  }

  const config = await pool.query(
    `SELECT * FROM quiz_question_config WHERE quiz_id = $1`,
    [quizId]
  );

  let questions = [];

  for (const item of config.rows) {
    const result = await pool.query(
      `SELECT * FROM questions
       WHERE quiz_id = $1 AND category = $2
       ORDER BY RANDOM()
       LIMIT $3`,
      [quizId, item.question_category, item.number_of_questions]
    );

    questions = [...questions, ...result.rows];
  }

  sendResponse(res, {
    statusCode: 200,
    message: "Active quiz fetched successfully",
    total: questions.length,
    data: questions
  });
});

const handleUpdateQuiz = catchAsync(async (req, res) => {
  const { id } = req.params;

  const {
    name,
    category,
    duration,
    created_by,
    negative_mark,
    display_solution,
    advance_mode,
    active,
    questions
  } = req.body;

  const quiz = await pool.query(
    `SELECT * FROM quizzes WHERE id = $1`,
    [id]
  );

  if (quiz.rows.length === 0) {
    throw new ApiError(404, "Quiz not found");
  }

  const result = await pool.query(
    `UPDATE quizzes
     SET name = COALESCE($1, name),
         category = COALESCE($2, category),
         duration = COALESCE($3, duration),
         created_by = COALESCE($4, created_by),
         negative_mark = COALESCE($5, negative_mark),
         display_solution = COALESCE($6, display_solution),
         advance_mode = COALESCE($7, advance_mode),
         active = COALESCE($8, active),
         updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [
      name,
      category,
      duration,
      created_by,
      negative_mark,
      display_solution,
      advance_mode,
      active,
      id
    ]
  );

  if (questions !== undefined) {
    await pool.query(
      `DELETE FROM quiz_question_config WHERE quiz_id = $1`,
      [id]
    );

    if (questions && questions.length > 0) {
      for (const q of questions) {
        await pool.query(
          `INSERT INTO quiz_question_config
           (quiz_id, question_category, number_of_questions)
           VALUES ($1,$2,$3)`,
          [id, q.category, q.count]
        );
      }
    }
  }

  sendResponse(res, {
    statusCode: 200,
    message: "Quiz updated successfully",
    data: result.rows[0]
  });
});

const handleDeleteQuiz = catchAsync(async (req, res) => {
  const { id } = req.params;

  const quiz = await pool.query(
    `SELECT * FROM quizzes WHERE id = $1`,
    [id]
  );

  if (quiz.rows.length === 0) {
    throw new ApiError(404, "Quiz not found");
  }

  await pool.query(`DELETE FROM quiz_question_config WHERE quiz_id = $1`, [id]);
  await pool.query(`DELETE FROM questions WHERE quiz_id = $1`, [id]);
  await pool.query(`DELETE FROM quizzes WHERE id = $1`, [id]);

  sendResponse(res, {
    statusCode: 200,
    message: "Quiz deleted successfully"
  });
});

module.exports = {
  handleCreateQuiz,
  handleGetQuiz,
  handleCreateQuestion,
  handleGetQuestions,
  handleGetActiveQuiz,
  handleDeleteQuiz,
  handleUpdateQuiz
};