const reviewService = require("./review.service");

exports.createReview = async (req, res) => {
    try {
        const data = await reviewService.createReview(req.body, req);

        return res.status(201).json({
            success: true,
            message: "Review created successfully",
            data
        });
    } catch (error) {
        console.error("createReview error:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getSellerReviews = async (req, res) => {
    try {
        const data = await reviewService.getSellerReviews(req.params.sellerId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getSellerReviews error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getSellerRatingSummary = async (req, res) => {
    try {
        const data = await reviewService.getSellerRatingSummary(req.params.sellerId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getSellerRatingSummary error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getProductReviews = async (req, res) => {
    try {
        const data = await reviewService.getProductReviews(req.params.productId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getProductReviews error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getProductRatingSummary = async (req, res) => {
    try {
        const data = await reviewService.getProductRatingSummary(req.params.productId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getProductRatingSummary error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getUserReviews = async (req, res) => {
    try {
        const data = await reviewService.getUserReviews(req.params.userId);

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("getUserReviews error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateReview = async (req, res) => {
    try {
        const data = await reviewService.updateReview({
            reviewId: req.params.reviewId,
            userId: req.body.user_id,
            rating: req.body.rating,
            comment: req.body.comment
        });

        return res.json({
            success: true,
            message: "Review updated successfully",
            data
        });
    } catch (error) {
        console.error("updateReview error:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const data = await reviewService.deleteReview(
            req.params.reviewId,
            req.params.userId
        );

        return res.json({
            success: true,
            message: "Review deleted successfully",
            data
        });
    } catch (error) {
        console.error("deleteReview error:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};