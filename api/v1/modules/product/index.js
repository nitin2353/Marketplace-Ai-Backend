const express = require('express');
const router = express.Router();
const productController = require("./product.controller");
const authMiddleware = require("../middlewares/index");
const optionalAuth = require("../middlewares/optionalAuth");
const upload = require("../middlewares/multer");

router.get("/", optionalAuth, productController.handleGetProducts)
router.get("/category-sections", productController.handleGetCategorySections)


router.get("/search", optionalAuth, productController.handleFindByQuery)
router.get("/suggest", optionalAuth, productController.handleFindListByQuery)
router.get("/:id", authMiddleware, productController.handleGetProductById)
router.put("/:id", authMiddleware, upload.array('images' ,5), productController.updateProduct)
router.post("/create", authMiddleware, upload.array("images", 5), productController.createProduct);
router.delete("/:id", authMiddleware, productController.handleDeleteProduct)



module.exports = router;