const express = require("express");
const { handleCreateCourse, handleGetCourse, handleUpdatePublish, handleUpdateCourse, handleDeleteCourse, handleCreateFolder, handleUploadFile, handleGetFolderContent, handleDeleteContent, handlePurchaseCourse, handleAssignMultipleCourses, handleGetAssignCourse, handleDeleteAssingCourse } = require("../controller/courseController");
const upload = require("../middleware/multer");

const route = express.Router();

route.post("/create-course", upload.fields([
    { name: "courseimage", maxCount: 1 },
    { name: "introvideo", maxCount: 1 },
    { name: "timetable", maxCount: 1 },
    { name: "batchinfo", maxCount: 1 }
]), handleCreateCourse);
route.get("/get-course/:type", handleGetCourse);
route.put("/publish/:id", handleUpdatePublish)
route.put("/update-course/:id", handleUpdateCourse)
route.delete("/delete-course/:id", handleDeleteCourse);
route.post("/create-folder", upload.single("image"), handleCreateFolder);
route.post("/upload-content", upload.single("file"), handleUploadFile);
route.get("/get-folder", handleGetFolderContent);
route.delete("/delete-folder/:id", handleDeleteContent);
route.post("/buy-course", handlePurchaseCourse);
route.post("/assign-course", handleAssignMultipleCourses);
route.get("/get-assign-course" , handleGetAssignCourse);
route.delete("/delete-assign-course" , handleDeleteAssingCourse)

module.exports = route;