const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateBanner = catchAsync(async (req, res) => {
    const {
        title,
        course,
        redirecttype,
        url_link,
        publish = false,
        type
    } = req.body;

    if (!title || !type) {
        throw new ApiError(400, "Title and type are required");
    }

    const image = req.file?.location;

    const result = await pool.query(
        `INSERT INTO banners
            (title, type, course, redirect_type, url_link, image, publish)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [title, type, course, redirecttype, url_link, image, publish]
    );

    sendResponse(res, {
        statusCode: 201,
        message: `${type} created successfully`,
        data: result.rows[0],
    });
});

const handleGetBanner = catchAsync(async (req, res) => {
    const result = await pool.query(
        "SELECT * FROM banners WHERE type = 'banner' ORDER BY id DESC"
    );

    sendResponse(res, {
        statusCode: 200,
        message: "Banners fetched successfully",
        total: result.rows.length,
        data: result.rows
    });
});

const handleGetNews = catchAsync(async (req, res) => {
    const result = await pool.query(
        "SELECT * FROM banners WHERE type = 'news' ORDER BY id DESC"
    );

    sendResponse(res, {
        statusCode: 200,
        message: "News fetched successfully",
        total: result.rows.length,
        data: result.rows
    });
});

const handleBannerPublish = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { publish } = req.body;

    if (publish === undefined) {
        throw new ApiError(400, "Publish status is required");
    }

    const checkBanner = await pool.query(
        "SELECT * FROM banners WHERE id = $1",
        [id]
    );

    if (checkBanner.rows.length === 0) {
        throw new ApiError(404, "Banner not found");
    }

    const result = await pool.query(
        "UPDATE banners SET publish = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [publish, id]
    );

    sendResponse(res, {
        statusCode: 200,
        message: `Banner ${publish ? "published" : "unpublished"} successfully`,
        data: result.rows[0],
    });
});

const handleUpdateBanner = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Banner ID is required");
    }

    const {
        title,
        course,
        redirecttype,
        url_link,
        type,
        publish,
    } = req.body;

    const checkBanner = await pool.query(
        "SELECT * FROM banners WHERE id = $1",
        [id]
    );

    if (checkBanner.rows.length === 0) {
        throw new ApiError(404, "Banner not found");
    }

    const existingBanner = checkBanner.rows[0];

    let image = existingBanner.image;
    if (req.file && req.file.location) {
        image = req.file.location;
    }

    let publishValue = existingBanner.publish;
    if (publish !== undefined) {
        publishValue = publish === "true" || publish === true;
    }

    const result = await pool.query(
        `UPDATE banners
         SET title = $1,
             course = $2,
             redirect_type = $3,
             url_link = $4,
             type = $5,
             publish = $6,
             image = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
            title || existingBanner.title,
            course || existingBanner.course,
            redirecttype || existingBanner.redirect_type,
            url_link || existingBanner.url_link,
            type || existingBanner.type,
            publishValue,
            image,
            id,
        ]
    );

    sendResponse(res, {
        statusCode: 200,
        message: "Banner updated successfully",
        data: result.rows[0],
    });
});

const handleDeleteBanner = catchAsync(async (req, res) => {
    const { id } = req.params;

    const isMatch = await pool.query(
        "SELECT * FROM banners WHERE id = $1",
        [id]
    );

    if (isMatch.rows.length === 0) {
        throw new ApiError(404, "Banner does not exist");
    }

    const result = await pool.query(
        "DELETE FROM banners WHERE id = $1 RETURNING *",
        [id]
    );

    sendResponse(res, {
        statusCode: 200,
        message: "Banner deleted successfully",
        data: result.rows[0],
    });
});

module.exports = { 
    handleCreateBanner, 
    handleGetBanner, 
    handleBannerPublish, 
    handleUpdateBanner, 
    handleDeleteBanner, 
    handleGetNews 
};