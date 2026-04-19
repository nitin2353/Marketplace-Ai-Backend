const pool = require('../../../../config/database');
const { normalizeProductRecords, normalizeProductRecord } = require("../../../../utils/global");




const getAllProducts = async (role = "customer", id = "") => {
    try {
        let query;
        let values = [];

        if (role === "seller") {
            query = `
                SELECT 
                    p.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', v.id,
                                'color', v.color,
                                'size', v.size,
                                'price', v.final_price,
                                'stock', v.stock
                            )
                        ) FILTER (WHERE v.id IS NOT NULL),
                        '[]'
                    ) AS variants
                FROM products p
                LEFT JOIN product_variants v ON v.product_id = p.id
                WHERE p.seller_id = $1
                GROUP BY p.id
                ORDER BY p.created_at DESC;
            `;
            values = [id];
        } else {
            query = `
                SELECT 
                    p.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', v.id,
                                'color', v.color,
                                'size', v.size,
                                'price', v.final_price,
                                'stock', v.stock
                            )
                        ) FILTER (WHERE v.id IS NOT NULL),
                        '[]'
                    ) AS variants
                FROM products p
                LEFT JOIN product_variants v ON v.product_id = p.id
                WHERE p.status = true
                GROUP BY p.id
                ORDER BY p.created_at DESC;
            `;
        }

        const records = await pool.query(query, values);
        return normalizeProductRecords(records.rows);

    } catch (error) {
        console.error("Error fetching products:", error.message);
        throw error;
    }
};
// path apne project structure ke hisab se adjust kar lena

const getProductById = async (id) => {
    try {
        const query = `
            SELECT 
                p.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', v.id,
                            'color', v.color,
                            'size', v.size,
                            'price', v.final_price,
                            'stock', v.stock
                        )
                    ) FILTER (WHERE v.id IS NOT NULL),
                    '[]'
                ) AS variants
            FROM products p
            LEFT JOIN product_variants v ON v.product_id = p.id
            WHERE p.id = $1
            GROUP BY p.id;
        `;

        const records = await pool.query(query, [id]);
        return normalizeProductRecord(records.rows[0]);

    } catch (error) {
        console.error("Error fetching product:", error.message);
        throw error;
    }
};



// ✅ Insert multiple product images
const createProductImages = async (productId, imageUrls, userId) => {
    try {
        if (!productId || !imageUrls || imageUrls.length === 0) {
            throw new Error("Invalid data for product images");
        }

        // 🔥 dynamic query banayenge
        const values = [];
        const placeholders = [];

        imageUrls.forEach((url, index) => {
            const baseIndex = index * 4;

            placeholders.push(
                `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`
            );

            values.push(
                productId,
                url,
                userId,
                userId
            );
        });

        const query = `
            INSERT INTO public.product_image
            (product_id, url, created_by, modified_by)
            VALUES ${placeholders.join(", ")}
            RETURNING *;
        `;

        const result = await pool.query(query, values);

        return result.rows;

    } catch (error) {
        console.error("CREATE PRODUCT IMAGES ERROR:", error);
        throw error;
    }
};

const createProduct = async (data) => {
    try {
        const productQuery = `
            INSERT INTO products (
                seller_id,
                title,
                description,
                base_price,
                is_customizable,
                brand,
                old_price,
                discount,
                stock,
                tag,
                rating,
                reviews,
                sold,
                is_return,
                is_replace,
                return_replace_duration,
                return_replace_instructions,
                image_url,
                category
            )
            VALUES (
                $1,$2,$3,$4,$5,
                $6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,
                $16,$17,$18,$19
            )
            RETURNING *;
        `;

        const productValues = [
            data.userId,
            data.title,
            data.description,
            data.base_price,
            data.is_customizable || false,
            data.brand,
            data.old_price || null,
            data.discount || null,
            data.stock || 0,
            data.tag || null,
            data.rating || 0,
            data.reviews || 0,
            data.sold || 0,
            data.is_return || false,
            data.is_replace || false,
            data.return_replace_duration || null,
            data.return_replace_instructions || null,
            data.imageUrls || [],
            data.category || null
        ];

        const productRes = await pool.query(productQuery, productValues);
        const product = productRes.rows[0];
        if (data.variants && data.variants.length > 0) {

            const variantQuery = `
                INSERT INTO product_variants (
                    color,
                    size,
                    final_price,
                    stock,
                    product_id,
                    old_price,
                    created_by,
                    modified_by,
                    created_time,
                    modified_time
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
            `;

            const queries = JSON.parse(data.variants).map((v) => {
                const variantValues = [
                    v.color || null,
                    v.size || null,
                    v.price || data.base_price,
                    v.stock || 0,
                    product.id,
                    v.old_price || data.old_price,
                    data.userId,
                    data.userId
                ];

                return pool.query(variantQuery, variantValues);
            });

            await Promise.all(queries);
        }

        return product;

    } catch (error) {
        console.error("MODEL CREATE PRODUCT ERROR:", error.message);
        throw error;
    }
};

const modelHandleUpdateProduct = async (data) => {
    try {
        const query = `
            UPDATE public.products SET
                title = $1,
                description = $2,
                base_price = $3,
                is_customizable = $4,
                brand = $5,
                old_price = $6,
                discount = $7,
                tag = $8,
                rating = $9,
                reviews = $10,
                sold = $11,
                stock = $12,
                color = $13,
                is_return = $14,
                is_replace = $15,
                return_replace_duration = $16,
                return_replace_instructions = $17,
                image_url = $18,
                modified_by = $19
            WHERE id = $20
            RETURNING *;
        `;

        const values = [
            data.title,
            data.description,
            data.base_price,
            data.is_customizable || false,
            data.brand,
            data.old_price || null,
            data.discount || null,
            data.tag || null,
            data.rating || 0,
            data.reviews || 0,
            data.sold || 0,
            data.stock,
            data.color || null,
            data.is_return || false,
            data.is_replace || false,
            data.return_replace_duration || null,
            data.return_replace_instructions || null,
            data.image_url || [],
            data.modified_by,
            data.id
        ];

        const result = await pool.query(query, values);

        return result.rows[0];

    } catch (error) {
        console.error("UPDATE PRODUCT ERROR:", error);
        throw error;
    }
};


const deleteById = async (id) => {
    try {
        const query = `
           UPDATE public.products SET status = false
            WHERE id = $1
            RETURNING *;
        `;

        const result = await pool.query(query, [id]);

        return result.rows[0];
    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        throw error;
    }
};


// models/productModel.js

const handleFindByQueryModel = async ({ q, limit, offset }) => {
    const query = `
    SELECT *
    FROM public.products
    WHERE 
    title ILIKE '%' || $1 || '%'
    OR description ILIKE '%' || $1 || '%'
    OR category ILIKE '%' || $1 || '%'
    OR CAST(base_price AS TEXT) ILIKE '%' || $1 || '%'
    ORDER BY created_at DESC
  `;

    const values = [q];

    const result = await pool.query(query, values);

    return result.rows;
};


const handleFindListByQueryModel = async ({ q, limit, offset }) => {
    const query = `
        SELECT DISTINCT keyword FROM (
        SELECT title AS keyword FROM products
        WHERE title ILIKE '%' || $1 || '%'

        UNION

        SELECT category AS keyword FROM products
        WHERE category ILIKE '%' || $1 || '%'
        ) AS suggestions
        LIMIT $2;
  `;

    const values = [q, limit];

    const result = await pool.query(query, values);

    return result.rows;
};



module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    createProductImages,
    modelHandleUpdateProduct,
    deleteById,
    handleFindByQueryModel,
    handleFindListByQueryModel
};