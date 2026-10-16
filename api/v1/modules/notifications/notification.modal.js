const pool = require("../../../../config/database");

exports.createNotification = async ({
    receiver_id,
    receiver_type,
    type,
    title,
    body,
    ref_type = null,
    ref_id = null
}) => {
    // Both user_id and seller_id fields exist in DB. user_id is NOT NULL.
    // Since users table is the single source for customer and seller, receiver_id is always a user.
    // We map receiver_id to user_id to satisfy the NOT NULL constraint, and also set receiver_id explicitly.
    const query = `
        INSERT INTO public.notifications
        (user_id, seller_id, receiver_id, receiver_type, type, title, body, ref_id, ref_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;

    const seller_id = receiver_type === 'seller' ? receiver_id : null;
    
    const values = [receiver_id, seller_id, receiver_id, receiver_type, type, title, body, ref_id, ref_type];
    const result = await pool.query(query, values);
    return result.rows[0];
};

exports.getNotificationsByReceiver = async (receiverId, limit = 10, offset = 0) => {
    const query = `
        SELECT n.*
        FROM public.notifications n
        WHERE n.receiver_id = $1
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3;
    `;
    const result = await pool.query(query, [receiverId, limit, offset]);
    return result.rows;
};

exports.getUnreadCountByReceiver = async (receiverId) => {
    const query = `
        SELECT COUNT(*)::int AS unread_count
        FROM public.notifications
        WHERE receiver_id = $1
          AND is_read = false;
    `;
    const result = await pool.query(query, [receiverId]);
    return result.rows[0];
};

exports.markAsRead = async (notificationId, receiverId) => {
    const query = `
        UPDATE public.notifications
        SET is_read = true
        WHERE id = $1 AND receiver_id = $2
        RETURNING *;
    `;
    const result = await pool.query(query, [notificationId, receiverId]);
    return result.rows[0];
};

exports.markAllAsRead = async (receiverId) => {
    const query = `
        UPDATE public.notifications
        SET is_read = true
        WHERE receiver_id = $1
          AND is_read = false
        RETURNING id;
    `;
    const result = await pool.query(query, [receiverId]);
    return {
        updatedCount: result.rowCount
    };
};

exports.deleteNotification = async (notificationId, receiverId) => {
    const query = `
        DELETE FROM public.notifications
        WHERE id = $1 AND receiver_id = $2
        RETURNING *;
    `;
    const result = await pool.query(query, [notificationId, receiverId]);
    return result.rows[0];
};