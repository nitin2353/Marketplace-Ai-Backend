const reviewModel = require("./review.model");

exports.createReview = async (payload, req) => {
    const { order_id, seller_id, product_id, rating } = payload;
    const user_id = req.user?.id;

    if (!order_id) throw new Error("order_id is required");
    if (!user_id) throw new Error("user_id is required");
    if (!seller_id) throw new Error("seller_id is required");
    if (!product_id) throw new Error("product_id is required");

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        throw new Error("Rating must be between 1 and 5");
    }

    const order = await reviewModel.checkOrderForReview({
        order_id,
        user_id,
        seller_id
    });

    if (!order) {
        throw new Error("Order not found for this user and seller");
    }

    if (!["delivered", "completed"].includes(order.order_status)) {
        throw new Error("Review allowed only after order delivery");
    }
    const duplicate = await reviewModel.checkDuplicateReview({
        order_id,
        user_id,
        seller_id,
        product_id
    });

    if (duplicate) {
        throw new Error("Review already submitted for this product");
    }

    return await reviewModel.createReview({
        ...payload,
        user_id, // Source of truth
        rating: ratingNum
    });
};

exports.getSellerReviews = async (sellerId) => {
    return await reviewModel.getSellerReviews(sellerId);
};

exports.getSellerRatingSummary = async (sellerId) => {
    return await reviewModel.getSellerRatingSummary(sellerId);
};

exports.getProductReviews = async (productId) => {
    return await reviewModel.getProductReviews(productId);
};

exports.getProductRatingSummary = async (productId) => {
    return await reviewModel.getProductRatingSummary(productId);
};

exports.getUserReviews = async (userId) => {
    return await reviewModel.getUserReviews(userId);
};

exports.updateReview = async (payload, req) => {
    const { order_id, seller_id, rating } = payload;
    const user_id = req.user?.id;

    const ratingNum = Number(payload.rating);

    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        throw new Error("Rating must be between 1 and 5");
    }

    const result = await reviewModel.updateReview({
        ...payload,
        rating: ratingNum
    });

    if (!result) throw new Error("Review not found or unauthorized");

    return result;
};

exports.deleteReview = async (reviewId, userId) => {
    const result = await reviewModel.deleteReview(reviewId, userId);

    if (!result) throw new Error("Review not found or unauthorized");

    return result;
};