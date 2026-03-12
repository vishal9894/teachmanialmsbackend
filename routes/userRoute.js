const express = require("express");
const { handleSignup, handleLogin, handleGetProfile, handleGetAllProfile, handleRefresh, handleLogout, handleUpdateUsers } = require("../controller/userContrller");
const authMiddleware = require("../middleware/authMiddleware");
const veryfiyRole = require("../middleware/veryfiyRole");

const route = express.Router();

route.post("/signup", handleSignup);
route.post("/login", handleLogin);
route.get("/profile", authMiddleware, handleGetProfile);
route.get("/allusers"   , handleGetAllProfile)
route.post("/refresh", handleRefresh);
route.post("/logout", handleLogout);
route.put("/update/:id" , handleUpdateUsers)


module.exports = route;