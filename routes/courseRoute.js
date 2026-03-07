const express = require("express");
const { HandleCreateCourse, HandleGetCourse, HandleUpdatePublish, HandleUpdateCourse, HandleDeleteCourse } = require("../controller/courseController");
const upload = require("../middleware/multer");

const route = express.Router();

route.post("/create-course", upload.fields([
    { name: "courseimage", maxCount: 1 },
    { name: "introvideo", maxCount: 1 },
    { name: "timetable", maxCount: 1 },
    { name: "batchinfo", maxCount: 1 }
]), HandleCreateCourse);
route.get("/get-course/:type", HandleGetCourse);
route.put("/publish/:id", HandleUpdatePublish)
route.put("/update-course/:id" , HandleUpdateCourse)
route.delete("/delete-course/:id" , HandleDeleteCourse);

module.exports = route;