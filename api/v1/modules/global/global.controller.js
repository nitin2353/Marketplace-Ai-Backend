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
        const { id } = req.user;
        const data = await globaModal.pickupScheduledDate(id);
        return Response.success(res, "Scheduled Date fetched successfully", data.rows);
    } catch (error) {
        console.error(error);
        return Response.serverError(res, error.message || "cheduled Date fetched failed");
    }
}

const createUserFeedback = async (req, res) => {
    try {
        const { role } = req.user;
        const { feedback } = req.body;

        if (!feedback || !feedback.trim()) {
            return Response.error(res, "Feedback is required", 400);
        }

        const data = await globaModal.createUserFeedbackModal(
            role,
            feedback.trim()
        );

        return Response.success(
            res,
            "Feedback submitted successfully",
            data.rows
        );

    } catch (error) {
        console.error("Create User Feedback Error:", error);

        return Response.serverError(
            res,
            error.message || "Failed to submit feedback"
        );
    }
};

const getUserFeedback = async (req, res) => {
    try {
        const { role } = req.user;

        const data = await globaModal.getUserFeedbackModal(role);

        return Response.success(
            res,
            "Feedback fetched successfully",
            data.rows
        );

    } catch (error) {
        console.error("Get User Feedback Error:", error);

        return Response.serverError(
            res,
            error.message || "Failed to fetch feedback"
        );
    }
};







module.exports = { uploadImages, getProductCategories, getPickupScheduledDate, createUserFeedback, getUserFeedback }