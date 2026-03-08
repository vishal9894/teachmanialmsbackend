const express = require("express");
const upload = require("../middleware/multer");
const { handleAddTopTeacher, handleGetTopTeacher, handleUpdateTopTeacher, handleDeleteTopTeacher, handleAddTopStudent, handleGetTopStudent, handleUpdateTopStudent, handleDeleteStudent } = require("../controller/promotionsController");

const route = express.Router();


route.post(
    "/create-top-teacher",
    upload.single("avatar"),
    handleAddTopTeacher
);
route.get("/get-top-teacher", handleGetTopTeacher);
route.put("/update-top-teacher/:id", handleUpdateTopTeacher);
route.delete("/delete-top-teacher/:id", handleDeleteTopTeacher);
route.post(
  "/create-top-student",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  handleAddTopStudent
);
route.get("/get-top-student" , handleGetTopStudent)
route.put("/update-top-student/:id" , handleUpdateTopStudent)
route.delete("/delete-top-student/:id" , handleDeleteStudent)

module.exports = route;