const axios = require("axios");
const mammoth = require("mammoth");
const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const toChemicalFormat = (text = "") => {
  const sub = {
    0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄",
    5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉",
  };

  return text.replace(/[A-Za-z]\d+/g, (m) =>
    m.replace(/\d/g, (d) => sub[d])
  );
};

const cleanText = (text = "") => {
  if (!text) return "";
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const questionFormatParser = (text) => {
  const questions = [];

  const blocks = text.split(/Question\s+\d+:/i).filter(b => b.trim());

  blocks.forEach((block) => {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l);

    const q = {
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A"
    };

    lines.forEach((line) => {
      if (/^\(?a\)/i.test(line)) {
        q.option_a = toChemicalFormat(cleanText(line.replace(/^\(?a\)/i, '')));
      }
      else if (/^\(?b\)/i.test(line)) {
        q.option_b = toChemicalFormat(cleanText(line.replace(/^\(?b\)/i, '')));
      }
      else if (/^\(?c\)/i.test(line)) {
        q.option_c = toChemicalFormat(cleanText(line.replace(/^\(?c\)/i, '')));
      }
      else if (/^\(?d\)/i.test(line)) {
        q.option_d = toChemicalFormat(cleanText(line.replace(/^\(?d\)/i, '')));
      }
      else if (/^Answer:/i.test(line)) {
        const ansMatch = line.match(/[A-D]/i);
        if (ansMatch && ansMatch[0]) {
          q.correct_answer = ansMatch[0].toUpperCase();
        }
      }
      else if (!q.question) {
        q.question = toChemicalFormat(cleanText(line));
      }
    });

    if (q.question && q.option_a && q.option_b) {
      questions.push(q);
    }
  });

  return questions;
};

const simpleParser = (text) => {
  const questions = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let currentQ = null;

  lines.forEach((line) => {
    if (/^\d+[\).\s]/.test(line) || /^Question\s+\d+:/i.test(line)) {
      if (currentQ && currentQ.question && currentQ.option_a) {
        questions.push(currentQ);
      }

      currentQ = {
        question: toChemicalFormat(cleanText(line.replace(/^\d+[\).\s]|Question\s+\d+:/i, ''))),
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A"
      };
    }
    else if (/^\(?[a-d]\)/i.test(line) && currentQ) {
      const option = line.match(/[a-d]/i)[0].toLowerCase();
      const value = toChemicalFormat(cleanText(line.replace(/^\(?[a-d]\)/i, '')));

      if (option === 'a') currentQ.option_a = value;
      else if (option === 'b') currentQ.option_b = value;
      else if (option === 'c') currentQ.option_c = value;
      else if (option === 'd') currentQ.option_d = value;
    }
    else if (/^Answer:/i.test(line) && currentQ) {
      const ansMatch = line.match(/[A-D]/i);
      if (ansMatch && ansMatch[0]) {
        currentQ.correct_answer = ansMatch[0].toUpperCase();
      }
    }
  });

  if (currentQ && currentQ.question && currentQ.option_a) {
    questions.push(currentQ);
  }

  return questions;
};

const parseMCQ = (text) => {
  let questions = [];

  questions = questionFormatParser(text);
  console.log(`Question format parser found: ${questions.length} questions`);

  if (questions.length === 0) {
    questions = simpleParser(text);
    console.log(`Simple parser found: ${questions.length} questions`);
  }

  return questions;
};

const handleUploadMCQWord = catchAsync(async (req, res) => {
  if (!req.file?.location) {
    throw new ApiError(400, "File not uploaded");
  }

  const buffer = await axios
    .get(req.file.location, { responseType: "arraybuffer" })
    .then(r => r.data);

  const { value: text } = await mammoth.extractRawText({ buffer });

  console.log("Extracted text sample:", text.substring(0, 500));

  const questions = parseMCQ(text);

  if (questions.length === 0) {
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "File uploaded but no MCQ questions could be detected. Please check the file format.",
      data: {
        inserted: 0,
        sample: text.substring(0, 200)
      }
    });
  }

  const values = [];
  const placeholders = [];

  questions.forEach((q, i) => {
    const idx = i * 6;

    placeholders.push(
      `($${idx + 1},$${idx + 2},$${idx + 3},$${idx + 4},$${idx + 5},$${idx + 6})`
    );

    values.push(
      q.question || "No question",
      q.option_a || "",
      q.option_b || "",
      q.option_c || "",
      q.option_d || "",
      q.correct_answer || "A"
    );
  });

  await pool.query(`
    INSERT INTO mcq_questions
    (question, option_a, option_b, option_c, option_d, correct_answer)
    VALUES ${placeholders.join(",")}
  `, values);

  sendResponse(res, {
    statusCode: 200,
    message: `${questions.length} questions imported successfully`,
    data: {
      inserted: questions.length,
      sample: questions[0]
    }
  });
});

const handleGetMCQ = catchAsync(async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM mcq_questions
    ORDER BY created_at DESC
  `);

  sendResponse(res, {
    statusCode: 200,
    message: "MCQ questions fetched successfully",
    total: result.rowCount,
    data: result.rows
  });
});

const handleDeleteMCQ = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (id === "all") {
    await pool.query("DELETE FROM mcq_questions");
  } else {
    const checkExists = await pool.query(
      "SELECT id FROM mcq_questions WHERE id=$1",
      [id]
    );
    
    if (checkExists.rows.length === 0) {
      throw new ApiError(404, "MCQ question not found");
    }
    
    await pool.query("DELETE FROM mcq_questions WHERE id=$1", [id]);
  }

  sendResponse(res, {
    statusCode: 200,
    message: id === "all" ? "All MCQ questions deleted successfully" : "MCQ question deleted successfully",
    data: {
      deletedId: id !== "all" ? id : null,
      deletedAll: id === "all"
    }
  });
});

module.exports = {
  handleUploadMCQWord,
  handleGetMCQ,
  handleDeleteMCQ,
};