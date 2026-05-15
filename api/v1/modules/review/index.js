const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const reviewController = require("./review.controller");

const upload = require("../middlewares/multer");
const optionalAuth = require("../middlewares/optionalAuth");

router.post("/", authMiddleware, upload.array('images', 5), reviewController.createReview);

router.get("/seller/:sellerId", optionalAuth, reviewController.getSellerReviews);
router.get("/seller/:sellerId/summary", optionalAuth, reviewController.getSellerRatingSummary);

router.get("/product/:productId", optionalAuth, reviewController.getProductReviews);
router.get("/product/:productId/summary", optionalAuth, reviewController.getProductRatingSummary);

router.get("/user/:userId", authMiddleware, reviewController.getUserReviews);

router.patch("/:reviewId", authMiddleware, reviewController.updateReview);
router.delete("/:reviewId", authMiddleware, reviewController.deleteReview);

router.patch("/:reviewId/reply", authMiddleware, reviewController.updateSellerReply);
router.delete("/:reviewId/reply", authMiddleware, reviewController.deleteSellerReply);

module.exports = router;