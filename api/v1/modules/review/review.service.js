const reviewModel = require("./review.model");

exports.createReview = async (payload, req) => {
    const { order_id, seller_id, product_id, rating, comment, images } = payload;
    const user_id = req.user?.id;

    if (!order_id) throw new Error("order_id is required");
    if (!user_id) throw new Error("user_id is required");
    if (!seller_id) throw new Error("seller_id is required");
    if (!product_id) throw new Error("product_id is required");

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        throw new Error("Rating must be between 1 and 5");
    }

    // Validate images (max 5)
    const imagesArray = Array.isArray(images) ? images : [];
    if (imagesArray.length > 5) {
        throw new Error("Maximum 5 images allowed for review");
    }

    // Verify order exists, belongs to user, and is delivered
    const order = await reviewModel.checkOrderForReview({
        order_id,
        user_id,
        seller_id
    });

    if (!order) {
        throw new Error("Order not found or you don't have permission to review this order");
    }

    if (!["delivered", "completed"].includes(order.order_status)) {
        throw new Error("Review allowed only after order delivery");
    }

    // Verify product exists in that order
    const pool = require("../../../../config/database");
    const itemCheck = await pool.query(
        "SELECT id FROM public.order_items WHERE order_id = $1 AND product_id = $2",
        [order_id, product_id]
    );
    if (itemCheck.rows.length === 0) {
        throw new Error("Product not found in this order");
    }

    // Verify seller_id matches product.seller_id
    const productCheck = await pool.query(
        "SELECT seller_id FROM public.products WHERE id = $1",
        [product_id]
    );
    if (productCheck.rows.length === 0 || productCheck.rows[0].seller_id !== seller_id) {
        throw new Error("Invalid seller for this product");
    }

    const duplicate = await reviewModel.checkDuplicateReview({
        order_id,
        user_id,
        seller_id,
        product_id
    });

    if (duplicate) {
        throw new Error("Review already submitted for this product in this order");
    }

    return await reviewModel.createReview({
        order_id,
        user_id,
        seller_id,
        product_id,
        rating: ratingNum,
        comment,
        images: imagesArray
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

exports.updateSellerReply = async (payload, req) => {
    const { reviewId, reply } = payload;
    const sellerId = req.user?.id;

    if (!reviewId) throw new Error("reviewId is required");
    if (!sellerId) throw new Error("sellerId is required");

    const result = await reviewModel.updateSellerReply({
        reviewId,
        sellerId,
        reply
    });

    if (!result) throw new Error("Review not found or you are not authorized to reply");

    return result;
};

exports.deleteSellerReply = async (reviewId, req) => {
    const sellerId = req.user?.id;

    if (!reviewId) throw new Error("reviewId is required");
    if (!sellerId) throw new Error("sellerId is required");

    const result = await reviewModel.deleteSellerReply(reviewId, sellerId);

    if (!result) throw new Error("Review not found or you are not authorized");

    return result;
};