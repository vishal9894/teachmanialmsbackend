const { pool } = require("../db/conntctDB");

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

const handleGetQuiz = async (req, res) => {
  try {
    const quizResult = await pool.query("SELECT * FROM quizzes ORDER BY id DESC");
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

    res.status(200).json({
      success: true,
      activeQuizCount,
      message: "Quizzes fetched successfully",
      data: quizzes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

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

const handleGetQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;

    const result = await pool.query(
      `SELECT * FROM questions WHERE quiz_id = $1 ORDER BY id ASC`,
      [quizId]
    );

    res.status(200).json({
      success: true,
      total_questions: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const handleGetActiveQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

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

    res.status(200).json({
      success: true,
      total_questions: questions.length,
      data: questions
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const handleUpdateQuiz = async (req, res) => {
  try {

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

    // check quiz exist
    const quiz = await pool.query(
      `SELECT * FROM quizzes WHERE id = $1`,
      [id]
    );

    if (quiz.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    // update quiz
    const result = await pool.query(
      `UPDATE quizzes
       SET name = $1,
           category = $2,
           duration = $3,
           created_by = $4,
           negative_mark = $5,
           display_solution = $6,
           advance_mode = $7,
           active = $8,
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

    // delete old config
    await pool.query(
      `DELETE FROM quiz_question_config WHERE quiz_id = $1`,
      [id]
    );

    // insert new config
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

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
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
const handleDeleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await pool.query(
      `SELECT * FROM quizzes WHERE id = $1`,
      [id]
    );

    if (quiz.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    await pool.query(`DELETE FROM quiz_question_config WHERE quiz_id = $1`, [id]);
    await pool.query(`DELETE FROM questions WHERE quiz_id = $1`, [id]);
    await pool.query(`DELETE FROM quizzes WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  handleCreateQuiz,
  handleGetQuiz,
  handleCreateQuestion,
  handleGetQuestions,
  handleGetActiveQuiz,
  handleDeleteQuiz,
  handleUpdateQuiz
};