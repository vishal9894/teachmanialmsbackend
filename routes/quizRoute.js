const express = require("express");
const { handleCreateQuiz, handleGetQuiz, handleCreateQuestion, handleGetQuestions } = require("../controller/quizController");
const upload = require("../middleware/multer");

const route = express.Router();

route.post("/create-quiz", handleCreateQuiz);
route.get("/get-quiz" , handleGetQuiz);
route.post("/create-question" ,  upload.fields([
    { name: "question_image", maxCount: 1 },
    { name: "option_a_image", maxCount: 1 },
    { name: "option_b_image", maxCount: 1 },
    { name: "option_c_image", maxCount: 1 },
    { name: "option_d_image", maxCount: 1 },
    { name: "solution_image", maxCount: 1 }
  ]), handleCreateQuestion)
route.get("/get-questions/:quizId" ,handleGetQuestions)


module.exports = route;