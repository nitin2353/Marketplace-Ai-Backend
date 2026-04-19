const pool = require('../../../../config/database');
const { normalizeProductRecords } = require('../../../../utils/global');



const getAllWishlist = async (user_id) => {
    try {
        const query = `
            SELECT 
                w.*,
                p.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', v.id,
                            'color', v.color,
                            'size', v.size,
                            'stock', v.stock
                        )
                    ) FILTER (WHERE v.id IS NOT NULL),
                    '[]'::json
                ) AS variants

            FROM public.wishlist w
            INNER JOIN public.products p
                ON p.id = w.product_id
            LEFT JOIN public.product_variants v
                ON v.product_id = p.id
            WHERE w.user_id = $1
            GROUP BY 
                w.id,
                w.user_id,
                w.product_id,
                w.created_time,
                w.modified_time,
                p.id,
                p.title,
                p.description,
                p.base_price,
                p.old_price,
                p.discount,
                p.rating,
                p.reviews,
                p.sold,
                p.brand,
                p.category,
                p.tag,
                p.image_url,
                p.is_customizable,
                p.is_return,
                p.is_replace,
                p.return_replace_duration,
                p.return_replace_instructions,
                p.created_at
            ORDER BY w.created_time DESC;
        `;

        const result = await pool.query(query, [user_id]);

        return normalizeProductRecords(result.rows);
    } catch (error) {
        console.error("GET WISHLIST ERROR:", error.message);
        throw error;
    }
};


const toggleWishlist = async (id, userId) => {
    try {
        const existing = await pool.query(
            `SELECT * FROM wishlist 
             WHERE user_id = $1 AND product_id = $2`,
            [userId, id]
        );


        if (existing.rows.length > 0) {
            await pool.query(
                `DELETE FROM wishlist 
                 WHERE user_id = $1 AND product_id = $2`,
                [userId, id]
            );

            return { message: "Removed from wishlist" };
        }


        const result = await pool.query(
            `INSERT INTO wishlist (
                user_id,
                product_id,
                created_by,
                modified_by,
                created_time,
                modified_time
            )
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING *`,
            [
                userId,
                id,
                userId,
                userId
            ]
        );

        return result.rows[0];

    } catch (error) {
        console.error("CREATE WISHLIST ERROR:", error.message);
        throw error;
    }
};
const removeAllWishlist = async (userId) => {
    try {

        await pool.query(
            `DELETE FROM wishlist 
                 WHERE user_id = $1`,
            [userId]
        );

        return { message: "Removed from wishlist" };
    }
    catch (error) {
        console.error("CREATE WISHLIST ERROR:", error.message);
        throw error;
    }
};




module.exports = {
    getAllWishlist,
    toggleWishlist,
    removeAllWishlist
};