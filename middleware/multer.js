const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config();


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    return cb(new Error("Only image, video, and PDF files are allowed"), false);
  }
};


const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,
  acl: "public-read",
  contentType: multerS3.AUTO_CONTENT_TYPE,

  key: (req, file, cb) => {
    try {
      const baseFolder = req.uploadFolder || "others";

      let subFolder = "files";

      if (file.mimetype.startsWith("image")) {
        subFolder = "images";
      } else if (file.mimetype.startsWith("video")) {
        subFolder = "videos";
      } else if (file.mimetype === "application/pdf") {
        subFolder = "pdfs";
      }

      const uniqueName = `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;

      const filePath = `${baseFolder}/${subFolder}/${uniqueName}`;

      cb(null, filePath);
    } catch (err) {
      cb(err);
    }
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, 
  },
});

module.exports = upload;