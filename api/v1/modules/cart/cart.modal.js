const pool = require('../../../../config/database');

const getAllCart = async (user_id) => {
    try {
        const result = await pool.query(
            `SELECT 
            c.id AS cart_id,
            c.total_quantity,
            c.amount,
            c.created_time,
            c.product_price,

            p.id AS product_id,
            p.title,
            p.base_price,
            p.image_url,
            p.brand,
            p.stock As product_avl_stock,

            v.id AS variant_id,
            v.color,
            v.size,
            v.final_price,
            v.stock As available_stock

        FROM public.cart c

        INNER JOIN public.products p 
            ON p.id = c.product_id
            AND p.status = true  

        LEFT JOIN public.product_variants v
            ON v.id = c.variant_id

        WHERE c.user_id = $1

        ORDER BY c.created_time DESC`,
            [user_id]
        );

        return result.rows;
    } catch (error) {
        console.error("GET CART ERROR:", error.message);
        throw error;
    }
};


// ✅ UPDATE CART
const updateCart = async (quantity, cartId, userId) => {
    try {

        // 🔥 Step 1: Get variant price
        const cartData = await pool.query(
            `SELECT 
                c.variant_id,
                v.final_price,
                p.base_price
             FROM public.cart c
             LEFT JOIN public.product_variants v 
                ON v.id = c.variant_id
             INNER JOIN public.products p
                ON p.id = c.product_id
             WHERE c.id = $1 AND c.user_id = $2`,
            [cartId, userId]
        );

        if (cartData.rows.length === 0) {
            throw new Error("Cart item not found");
        }

        const item = cartData.rows[0];

        const price = item.final_price || item.base_price;

        const result = await pool.query(
            `UPDATE public.cart 
             SET total_quantity = $1,
                 modified_by = $2,
                 modified_time = CURRENT_TIMESTAMP
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [
                quantity,
                userId,
                cartId,
                userId
            ]
        );

        return result.rows[0];

    } catch (error) {
        console.error("UPDATE CART ERROR:", error.message);
        throw error;
    }
};


const createCart = async (payload, userId) => {
    try {
        const quantity = payload.total_quantity || 1;
        const variantId = payload?.variant_id || null;
        const productId = payload.product_id;
        const product_price = payload.product_price;

        let price = 0;

        if (variantId) {
            const variantRes = await pool.query(
                `SELECT final_price, stock 
                 FROM product_variants 
                 WHERE id = $1`,
                [variantId]
            );

            if (variantRes.rows.length === 0) {
                throw new Error("Variant not found");
            }

            price = variantRes.rows[0].final_price;

        } else {
            const productRes = await pool.query(
                `SELECT base_price 
                 FROM products 
                 WHERE id = $1`,
                [productId]
            );

            if (productRes.rows.length === 0) {
                throw new Error("Product not found");
            }

            price = productRes.rows[0].base_price;
        }


        const existing = await pool.query(
            `SELECT * FROM cart 
            WHERE user_id = $1 
            AND product_id = $2
            AND variant_id IS NOT DISTINCT FROM $3`,
            [userId, productId, variantId]
        );
        if (existing.rows.length > 0) {
            const updated = await pool.query(
                `UPDATE cart
                SET total_quantity = total_quantity + $1,
                    amount = amount + $2,
                    modified_by = $3,
                    product_price = $4,
                    modified_time = CURRENT_TIMESTAMP
                WHERE user_id = $5 
                AND product_id = $6
                AND variant_id IS NOT DISTINCT FROM $7
                RETURNING *`,
                [
                    quantity,
                    price * quantity,
                    userId,
                    product_price || price,
                    userId,
                    productId,
                    variantId   // can be null safely ✅
                ]
            );

            return updated.rows[0];
        }


        const result = await pool.query(
            `INSERT INTO cart (
                user_id,
                product_id,
                variant_id,
                total_quantity,
                product_price,
                amount,
                created_by, 
                modified_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                userId,
                productId,
                variantId,
                quantity,
                product_price || price,
                price * quantity,
                userId,
                userId
            ]
        );

        return result.rows[0];

    } catch (error) {
        console.error("CREATE CART ERROR:", error.message);
        throw error;
    }
};


const deleteCart = async (cartId, userId) => {
    try {
        const result = await pool.query(
            `DELETE FROM public.cart 
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [cartId, userId]
        );

        return result.rows[0];
    } catch (error) {
        console.error("DELETE CART ERROR:", error.message);
        throw error;
    }
};

const deleteCartAll = async (userId) => {
    try {
        const result = await pool.query(
            `DELETE FROM public.cart where user_id = $1`,
            [userId]
        );

        return result.rows[0];
    } catch (error) {
        console.error("DELETE CART ERROR:", error.message);
        throw error;
    }
};


module.exports = {
    getAllCart,
    updateCart,
    createCart,
    deleteCart,
    deleteCartAll
};