const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isProfilePic = req.originalUrl.includes("profile");
        const uploadPath = isProfilePic ? process.env.USER_PROFILE_PATH : process.env.filepath;

        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const userId = req.user?.id;
        const ext = path.extname(file.originalname);
        const safeName = `${userId}${ext}`;
        cb(null, safeName);
    },
});

const upload = multer({ storage });
module.exports = upload;