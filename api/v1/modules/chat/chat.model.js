const pool = require("../../../../config/database");

exports.findConversation = async (customerId, sellerId, productId) => {
    const query = `
        SELECT * FROM public.conversations 
        WHERE customer_id = $1 AND seller_id = $2 AND (product_id = $3 OR (product_id IS NULL AND $3 IS NULL))
        LIMIT 1;
    `;
    const result = await pool.query(query, [customerId, sellerId, productId]);
    return result.rows[0];
};

exports.createConversation = async (customerId, sellerId, productId) => {
    const query = `
        INSERT INTO public.conversations (customer_id, seller_id, product_id)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const result = await pool.query(query, [customerId, sellerId, productId]);
    return result.rows[0];
};

exports.getConversationsByUser = async (userId) => {
    const query = `
        SELECT c.*, 
               u.name as other_user_name, 
               u.email as other_user_email,
               p.title as product_title,
               p.image_url as product_image,
               CASE WHEN c.customer_id = $1 THEN c.customer_unread_count ELSE c.seller_unread_count END as unread_count
        FROM public.conversations c
        INNER JOIN public.users u ON (u.id = CASE WHEN c.customer_id = $1 THEN c.seller_id ELSE c.customer_id END)
        LEFT JOIN public.products p ON p.id = c.product_id
        WHERE c.customer_id = $1 OR c.seller_id = $1
        ORDER BY c.updated_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

exports.getMessagesByConversation = async (conversationId) => {
    const query = `
        SELECT m.*, u.name as sender_name
        FROM public.messages m
        INNER JOIN public.users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC;
    `;
    const result = await pool.query(query, [conversationId]);
    return result.rows;
};

exports.createMessage = async (conversationId, senderId, message, attachmentUrl) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const messageQuery = `
            INSERT INTO public.messages (conversation_id, sender_id, message, attachment_url)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const messageResult = await client.query(messageQuery, [conversationId, senderId, message, attachmentUrl]);
        
        const convRes = await client.query('SELECT customer_id, seller_id FROM public.conversations WHERE id = $1', [conversationId]);
        const conv = convRes.rows[0];
        
        let updateConvQuery;
        if (senderId === conv.customer_id) {
            updateConvQuery = `
                UPDATE public.conversations
                SET last_message = $1, last_message_at = NOW(), updated_at = NOW(), seller_unread_count = seller_unread_count + 1
                WHERE id = $2
            `;
        } else {
            updateConvQuery = `
                UPDATE public.conversations
                SET last_message = $1, last_message_at = NOW(), updated_at = NOW(), customer_unread_count = customer_unread_count + 1
                WHERE id = $2
            `;
        }
        
        await client.query(updateConvQuery, [message, conversationId]);
        
        await client.query('COMMIT');
        return messageResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.markAsRead = async (conversationId, userId) => {
    const query = `
        UPDATE public.messages
        SET is_read = true
        WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false;
    `;
    await pool.query(query, [conversationId, userId]);
    
    // Reset unread count
    const convRes = await pool.query('SELECT customer_id, seller_id FROM public.conversations WHERE id = $1', [conversationId]);
    if (convRes.rows.length > 0) {
        const conv = convRes.rows[0];
        if (userId === conv.customer_id) {
            await pool.query('UPDATE public.conversations SET customer_unread_count = 0 WHERE id = $1', [conversationId]);
        } else if (userId === conv.seller_id) {
            await pool.query('UPDATE public.conversations SET seller_unread_count = 0 WHERE id = $1', [conversationId]);
        }
    }
};

exports.getConversationById = async (id) => {
    const query = `SELECT * FROM public.conversations WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};
