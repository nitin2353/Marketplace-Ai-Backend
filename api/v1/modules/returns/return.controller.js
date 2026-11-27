const returnModel = require("./return.modal");
const Response = require("../response");
const UTILS = require("../../../../utils/global");

exports.createReturnRequest = async (req, res) => {
    try {
        const customer_id = req.user.id;
        const { order_id, order_item_id, request_type, reason, description } = req.body;

        if (!order_id || !order_item_id || !request_type || !reason) {
            return Response.badRequest(res, "Missing required fields");
        }

        let images = [];
        if (req.files && req.files.length > 0) {
            const uploadResults = await UTILS.uploadMultiple(req.files);
            images = uploadResults.map(file => file.url);
        }

        const returnRequest = await returnModel.createReturnRequest({
            order_id,
            order_item_id,
            customer_id,
            request_type,
            reason,
            description,
            images
        });

        return Response.created(res, "Return/Replacement request submitted successfully", returnRequest);
    } catch (error) {
        console.error("CREATE RETURN REQUEST ERROR:", error);
        return Response.serverError(res, error.message || "Internal server error");
    }
};

exports.getCustomerReturnRequests = async (req, res) => {
    try {
        const customer_id = req.user.id;
        const records = await returnModel.getCustomerReturnRequests(customer_id);
        return Response.success(res, "Return requests fetched successfully", records);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal server error");
    }
};

exports.getSellerReturnRequests = async (req, res) => {
    try {
        const seller_id = req.user.id;
        const records = await returnModel.getSellerReturnRequests(seller_id);
        return Response.success(res, "Return requests fetched successfully", records);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal server error");
    }
};

exports.getReturnRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await returnModel.getReturnRequestById(id);
        if (!record) {
            return Response.notFound(res, "Return request not found");
        }
        
        // Authorization check
        if (req.user.id !== record.customer_id && req.user.id !== record.seller_id) {
            return Response.unauthorized(res, "Unauthorized access to this return request");
        }

        return Response.success(res, "Return request fetched successfully", record);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal server error");
    }
};

exports.updateReturnStatus = async (req, res) => {
    try {
        const seller_id = req.user.id;
        const { id } = req.params;
        const { status, seller_response, refund_amount } = req.body;

        if (!status) {
            return Response.badRequest(res, "Status is required");
        }

        const record = await returnModel.updateReturnStatus(id, seller_id, {
            status,
            seller_response,
            refund_amount
        });

        return Response.success(res, "Return request status updated successfully", record);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal server error");
    }
};

exports.cancelReturnRequest = async (req, res) => {
    try {
        const customer_id = req.user.id;
        const { id } = req.params;

        const record = await returnModel.cancelReturnRequest(id, customer_id);
        return Response.success(res, "Return request cancelled successfully", record);
    } catch (error) {
        return Response.serverError(res, error.message || "Internal server error");
    }
};
