const express = require("express");
const { HandleCreateBanner, HandleGetBanner, HandleBannerPublish, HandleUpdateBanner, HandleDeleteBanner, HandleGetNews } = require("../controller/bannerController");
const upload = require("../middleware/multer");


const route = express.Router();

route.post("/create-banner", upload.single("image"), HandleCreateBanner)
route.get("/get-banner", HandleGetBanner);
route.get("/get-news", HandleGetNews);
route.put("/publish-banner/:id", HandleBannerPublish)
route.put("/update-banner/:id", HandleUpdateBanner)
route.delete("/delete-banner/:id", HandleDeleteBanner)


module.exports = route;