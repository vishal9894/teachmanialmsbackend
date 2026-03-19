const express = require("express");
const { handleCreateAdmin, handleLoginAdmin, handleGetAdmin, handleGetAllAdmin, handleUpdateAdmin, handleDeleteAdmin } = require("../controller/adminController");
const authAdmin = require("../middleware/authAdmin");
const upload = require("../middleware/multer");


const route = express.Router();
route.post("/login", handleLoginAdmin)
route.post("/create" , upload.single("image") , handleCreateAdmin);
route.get("/profile" ,authAdmin , handleGetAdmin);
route.get("/all-admin" , handleGetAllAdmin);
route.put("/update/:id" , upload.single("image"), handleUpdateAdmin );
route.delete("/delete/:id" , handleDeleteAdmin)



module.exports = route;