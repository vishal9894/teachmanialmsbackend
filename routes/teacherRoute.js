const express = require("express");
const { HandleCreateTeacher, HandleGetTeacher, HandleGetTeacherById } = require("../controller/teacherController");
const upload = require("../middleware/multer");

const route = express.Router();

route.post("/create-teacher", upload.single("image"), HandleCreateTeacher);
route.get("/get-teacher", HandleGetTeacher)
route.get("/get-teacher/:id", HandleGetTeacherById)


module.exports = route;