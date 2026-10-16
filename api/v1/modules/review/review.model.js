const pool = require('../../../../config/database');

// CREATE REVIEW
exports.createReview = async ({ order_id, user_id, seller_id, product_id, rating, comment, images }) => {
 
    const query = `
        INSERT INTO public.reviews (
            order_id,
            user_id,
            seller_id,
            product_id,
            rating,
            comment,
            images
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;

    const values = [order_id, user_id, seller_id, product_id, rating, comment || null, images || []];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// CHECK ORDER VALID FOR REVIEW
exports.checkOrderForReview = async ({ order_id, user_id, seller_id }) => {
    const query = `
        SELECT 
            o.id,
            o.user_id,
            o.order_status,
            COUNT(oi.id) AS total_items
        FROM public.orders o
        JOIN public.order_items oi ON oi.order_id = o.id
        JOIN public.products p ON p.id = oi.product_id
        WHERE o.id = $1
          AND o.user_id = $2
          AND p.seller_id = $3
        GROUP BY o.id, o.user_id, o.order_status;
    `;

    const result = await pool.query(query, [order_id, user_id, seller_id]);
    return result.rows[0];
};

// CHECK DUPLICATE REVIEW
exports.checkDuplicateReview = async ({ order_id, user_id, seller_id, product_id }) => {
    const query = `
        SELECT id
        FROM public.reviews
        WHERE order_id = $1
          AND user_id = $2
          AND seller_id = $3
          AND product_id = $4
        LIMIT 1;
    `;

    const result = await pool.query(query, [order_id, user_id, seller_id, product_id]);
    return result.rows[0];
};

// GET SELLER REVIEWS
exports.getSellerReviews = async (sellerId) => {
    const query = `
        SELECT
            r.id,
            r.order_id,
            r.user_id,
            r.seller_id,
            r.product_id,
            r.rating,
            r.comment,
            r.images,
            r.seller_reply,
            r.seller_reply_at,
            r.created_at,

            u.name AS user_name,
            u.email AS user_email,

            o.order_number,
            p.title as product_title,
            p.image_url as product_image_url

        FROM public.reviews r
        INNER JOIN public.users u_seller ON u_seller.id = r.seller_id
        LEFT JOIN public.users u ON u.id = r.user_id
        LEFT JOIN public.orders o ON o.id = r.order_id
        LEFT JOIN public.products p ON p.id = r.product_id

        WHERE r.seller_id = $1 AND u_seller.status = 'active'
        ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows;
};

// SELLER RATING SUMMARY
exports.getSellerRatingSummary = async (sellerId) => {
    const query = `
        SELECT
            COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS avg_rating,
            COUNT(*)::int AS total_reviews,
            COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
            COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
            COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
            COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
            COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
        FROM public.reviews r
        INNER JOIN public.users u ON u.id = r.seller_id
        WHERE r.seller_id = $1 AND u.status = 'active';
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows[0];
};

// GET PRODUCT REVIEWS
exports.getProductReviews = async (productId) => {
    const query = `
        SELECT
            r.id,
            r.order_id,
            r.user_id,
            r.seller_id,
            r.rating,
            r.comment,
            r.images,
            r.seller_reply,
            r.seller_reply_at,
            r.created_at,

            u.name AS user_name,
            u.email AS user_email,
            o.order_number

        FROM public.reviews r
        JOIN public.orders o ON o.id = r.order_id
        INNER JOIN public.users u_seller ON u_seller.id = r.seller_id
        LEFT JOIN public.users u ON u.id = r.user_id

        WHERE r.product_id = $1 AND u_seller.status = 'active'
        ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query, [productId]);
    return result.rows;
};

// PRODUCT RATING SUMMARY
exports.getProductRatingSummary = async (productId) => {
    const query = `
        SELECT
            COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float AS avg_rating,
            COUNT(DISTINCT r.id)::int AS total_reviews,
            COUNT(DISTINCT r.id) FILTER (WHERE r.rating = 5)::int AS five_star,
            COUNT(DISTINCT r.id) FILTER (WHERE r.rating = 4)::int AS four_star,
            COUNT(DISTINCT r.id) FILTER (WHERE r.rating = 3)::int AS three_star,
            COUNT(DISTINCT r.id) FILTER (WHERE r.rating = 2)::int AS two_star,
            COUNT(DISTINCT r.id) FILTER (WHERE r.rating = 1)::int AS one_star
        FROM public.reviews r
        JOIN public.order_items oi ON oi.order_id = r.order_id
        JOIN public.products p ON p.id = oi.product_id
        INNER JOIN public.users u ON u.id = p.seller_id
        WHERE oi.product_id = $1 AND r.seller_id = p.seller_id AND u.status = 'active';
    `;

    const result = await pool.query(query, [productId]);
    return result.rows[0];
};

// GET USER REVIEWS
exports.getUserReviews = async (userId) => {
    const query = `
        SELECT
            r.*,
            o.order_number,
            u_seller.name AS business_name
        FROM public.reviews r
        LEFT JOIN public.orders o ON o.id = r.order_id
        LEFT JOIN public.users u_seller ON u_seller.id = r.seller_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
};

// UPDATE REVIEW
exports.updateReview = async ({ reviewId, userId, rating, comment }) => {
    const query = `
        UPDATE public.reviews
        SET rating = $1,
            comment = $2
        WHERE id = $3
          AND user_id = $4
        RETURNING *;
    `;

    const result = await pool.query(query, [rating, comment || null, reviewId, userId]);
    return result.rows[0];
};

// DELETE REVIEW
exports.deleteReview = async (reviewId, userId) => {
    const query = `
        DELETE FROM public.reviews
        WHERE id = $1
          AND user_id = $2
        RETURNING *;
    `;

    const result = await pool.query(query, [reviewId, userId]);
    return result.rows[0];
};

// ADD/UPDATE SELLER REPLY
exports.updateSellerReply = async ({ reviewId, sellerId, reply }) => {
    const query = `
        UPDATE public.reviews
        SET seller_reply = $1,
            seller_reply_at = NOW()
        WHERE id = $2
          AND seller_id = $3
        RETURNING *;
    `;

    const result = await pool.query(query, [reply, reviewId, sellerId]);
    return result.rows[0];
};

// DELETE SELLER REPLY
exports.deleteSellerReply = async (reviewId, sellerId) => {
    const query = `
        UPDATE public.reviews
        SET seller_reply = NULL,
            seller_reply_at = NULL
        WHERE id = $1
          AND seller_id = $2
        RETURNING *;
    `;

    const result = await pool.query(query, [reviewId, sellerId]);
    return result.rows[0];
};