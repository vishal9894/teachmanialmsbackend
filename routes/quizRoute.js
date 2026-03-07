const express = require("express");
const { HandleCreateQuiz, HandleGetQuiz, HandleCreateQuestion } = require("../controller/quizController");

const route = express.Router();

route.post("/create-quiz", HandleCreateQuiz);
route.get("/get-quiz" , HandleGetQuiz);
route.post("/create-question" , HandleCreateQuestion)


module.exports = route;