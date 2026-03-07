const express = require("express");
const upload = require("../middleware/multer");
const { HandleAddTopTeacher, HandleGetTopTeacher, HandleUpdateTopTeacher, HandleDeleteTopTeacher, HandleAddTopStudent, HandleGetTopStudent, HandleUpdateTopStudent, HandleDeleteStudent } = require("../controller/promotionsController");

const route = express.Router();


route.post(
    "/create-top-teacher",
    upload.single("avatar"),
    HandleAddTopTeacher
);
route.get("/get-top-teacher", HandleGetTopTeacher);
route.put("/update-top-teacher/:id", HandleUpdateTopTeacher);
route.delete("/delete-top-teacher/:id", HandleDeleteTopTeacher);
route.post(
  "/create-top-student",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  HandleAddTopStudent
);
route.get("/get-top-student" , HandleGetTopStudent)
route.put("/update-top-student/:id" , HandleUpdateTopStudent)
route.delete("/delete-top-student/:id" , HandleDeleteStudent)

module.exports = route;