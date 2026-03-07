const express = require("express");
const upload = require("../middleware/multer");
const { HandleCreateStream, HandleGetStream, HandleUpdateStream, HandleDeleteStream } = require("../controller/streamController");

const route = express.Router();

route.post("/create-stream", upload.single("image"), HandleCreateStream);
route.get("/get-stream", HandleGetStream);
route.put("/update-stream/:id", upload.single("image"), HandleUpdateStream);
route.delete("/delete-stream/:id", HandleDeleteStream)


module.exports = route;