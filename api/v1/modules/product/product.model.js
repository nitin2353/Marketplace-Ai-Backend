const pool = require('../../../../config/database');




const getAllProducts = async (role = "customer", id = "") => {
    try {
        let query = "" 
        let records = ""
        if(role == 'seller'){
            query = `select * from public.products where seller_id = $1;`
            records = await pool.query(query, [id]);
        }else{
            query = `select * from public.products;`
            records = await pool.query(query);
        }
        return records;
    } catch (error) {
        console.error("Error fetching products:", error.message);
        throw error;
    }
}




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
    const query = `
    INSERT INTO products (
        seller_id,
        title,
        description,
        base_price,
        is_customizable,
        brand,
        old_price,
        discount,
        tag,
        rating,
        reviews,
        sold,
        stock,
        color,
        is_return,
        is_replace,
        return_replace_duration,
        return_replace_instructions,
        image_url
    )
    VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19
    )
    RETURNING *;
`;

    const values = [
        data.userId,
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
        data.imageUrls || []
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
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
        console.log(values)

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
            DELETE FROM public.products 
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




module.exports = {
    getAllProducts,
    createProduct,
    createProductImages,
    modelHandleUpdateProduct,
    deleteById
};