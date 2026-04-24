const pool = require("../../../../config/database");

exports.createNotification = async ({
    user_id,
    seller_id = null,
    type,
    title,
    body,
    ref_id = null,
    ref_type = null,
}) => {
    const query = `
        INSERT INTO public.notifications
        (user_id, seller_id, type, title, body, ref_id, ref_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;

    const values = [user_id, seller_id, type, title, body, ref_id, ref_type];
    const result = await pool.query(query, values);
    return result.rows[0];
};

exports.getNotificationsByUser = async (userId, limit = 10, offset = 0) => {
    const query = `
        SELECT *
        FROM public.notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3;
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
};

exports.getNotificationsBySeller = async (sellerId, limit = 10, offset = 0) => {
    const query = `
        SELECT *
        FROM public.notifications
        WHERE seller_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3;
    `;

    const result = await pool.query(query, [sellerId, limit, offset]);
    return result.rows;
};

exports.getUnreadCountByUser = async (userId) => {
    const query = `
        SELECT COUNT(*)::int AS unread_count
        FROM public.notifications
        WHERE seller_id = $1
          AND is_read = false;
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
};

exports.markAsRead = async (notificationId, userId) => {
    
    const query = `
        UPDATE public.notifications
        SET is_read = true
        WHERE id = $1 AND seller_id = $2
        RETURNING *;
    `;
    console.log("query, [notificationId, userId]", query, [notificationId, userId])
    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0];
};

exports.markAllAsRead = async (userId) => {
    const query = `
        UPDATE public.notifications
        SET is_read = true
        WHERE seller_id = $1
          AND is_read = false
        RETURNING id;
    `;

    const result = await pool.query(query, [userId]);
    return {
        updatedCount: result.rowCount
    };
};

exports.deleteNotification = async (notificationId, userId) => {
    const query = `
        DELETE FROM public.notifications
        WHERE id = $1 AND seller_id = $2
        RETURNING *;
    `;

    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0];
};