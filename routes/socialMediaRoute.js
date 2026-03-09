
const express = require("express");
const { handleCreateSocialmedia, handleUpdateSocialmedia, handleDeleteSocialmedia, handleGetSocialmedia } = require("../controller/socialMediaController");
const upload = require("../middleware/multer");

const route = express.Router();

route.post("/create-socialmedia", upload.single("image") , handleCreateSocialmedia);
route.put("/update-socialmedia/:id", upload.single("image") , handleUpdateSocialmedia);
route.delete("/delete-socialmedia/:id", handleDeleteSocialmedia);
route.get("/get-socialmedia" , handleGetSocialmedia)


module.exports = route;