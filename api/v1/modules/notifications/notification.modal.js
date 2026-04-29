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
        (user_id, seller_id, receiver_id, receiver_type, type, title, body, ref_id, ref_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;

    const receiver_id = user_id || seller_id;
    const receiver_type = user_id ? 'user' : 'seller';

    const values = [user_id, seller_id, receiver_id, receiver_type, type, title, body, ref_id, ref_type];
    const result = await pool.query(query, values);
    return result.rows[0];
};

exports.getNotificationsByUser = async (userId, limit = 10, offset = 0) => {
    const query = `
        SELECT n.*
        FROM public.notifications n
        INNER JOIN public.users u ON u.id = n.user_id
        WHERE n.user_id = $1 AND u.status = 'active'
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3;
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
};

exports.getNotificationsBySeller = async (sellerId, limit = 10, offset = 0) => {
    const query = `
        SELECT n.*
        FROM public.notifications n
        INNER JOIN public.users u ON u.id = n.seller_id
        WHERE n.seller_id = $1 AND u.status = 'active'
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3;
    `;

    const result = await pool.query(query, [sellerId, limit, offset]);
    return result.rows;
};

exports.getUnreadCountByUser = async (userId) => {
    const query = `
        SELECT COUNT(*)::int AS unread_count
        FROM public.notifications
        WHERE (user_id = $1 OR seller_id = $1)
          AND is_read = false;
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
};

exports.markAsRead = async (notificationId, userId) => {
    
    const query = `
        UPDATE public.notifications
        SET is_read = true
        WHERE id = $1 AND (user_id = $2 OR seller_id = $2)
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
        WHERE (user_id = $1 OR seller_id = $1)
          AND is_read = false
        RETURNING id;
    `;

    const result = await pool.query(query, [userId]);
    return {
        updatedCount: result.rowCount
    };
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

exports.deleteNotification = async (notificationId, userId) => {
    const query = `
        DELETE FROM public.notifications
        WHERE id = $1 AND (user_id = $2 OR seller_id = $2 OR receiver_id = $2)
        RETURNING *;
    `;

    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0];
};