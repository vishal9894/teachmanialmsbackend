const express = require("express");
const { handleCreateEvent, handleGetEvents, handleDeleteEvents, handleUpdateEvents, handlePublishEvents, handleCreateAttachment, handleGetAttachments } = require("../controller/eventController");
const upload = require("../middleware/multer")

const route = express.Router();

route.post("/create-event" , handleCreateEvent)
route.get("/get-event/:id" , handleGetEvents);
route.delete("/delete-event/:id" , handleDeleteEvents);
route.put("/update-event/:id" , handleUpdateEvents)
route.put("/publish-event/:id" ,handlePublishEvents);
route.post("/create-attachment" , upload.single("file") , handleCreateAttachment);
route.get("/get-attachment/:id" , handleGetAttachments)

module.exports = route;