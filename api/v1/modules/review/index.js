const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");
const reviewController = require("./review.controller");

router.post("/", authMiddleware, reviewController.createReview);

router.get("/seller/:sellerId", authMiddleware, reviewController.getSellerReviews);
router.get("/seller/:sellerId/summary", authMiddleware, reviewController.getSellerRatingSummary);

router.get("/product/:productId", authMiddleware, reviewController.getProductReviews);
router.get("/product/:productId/summary", authMiddleware, reviewController.getProductRatingSummary);

router.get("/user/:userId", authMiddleware, reviewController.getUserReviews);

router.patch("/:reviewId", authMiddleware, reviewController.updateReview);
router.delete("/:reviewId/user/:userId", authMiddleware, reviewController.deleteReview);

module.exports = router;