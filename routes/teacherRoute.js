const express = require("express");
const { handleCreateTeacher, handleGetTeacher, handleGetTeacherById, handleDeleteTeacher } = require("../controller/teacherController");
const upload = require("../middleware/multer");

const route = express.Router();

route.post("/create-teacher", upload.single("image"), handleCreateTeacher);
route.get("/get-teacher", handleGetTeacher)
route.get("/get-teacher/:id", handleGetTeacherById)
route.delete("/delete-teacher/:id" , handleDeleteTeacher);


module.exports = route;