const pool = require('../../../../config/database');
const { normalizeProductRecords, normalizeProductRecord } = require("../../../../utils/global");
const { parseBoolean } = require("../../../../utils/global");



const getAllProducts = async (role = "customer", id = "") => {
    try {
        let query;
        let values = [];

        if (role === "seller") {
            query = `
               SELECT 
                    p.*,
                    (
                        SELECT COALESCE(SUM(oi.quantity), 0)::integer
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE oi.product_id = p.id
                        AND o.order_status NOT IN ('cancelled', 'payment_failed')
                    ) AS actual_sold,

                    (
                        SELECT COALESCE(SUM(oi.line_total), 0)::numeric
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE oi.product_id = p.id
                        AND o.order_status NOT IN ('cancelled', 'payment_failed')
                    ) AS actual_revenue,

                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', v.id,
                                'color', v.color,
                                'size', v.size,
                                'price', v.final_price,
                                'stock', v.stock,
                                'old_price', v.old_price
                            )
                        ) FILTER (WHERE v.id IS NOT NULL),
                        '[]'
                    ) AS variants

                FROM products p
                LEFT JOIN product_variants v
                    ON v.product_id = p.id

                WHERE p.seller_id = $1
                AND (
                    p.status = 'true'
                    OR p.status = '1'
                    OR p.status = 'active'
                )

                GROUP BY p.id
                ORDER BY p.created_at DESC;
            `;
            values = [id];
        } else {
            query = `
                SELECT 
                    p.*,
                    (
                        SELECT COALESCE(SUM(oi.quantity), 0)::integer
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE oi.product_id = p.id AND o.order_status NOT IN ('cancelled', 'payment_failed')
                    ) AS actual_sold,
                    (
                        SELECT COALESCE(SUM(oi.line_total), 0)::numeric
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE oi.product_id = p.id AND o.order_status NOT IN ('cancelled', 'payment_failed')
                    ) AS actual_revenue,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', v.id,
                                'color', v.color,
                                'size', v.size,
                                'price', v.final_price,
                                'stock', v.stock,
                                'old_price', v.old_price
                            )
                        ) FILTER (WHERE v.id IS NOT NULL),
                        '[]'
                    ) AS variants
                FROM products p
                INNER JOIN users u ON u.id = p.seller_id
                LEFT JOIN product_variants v ON v.product_id = p.id
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
                (
                    SELECT COALESCE(SUM(oi.quantity), 0)::integer
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = p.id AND o.order_status NOT IN ('cancelled', 'payment_failed')
                ) AS actual_sold,
                (
                    SELECT COALESCE(SUM(oi.line_total), 0)::numeric
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = p.id AND o.order_status NOT IN ('cancelled', 'payment_failed')
                ) AS actual_revenue,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', v.id,
                            'color', v.color,
                            'size', v.size,
                            'price', v.final_price,
                            'stock', v.stock,
                            'old_price', v.old_price
                        )
                    ) FILTER (WHERE v.id IS NOT NULL),
                    '[]'
                ) AS variants
            FROM products p
            INNER JOIN users u ON u.id = p.seller_id
            LEFT JOIN product_variants v ON v.product_id = p.id
            WHERE p.id = $1 AND u.status = 'active'
            GROUP BY p.id;
        `;

        const records = await pool.query(query, [id]);
        const record = records.rows[0];
        if (record && record.actual_sold !== undefined) {
            record.sold = Number(record.actual_sold);
        }
        return normalizeProductRecord(record);

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
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const parseBoolean = (value, defaultValue = false) => {
            if (value === undefined || value === null || value === "") return defaultValue;
            if (typeof value === "boolean") return value;
            if (typeof value === "string") return value.toLowerCase() === "true";
            return Boolean(value);
        };

        const parseNumber = (value, defaultValue = null) => {
            if (value === undefined || value === null || value === "") return defaultValue;
            const num = Number(value);
            return Number.isNaN(num) ? defaultValue : num;
        };

        const parseJSON = (value, defaultValue = null) => {
            if (!value) return defaultValue;
            if (typeof value === "object") return value;
            try {
                return JSON.parse(value);
            } catch {
                return defaultValue;
            }
        };

        const imageUrls =
            Array.isArray(data.imageUrls)
                ? data.imageUrls
                : parseJSON(data.imageUrls, []);

        const variants =
            Array.isArray(data.variants)
                ? data.variants
                : parseJSON(data.variants, []);

        const customizationFields = parseJSON(data.customization_fields, null);

        const productQuery = `
            INSERT INTO public.products (
                seller_id,
                title,
                description,
                brand,
                category,
                tag,

                base_price,
                old_price,
                discount,

                tax_percentage,
                tax_inclusive,

                stock,
                min_stock_alert,

                weight,
                length,
                width,
                height,

                delivery_days,
                is_cod_available,
                is_free_delivery,

                image_url,

                is_customizable,
                customization_type,
                customization_fields,

                is_return,
                is_replace,
                return_replace_duration,
                return_replace_instructions,

                slug,
                meta_title,
                meta_description,

                sold,
                views,
                clicks,
                wishlist_count,
                cart_count,

                status,
                created_by,
                modified_by,
                created_at,
                modified_time
            )
            VALUES (
                $1,  $2,  $3,  $4,  $5,  $6,
                $7,  $8,  $9,
                $10, $11,
                $12, $13,
                $14, $15, $16, $17,
                $18, $19, $20,
                $21,
                $22, $23, $24,
                $25, $26, $27, $28,
                $29, $30, $31,
                $32, $33, $34, $35, $36, $37, $38,
                $39, NOW(), NOW()
            )
            RETURNING *;
        `;

        const productValues = [
            data.userId,
            data.title?.trim(),
            data.description || null,
            data.brand || null,
            data.category || null,
            data.tag || null,

            parseNumber(data.base_price, 0),
            parseNumber(data.old_price, null),
            parseNumber(data.discount, 0),

            parseNumber(data.tax_percentage, 0),
            parseBoolean(data.tax_inclusive, true),

            parseNumber(data.stock, 0),
            parseNumber(data.min_stock_alert, 5),

            parseNumber(data.weight, null),
            parseNumber(data.length, null),
            parseNumber(data.width, null),
            parseNumber(data.height, null),

            parseNumber(data.delivery_days, null),
            parseBoolean(data.is_cod_available, true),
            parseBoolean(data.is_free_delivery, false),

            imageUrls,

            parseBoolean(data.is_customizable, false),
            data.customization_type || null,
            customizationFields,

            parseBoolean(data.is_return, false),
            parseBoolean(data.is_replace, false),
            parseNumber(data.return_replace_duration, null),
            data.return_replace_instructions || null,

            data.slug || null,
            data.meta_title || null,
            data.meta_description || null,

            parseNumber(data.sold, 0),
            parseNumber(data.views, 0),
            parseNumber(data.clicks, 0),
            parseNumber(data.wishlist_count, 0),
            parseNumber(data.cart_count, 0),

            parseBoolean(data.status === "active" || data.status === "true" || data.status === true, true),
            data.userId || null,
            data.userId || null
        ];


        const productRes = await client.query(productQuery, productValues);
        const product = productRes.rows[0];

        if (variants.length > 0) {
            const variantQuery = `
                INSERT INTO public.product_variants (
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
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                RETURNING *;
            `;

            for (const v of variants) {
                const variantValues = [
                    v.color || null,
                    v.size || null,
                    parseNumber(v.final_price ?? v.price, parseNumber(data.base_price, 0)),
                    parseNumber(v.stock, 0),
                    product.id,
                    parseNumber(v.old_price, parseNumber(data.old_price, null)),
                    data.userId || null,
                    data.userId || null
                ];

                await client.query(variantQuery, variantValues);
            }

            await client.query(
                `UPDATE public.products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = $1) WHERE id = $1`,
                [product.id]
            );
        }

        await client.query("COMMIT");

        const finalProductRes = await pool.query(
            "SELECT p.*, COALESCE(json_agg(v.*) FILTER (WHERE v.id IS NOT NULL), '[]') as variants FROM products p LEFT JOIN product_variants v ON v.product_id = p.id WHERE p.id = $1 GROUP BY p.id",
            [product.id]
        );
        return finalProductRes.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("MODEL CREATE PRODUCT ERROR:", error.message);
        throw error;
    } finally {
        client.release();
    }
};

const modelHandleUpdateProduct = async (data) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

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
                stock = $9,
                min_stock_alert = $10,
                tax_percentage = $11,
                tax_inclusive = $12,
                weight = $13,
                length = $14,
                width = $15,
                height = $16,
                delivery_days = $17,
                is_cod_available = $18,
                is_free_delivery = $19,
                is_return = $20,
                is_replace = $21,
                return_replace_duration = $22,
                return_replace_instructions = $23,
                image_url = $24,
                customization_type = $25,
                customization_fields = $26,
                slug = $27,
                meta_title = $28,
                meta_description = $29,
                status = $30,
                category = $31,
                modified_by = $32,
                modified_time = NOW()
            WHERE id = $33
            RETURNING *;
        `;

        const values = [
            data.title,
            data.description,
            data.base_price,
            data.is_customizable || false,
            data.brand,
            data.old_price || null,
            data.discount || 0,
            data.tag || null,
            data.stock || 0,
            data.min_stock_alert || 5,
            data.tax_percentage || 0,
            data.tax_inclusive ?? true,
            data.weight || null,
            data.length || null,
            data.width || null,
            data.height || null,
            data.delivery_days || null,
            data.is_cod_available ?? true,
            data.is_free_delivery ?? false,
            data.is_return || false,
            data.is_replace || false,
            data.return_replace_duration || null,
            data.return_replace_instructions || null,
            data.image_url || [],
            data.customization_type || null,
            data.customization_fields || null,
            data.slug || null,
            data.meta_title || null,
            data.meta_description || null,
            data.status || true,
            data.category || null,
            data.modified_by,
            data.id
        ];

        const result = await client.query(query, values);
        const product = result.rows[0];

        if (!product) {
            await client.query("ROLLBACK");
            return null;
        }

        const variants = Array.isArray(data.variants) ? data.variants : [];

        // Simple and safe strategy: delete old variants, insert fresh variants
        await client.query(
            `DELETE FROM public.product_variants WHERE product_id = $1`,
            [data.id]
        );

        if (variants.length > 0) {
            const variantQuery = `
                INSERT INTO public.product_variants (
                    color,
                    size,
                    final_price,
                    stock,
                    created_by,
                    modified_by,
                    created_time,
                    modified_time,
                    product_id,
                    old_price
                )
                VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),$7,$8)
                RETURNING *;
            `;

            for (const v of variants) {
                await client.query(variantQuery, [
                    v.color || null,
                    v.size || null,
                    Number(v.final_price ?? v.price ?? data.base_price ?? 0),
                    Number(v.stock ?? 0),
                    data.modified_by,
                    data.modified_by,
                    data.id,
                    v.old_price ? Number(v.old_price) : null
                ]);
            }

            await client.query(
                `UPDATE public.products SET stock = (SELECT COALESCE(SUM(stock), 0) FROM public.product_variants WHERE product_id = $1) WHERE id = $1`,
                [data.id]
            );
        }

        await client.query("COMMIT");

        return await getProductById(data.id);

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("UPDATE PRODUCT ERROR:", error);
        throw error;
    } finally {
        client.release();
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
    SELECT p.*
    FROM public.products p
    INNER JOIN users u ON u.id = p.seller_id
    WHERE u.status = 'active' AND (
    p.title ILIKE '%' || $1 || '%'
    OR p.description ILIKE '%' || $1 || '%'
    OR p.category ILIKE '%' || $1 || '%'
    OR CAST(p.base_price AS TEXT) ILIKE '%' || $1 || '%'
    )
    ORDER BY p.created_at DESC
  `;

    const values = [q];

    const result = await pool.query(query, values);

    return result.rows;
};


const handleFindListByQueryModel = async ({ q, limit, offset }) => {
    const query = `
        SELECT DISTINCT keyword FROM (
        SELECT title AS keyword FROM products p INNER JOIN users u ON u.id = p.seller_id WHERE u.status = 'active' AND title ILIKE '%' || $1 || '%'
        UNION
        SELECT category AS keyword FROM products p INNER JOIN users u ON u.id = p.seller_id WHERE u.status = 'active' AND category ILIKE '%' || $1 || '%'
        ) AS suggestions
        LIMIT $2;
  `;

    const values = [q, limit];

    const result = await pool.query(query, values);

    return result.rows;
};



const getCategorySections = async () => {
    try {
        const sections = [];

        // Common filter: Active product and Active seller
        const baseQuery = `
            SELECT 
                p.*,
                (
                    SELECT COALESCE(SUM(oi.quantity), 0)::integer
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = p.id AND o.order_status NOT IN ('cancelled', 'payment_failed')
                ) AS actual_sold,
                (
                    SELECT COALESCE(SUM(oi.line_total), 0)::numeric
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = p.id AND o.order_status NOT IN ('cancelled', 'payment_failed')
                ) AS actual_revenue,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', v.id,
                            'color', v.color,
                            'size', v.size,
                            'price', v.final_price,
                            'stock', v.stock,
                            'old_price', v.old_price
                        )
                    ) FILTER (WHERE v.id IS NOT NULL),
                    '[]'
                ) AS variants
            FROM products p
            INNER JOIN users u ON u.id = p.seller_id
            LEFT JOIN product_variants v ON v.product_id = p.id
            WHERE (p.status = 'active' OR p.status = 'true' OR p.status = '1') AND u.status = 'active'
        `;


        const groupBy = ` GROUP BY p.id `;

        // 1. New Arrivals
        const newArrivals = await pool.query(`${baseQuery} ${groupBy} ORDER BY p.created_at DESC LIMIT 12`);
        sections.push({
            section_key: "new_arrivals",
            title: "New Arrivals",
            products: normalizeProductRecords(newArrivals.rows)
        });

        // 2. Trending
        const trending = await pool.query(`${baseQuery} ${groupBy} ORDER BY actual_sold DESC LIMIT 12`);
        sections.push({
            section_key: "trending",
            title: "Trending Products",
            products: normalizeProductRecords(trending.rows)
        });

        // 3. On Sale
        const onSale = await pool.query(`${baseQuery} AND p.discount > 0 ${groupBy} ORDER BY p.discount DESC LIMIT 12`);
        sections.push({
            section_key: "on_sale",
            title: "Great Deals & Discounts",
            products: normalizeProductRecords(onSale.rows)
        });

        // 4. Top Rated
        const topRated = await pool.query(`${baseQuery} ${groupBy} ORDER BY p.rating DESC, p.review_count DESC LIMIT 12`);
        sections.push({
            section_key: "top_rated",
            title: "Top Rated Products",
            products: normalizeProductRecords(topRated.rows)
        });

        // 5. Category-wise sections
        const categoriesRes = await pool.query(`SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND (status = 'active' OR status = 'true' OR status = '1')`);

        const categories = categoriesRes.rows.map(r => r.category);

        for (const cat of categories) {
            const catProducts = await pool.query(`${baseQuery} AND p.category = $1 ${groupBy} LIMIT 12`, [cat]);
            if (catProducts.rows.length > 0) {
                sections.push({
                    section_key: `category_${cat.toLowerCase().replace(/\s+/g, '_')}`,
                    title: cat,
                    category: cat,
                    products: normalizeProductRecords(catProducts.rows)
                });
            }
        }

        return sections;
    } catch (error) {
        console.error("Error fetching category sections:", error.message);
        throw error;
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    createProductImages,
    modelHandleUpdateProduct,
    deleteById,
    handleFindByQueryModel,
    handleFindListByQueryModel,
    getCategorySections
};
