const express = require('express');
const router = express.Router();
const globalController = require("./global.controller");
const upload = require("../middlewares/multer");

router.post("/upload-images", upload.array("images", 5), globalController.uploadImages);

module.exports = router;