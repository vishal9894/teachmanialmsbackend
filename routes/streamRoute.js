const express = require("express");
const upload = require("../middleware/multer");
const { handleCreateStream, handleGetStream, handleUpdateStream, handleDeleteStream } = require("../controller/streamController");

const route = express.Router();

route.post("/create-stream", upload.single("image"), handleCreateStream);
route.get("/get-stream", handleGetStream);
route.put("/update-stream/:id", upload.single("image"), handleUpdateStream);
route.delete("/delete-stream/:id", handleDeleteStream)


module.exports = route;