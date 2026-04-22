const reportService = require('./report.modal');
const Response = require('../response');

exports.getSellerSummary = async (req, res) => {
    try {
        const { sellerId } = req.params;

        if (!sellerId) {
            return Response.badRequest(res, "Seller ID is required");
        }

        const data = await reportService.getSellerSummary(sellerId);
        return Response.success(res, "Seller summary fetched successfully", data);
    } catch (error) {
        console.error("getSellerSummary error:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

exports.getWeeklyUnitsSold = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return Response.badRequest(res, "Product ID is required");
        }

        const data = await reportService.getWeeklyUnitsSold(productId);
        return Response.success(res, "Weekly units sold fetched successfully", data);
    } catch (error) {
        console.error("getWeeklyUnitsSold error:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

exports.getMonthlySales = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return Response.badRequest(res, "Product ID is required");
        }

        const data = await reportService.getMonthlySales(productId);
        return Response.success(res, "Monthly sales fetched successfully", data);
    } catch (error) {
        console.error("getMonthlySales error:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

exports.getOrderStatusMix = async (req, res) => {
    try {
        const { sellerId } = req.params;

        if (!sellerId) {
            return Response.badRequest(res, "Seller ID is required");
        }

        const data = await reportService.getOrderStatusMix(sellerId);
        return Response.success(res, "Order status mix fetched successfully", data);
    } catch (error) {
        console.error("getOrderStatusMix error:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

exports.getRecentOrdersByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id

        const data = await reportService.getRecentOrdersByProduct(productId, userId);

        return Response.success(res, "Recent orders fetched successfully", data);
    } catch (error) {
        console.error("getRecentOrdersByProduct error:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

exports.getRatingBreakdown = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return Response.badRequest(res, "Product ID is required");
        }

        const data = await reportService.getRatingBreakdown(productId);
        return Response.success(res, "Rating breakdown fetched successfully", data);
    } catch (error) {
        console.error("getRatingBreakdown error:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

exports.getRecentActivities = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const data = await reportService.getRecentActivities(sellerId);

        return Response.success(res, "Recent activities fetched successfully", data);
    } catch (error) {
        console.error("getRecentActivities error:", error);
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};