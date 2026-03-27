const express = require('express');
const router = express.Router();
const productController = require("./product.controller");
const authMiddleware = require("../middlewares/index");
const upload = require("../middlewares/multer");

router.get("/", authMiddleware, productController.handleGetProducts)
router.put("/:id", authMiddleware, upload.array('images' ,5), productController.updateProduct)
router.post("/create", authMiddleware, upload.array("images", 5), productController.createProduct);
router.delete("/:id", authMiddleware, productController.handleDeleteProduct)



module.exports = router;