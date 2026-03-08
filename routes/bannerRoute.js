const express = require("express");
const { handleCreateBanner, handleGetBanner, handleBannerPublish, handleUpdateBanner, handleDeleteBanner, handleGetNews } = require("../controller/bannerController");
const upload = require("../middleware/multer");


const route = express.Router();

route.post("/create-banner", upload.single("image"), handleCreateBanner)
route.get("/get-banner", handleGetBanner);
route.get("/get-news", handleGetNews);
route.put("/publish-banner/:id", handleBannerPublish)
route.put("/update-banner/:id", handleUpdateBanner)
route.delete("/delete-banner/:id", handleDeleteBanner)


module.exports = route;