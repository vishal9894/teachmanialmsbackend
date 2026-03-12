const express = require("express");
const { handleCreateSetting, handleGetAllSettings,  handleDeleteSetting, handleCreateRouteSetting, handleGetRoutingAccount, handleDeleteRoutingAccount } = require("../controller/settingController");

const route = express.Router();

route.post("/create-setting" , handleCreateSetting);
route.get("/get-setting" , handleGetAllSettings);
route.delete("/delete-setting/:id" , handleDeleteSetting);
route.post ("/create-routing_account" , handleCreateRouteSetting);
route.get("/get-routing_account" , handleGetRoutingAccount);
route.delete("/delete-routing_account/:id" , handleDeleteRoutingAccount)


module.exports = route