const { pool } = require("../db/conntctDB");

// Create Quiz
const handleCreateQuiz = async (req, res) => {
  try {
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

    const quizResult = await pool.query(
      `INSERT INTO quizzes
      (name, category, duration, created_by, negative_mark, display_solution, advance_mode)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [name, category, duration, created_by, negative_mark, display_solution, advance_mode]
    );

    const quizId = quizResult.rows[0].id;

    for (const q of questions) {
      await pool.query(
        `INSERT INTO quiz_question_config
        (quiz_id, question_category, number_of_questions)
        VALUES ($1,$2,$3)`,
        [quizId, q.category, q.count]
      );
    }

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quiz: quizResult.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get All Quizzes
const handleGetQuiz = async (req, res) => {
  try {
    const quizResult = await pool.query("SELECT * FROM quizzes");
    const quizzes = [];

    for (const quiz of quizResult.rows) {
      const configResult = await pool.query(
        "SELECT question_category, number_of_questions FROM quiz_question_config WHERE quiz_id = $1",
        [quiz.id]
      );

      quizzes.push({
        ...quiz,
        question_config: configResult.rows
      });
    }

    res.status(200).json({
      success: true,
      message: "Quizzes fetched successfully",
      data: quizzes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Create Question
const handleCreateQuestion = async (req, res) => {
  try {
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

    console.log(req.body);
    

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

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Create Question Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get Questions for a Quiz
const handleGetQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const result = await pool.query(
      "SELECT * FROM questions WHERE quiz_id = $1 ORDER BY id ASC",
      [quizId]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  handleCreateQuiz,
  handleGetQuiz,
  handleCreateQuestion,
  handleGetQuestions
};