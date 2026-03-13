const express = require("express");

const upload = require("../middleware/multer");
const { handleUploadMCQWord, handleGetMCQ, handleDeleteMCQ } = require("../controller/bulkQuestionUploadController");


const route = express.Router();

route.post("/import-question", upload.single("file"), handleUploadMCQWord);
route.get("/get-question", handleGetMCQ);
route.delete("/delete-question/:id", handleDeleteMCQ)



module.exports = route;