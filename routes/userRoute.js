const express = require("express");
const { HandleSignup, HandleLogin, HandleGetProfile, HandleGetAllProfile, HandleRefresh, HandleLogout } = require("../controller/userContrller");
const authMiddleware = require("../middleware/authMiddleware");
const veryfiyRole = require("../middleware/veryfiyRole");

const route = express.Router();

route.post("/signup", HandleSignup);
route.post("/login", HandleLogin);
route.get("/profile", authMiddleware, HandleGetProfile);
route.get("/allusers" , authMiddleware  , HandleGetAllProfile)
route.post("/refresh", HandleRefresh);
route.post("/logout", HandleLogout);


module.exports = route;