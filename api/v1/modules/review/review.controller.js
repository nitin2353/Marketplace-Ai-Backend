const reviewService = require("./review.service");
const notificationTriggers = require("../notifications/notification.trigger");
const UTILS = require('../../../../utils/global');

exports.createReview = async (req, res) => {
    try {
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadResults = await UTILS.uploadMultiple(req.files);
            imageUrls = uploadResults.map(file => file.url);
        }

        const payload = { ...req.body, images: imageUrls };
        const data = await reviewService.createReview(payload, req);

        notificationTriggers.onReviewCreated(data.id).catch(console.error);

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
            rating: req.body.rating,
            comment: req.body.comment
        }, req);

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
            req.user.id
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

exports.updateSellerReply = async (req, res) => {
    try {
        const data = await reviewService.updateSellerReply({
            reviewId: req.params.reviewId,
            reply: req.body.reply
        }, req);

        // TRIGGER NOTIFICATION
        notificationTriggers.onReviewReplied(req.params.reviewId).catch(console.error);

        return res.json({
            success: true,
            message: "Reply updated successfully",
            data
        });
    } catch (error) {
        console.error("updateSellerReply error:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteSellerReply = async (req, res) => {
    try {
        const data = await reviewService.deleteSellerReply(
            req.params.reviewId,
            req
        );

        return res.json({
            success: true,
            message: "Reply deleted successfully",
            data
        });
    } catch (error) {
        console.error("deleteSellerReply error:", error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};