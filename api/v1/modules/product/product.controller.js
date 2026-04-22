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



        const existingImages = safeParse(req.body.existingImages);
        const deletedImages = safeParse(req.body.deletedImages);


        await UTILS.removeMultiple(deletedImages);

        let newImageUrls = [];

        if (req.files && req.files.length > 0) {
            const uploadResults = await UTILS.uploadMultiple(req.files);
            newImageUrls = uploadResults.map(file => file.url);
        }

        const finalImages = [
            ...(existingImages || []),
            ...newImageUrls
        ];

        if (finalImages.length === 0 && !existingImages.length) {
            return Response.badRequest(res, "At least one image is required");
        }

        const payload = {
            ...req.body,
            image_url: finalImages,
            modified_by: userId,
            id: productId
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


module.exports = {
    handleGetProducts,
    handleFindByQuery,
    handleGetProductById,
    createProduct,
    updateProduct,
    handleDeleteProduct,
    handleFindListByQuery
};