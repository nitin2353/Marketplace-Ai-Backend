const Response = require("../response");
const globaModal = require('./global.modal');

const uploadImages = async (req, res) => {
    try {
        res.json({
            message: "Upload successful",
            image: req.file.buffer,     
            public_id: req.file.filename,
        });
    } catch (err) {
        console.error(err);
        return Response.serverError(res, err.message || "Upload failed");
    }
}

const getProductCategories = async (req, res) => {
    try {
        const data = await globaModal.getCategories();
         return Response.success(res, "Categories fetched successfully", data.rows);
    } catch (error) {
        console.error(error);
        return Response.serverError(res, error.message || "Categories fetched failed");
    }
}

const getPickupScheduledDate = async (req, res) => {
    try {
        const {id} = req.user;
        const data = await globaModal.pickupScheduledDate(id);
         return Response.success(res, "Scheduled Date fetched successfully", data.rows);
    } catch (error) {
        console.error(error);
        return Response.serverError(res, error.message || "cheduled Date fetched failed");
    }
}






module.exports = { uploadImages, getProductCategories, getPickupScheduledDate }