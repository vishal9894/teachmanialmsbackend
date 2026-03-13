const axios = require("axios");
const mammoth = require("mammoth");
const { pool } = require("../db/conntctDB");

/* ============================
 CLEAN OPTION TEXT
============================ */
const cleanText = (text = "") =>
  text
    .replace(/\s+/g, " ")
    .replace(/Answer\s*:\s*[A-D]/i, "")
    .trim();

/* ============================
UPLOAD WORD MCQ
============================ */
const handleUploadMCQWord = async (req, res) => {
  try {

    if (!req.file?.location) {
      return res.status(400).json({
        success: false,
        message: "File not uploaded"
      });
    }

    /* ================= DOWNLOAD FILE ================= */

    const file = await axios.get(req.file.location, {
      responseType: "arraybuffer"
    });

    /* ================= EXTRACT TEXT ================= */

    const result = await mammoth.extractRawText({
      buffer: file.data
    });

    const text = result.value;

    const questions = [];

    /* ================= SPLIT QUESTIONS ================= */

    const blocks = text.split(/Question\s*:/i);

    for (let block of blocks) {

      block = block.trim();
      if (!block) continue;

      /* ---------- QUESTION ---------- */

      const lines = block
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

      let question = cleanText(lines[0]);

      /* ---------- EXTRACT ANSWER ---------- */

      let answer = "A";

      const ansMatch = block.match(/Answer\s*:\s*([A-D])/i);

      if (ansMatch) {
        answer = ansMatch[1].toUpperCase();
      }

      /* Remove answer line before extracting options */

      let cleanBlock = block.replace(/Answer\s*:\s*[A-D]/i, "");

      /* ---------- EXTRACT OPTIONS ---------- */

      let option_a = "";
      let option_b = "";
      let option_c = "";
      let option_d = "";

      const optionRegex = /\(([a-d])\)\s*([^()]+)/gi;

      let match;

      while ((match = optionRegex.exec(cleanBlock)) !== null) {

        const key = match[1].toUpperCase();

        const value = cleanText(match[2]);

        if (key === "A") option_a = value;
        if (key === "B") option_b = value;
        if (key === "C") option_c = value;
        if (key === "D") option_d = value;
      }

      /* ---------- VALIDATE ---------- */

      if (
        question &&
        option_a &&
        option_b &&
        option_c &&
        option_d
      ) {
        questions.push({
          question,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer: answer
        });
      }
    }

    /* ================= CHECK QUESTIONS ================= */

    if (!questions.length) {
      return res.json({
        success: false,
        message: "No MCQ detected",
        debug: text.substring(0, 500)
      });
    }

    /* ================= BULK INSERT ================= */

    const values = [];
    const placeholders = [];

    questions.forEach((q, i) => {

      const index = i * 6;

      placeholders.push(
        `($${index + 1},$${index + 2},$${index + 3},$${index + 4},$${index + 5},$${index + 6})`
      );

      values.push(
        q.question,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer
      );
    });

    const query = `
      INSERT INTO mcq_questions
      (question, option_a, option_b, option_c, option_d, correct_answer)
      VALUES ${placeholders.join(",")}
    `;

    await pool.query(query, values);

    res.json({
      success: true,
      inserted: questions.length,
      sample: questions[0]
    });

  } catch (error) {

    console.error("UPLOAD ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

/* ============================
GET QUESTIONS
============================ */

const handleGetMCQ = async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT * FROM mcq_questions ORDER BY id DESC"
    );

    res.json({
      success: true,
      total: result.rows.length,
      questions: result.rows
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

/* ============================
DELETE QUESTION
============================ */

const handleDeleteMCQ = async (req, res) => {
  try {

    const { id } = req.params;

    if (id === "all") {

      await pool.query("DELETE FROM mcq_questions");

      return res.json({
        success: true,
        message: "All questions deleted"
      });
    }

    await pool.query(
      "DELETE FROM mcq_questions WHERE id=$1",
      [id]
    );

    res.json({
      success: true,
      message: "Question deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

module.exports = {
  handleUploadMCQWord,
  handleGetMCQ,
  handleDeleteMCQ
};