const express = require('express');
const router = express.Router();
const WishlistController = require("./wishilist.controller");
const authMiddleware = require("../middlewares/index");

router.get("/", authMiddleware, WishlistController.handleGetWishlist);
router.post("/toogle", authMiddleware, WishlistController.handleToogleWishlist);
router.get("/remove/all", authMiddleware, WishlistController.handleRemoveWishlistAll);



module.exports = router;