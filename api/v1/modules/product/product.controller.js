const productModel = require("./product.model");
const Response = require("../response");
const UTILS = require('../../../../utils/global');
const pool = require('../../../../config/database');




const handleGetProducts = async (req, res) => {
    try {
        const role = req.user.role;
        const id = req.user.id

        const records = await productModel.getAllProducts(role, id);
        return Response.success(res, "Records fetched successfully", records);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal Server Error");
    }
}

const handleFindByQuery = async (req, res) => {
    try {
        const { q = "", page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        const records = await productModel.handleFindByQueryModel({
            q,
            limit,
            offset,
        });

        return Response.success(res, "Records fetched successfully", records);

    } catch (error) {
        console.error("SEARCH ERROR:", error);

        return Response.serverError(res, error.message || "Internal Server Error");
    }
};


const handleFindListByQuery = async (req, res) => {
    try {
        const { q = "", page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        const records = await productModel.handleFindListByQueryModel({
            q,
            limit,
            offset,
        });

        return Response.success(res, "Records fetched successfully", records);

    } catch (error) {
        console.error("SEARCH ERROR:", error);

        return Response.serverError(res, error.message || "Internal Server Error");
    }
};



const handleGetProductById = async (req, res) => {
    try {
        const id = req.params.id

        const records = await productModel.getProductById(id);
        return Response.success(res, "Records fetched successfully", records);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal Server Error");
    }
}




const createProduct = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return Response.notFound(res, "Seller not authenticated");
        }

        if (!req.files || req.files.length === 0) {
            return Response.badRequest(res, "At least one image is required");
        }
        // 🔹 Upload Images
        const uploadResults = await UTILS.uploadMultiple(req.files);
        const imageUrls = uploadResults.map(file => file.url);

        data.imageUrls = imageUrls;
        data.userId = userId;

        const product = await productModel.createProduct(data);

        return Response.created(res, "Product created successfully", product);

    } catch (error) {
        console.error("CREATE PRODUCT ERROR:", error);
        return Response.serverError(res, "Internal server error");
    }
};


// const updateProduct = async (req, res) => {

//     try {
//         const userId = req.user.id
//         const productId = req?.params.id


//         if (!req.files || req.body.image_url.length === 0) {
//             return Response.badRequest(res, "At least one image is required");
//         }


//         const existingImages = req.body.image_url
//             ? JSON.parse(req.body.image_url)
//             : [];

//         // 🔥 upload new images
//         const uploadResults = await UTILS.uploadMultiple(req.files || []);
//         const newImageUrls = uploadResults.map(file => file.url);

//         // 🔥 merge properly
//         const newPayload = {
//             ...req.body,
//             image_url: [...existingImages, ...newImageUrls],
//             modified_by: userId,
//             id: productId
//         };
//         console.log("newPayload",newPayload)
//         const result = await productModel.modelHandleUpdateProduct(newPayload, userId, productId);
//         if (!result) {
//             return Response.badRequest(res, "Record not found");
//         }
//         return Response.success(res, "Product updated successfully");
//     } catch (error) {
//         console.log("Server error:", error);
//         return Response.serverError(res, error.message);
//     }
// }

// ✅ safe parse helper
const safeParse = (data) => {
    try {
        return data.length ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

const updateProduct = async (req, res) => {
    try {
        const userId = req.user?.id;
        const productId = req.params?.id;

        if (!userId || !productId) {
            return Response.badRequest(res, "Invalid user or product ID");
        }

        const safeParse = (value, fallback = []) => {
            if (!value) return fallback;
            if (Array.isArray(value) || typeof value === "object") return value;
            try {
                return JSON.parse(value);
            } catch {
                return fallback;
            }
        };

        const parseBoolean = (value, def = false) => {
            if (value === undefined || value === null || value === "") return def;
            if (typeof value === "boolean") return value;
            return value.toString().toLowerCase() === "true";
        };

        const parseNumber = (value, def = null) => {
            if (value === undefined || value === null || value === "") return def;
            const num = Number(value);
            return Number.isNaN(num) ? def : num;
        };

        // images
        const existingImages = safeParse(req.body.existingImages, []);
        const deletedImages = safeParse(req.body.deletedImages, []);

        if (deletedImages.length > 0) {
            await UTILS.removeMultiple(deletedImages);
        }

        let newImageUrls = [];
        if (req.files?.length > 0) {
            const uploadResults = await UTILS.uploadMultiple(req.files);
            newImageUrls = uploadResults.map(file => file.url);
        }

        const finalImages = [...existingImages, ...newImageUrls];

        if (finalImages.length === 0) {
            return Response.badRequest(res, "At least one image is required");
        }

        const payload = {
            id: productId,
            modified_by: userId,

            // basic
            title: req.body.title?.trim() || null,
            description: req.body.description || null,
            brand: req.body.brand || null,
            category: req.body.category || null,
            tag: req.body.tag || null,

            // pricing
            base_price: parseNumber(req.body.base_price, 0),
            old_price: parseNumber(req.body.old_price, null),
            discount: parseNumber(req.body.discount, 0),

            // tax
            tax_percentage: parseNumber(req.body.tax_percentage, 0),
            tax_inclusive: parseBoolean(req.body.tax_inclusive, true),

            // inventory
            stock: parseNumber(req.body.stock, 0),
            min_stock_alert: parseNumber(req.body.min_stock_alert, 5),

            // shipping
            weight: parseNumber(req.body.weight, null),
            length: parseNumber(req.body.length, null),
            width: parseNumber(req.body.width, null),
            height: parseNumber(req.body.height, null),

            // delivery
            delivery_days: parseNumber(req.body.delivery_days, null),
            is_cod_available: parseBoolean(req.body.is_cod_available, true),
            is_free_delivery: parseBoolean(req.body.is_free_delivery, false),

            // media
            image_url: finalImages,

            // customization
            is_customizable: parseBoolean(req.body.is_customizable, false),
            customization_type: req.body.customization_type || null,
            customization_fields: safeParse(req.body.customization_fields, null),

            // returns
            is_return: parseBoolean(req.body.is_return, false),
            is_replace: parseBoolean(req.body.is_replace, false),
            return_replace_duration: parseNumber(req.body.return_replace_duration, null),
            return_replace_instructions: req.body.return_replace_instructions || null,

            // seo
            slug: req.body.slug || null,
            meta_title: req.body.meta_title || null,
            meta_description: req.body.meta_description || null,

            // analytics (only safe ones)
            views: parseNumber(req.body.views, 0),
            clicks: parseNumber(req.body.clicks, 0),
            wishlist_count: parseNumber(req.body.wishlist_count, 0),
            cart_count: parseNumber(req.body.cart_count, 0),

            status: req.body.status || "draft",

            variants: safeParse(req.body.variants, []),
        };
        


        const result = await productModel.modelHandleUpdateProduct(payload);

        if (!result) {
            return Response.badRequest(res, "Product not found");
        }

        return Response.success(res, "Product updated successfully", result);

    } catch (error) {
        console.error("UPDATE PRODUCT ERROR:", error);
        return Response.serverError(res, error.message);
    }
};



const handleDeleteProduct = async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return Response.badRequest(res, "Product ID is required");
        }

        // 🔥 STEP 1: get product
        const query = `SELECT * FROM public.products WHERE id = $1`;
        const response = await pool.query(query, [id]);

        const product = response.rows[0];

        if (!product) {
            return Response.badRequest(res, "Product not found");
        }

        const deletableUrls = product.image_url || [];


        // 🔥 STEP 2: delete images from Cloudinary
        if (deletableUrls.length > 0) {
            await UTILS.removeMultiple(deletableUrls);
        }

        // 🔥 STEP 3: delete from DB
        const deletedRecord = await productModel.deleteById(id);

        return Response.success(res, "Product deleted successfully", deletedRecord);

    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};


const handleGetCategorySections = async (req, res) => {
    try {
        const sections = await productModel.getCategorySections();
        return Response.success(res, "Category sections fetched successfully", sections);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

module.exports = {
    handleGetProducts,
    handleFindByQuery,
    handleGetProductById,
    createProduct,
    updateProduct,
    handleDeleteProduct,
    handleFindListByQuery,
    handleGetCategorySections
};