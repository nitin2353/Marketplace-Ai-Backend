
const ResponseManager = require("../response");
const adminModel = require("./admin.modal");

exports.getSellers = async (req, res) => {
    try {
        const sellers = await adminModel.getAllSellers();

        return ResponseManager.success(res, "Seller fetched successfully", sellers);
    } catch (error) {
        console.error("Get sellers dashboard error:", error);

        return ResponseManager.serverError(res);
    }
};

exports.updateSellerStatus = async (req, res) => {
    try {
        const sellerId = req.params.id;
        const status = String(req.body.status || "")
            .trim()
            .toLowerCase();
        
        if (!sellerId) {
            return ResponseManager.badRequest(res, "Seller ID is required");
        }

        if (!["active", "inactive"].includes(status)) {
            return ResponseManager.badRequest(res, "Status must be active or inactive");
        }

        const seller = await adminModel.updateSellerStatus(
            sellerId,
            status
        );

        if (!seller) {
            return ResponseManager.notFound(res, "Seller not found");
        }
        return ResponseManager.success(res, "Seller status updated successfully", seller);

    } catch (error) {
        console.error("Update seller status error:", error);
        return ResponseManager.serverError(res);
    }
};


exports.getSellerDetails = async (req, res) => {
    try {
        const sellerId = String(req.params.id || "").trim();

        if (!sellerId) {
            return ResponseManager.badRequest(
                res,
                "Seller ID is required"
            );
        }

        const details = await adminModel.getSellerDetails(sellerId);

        if (!details) {
            return ResponseManager.notFound(
                res,
                "Seller not found"
            );
        }

        return ResponseManager.success(
            res,
            "Seller details fetched successfully",
            details
        );
    } catch (error) {
        console.error("Get seller details error:", error);

        return ResponseManager.serverError(res);
    }
};


exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "success",
            "failed",
            "refunded",
        ];

        const normalizedStatus = String(status || "").toLowerCase();

        if (!allowedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status.",
            });
        }
  
        const payment = await adminModel.updatePaymentStatus(
            paymentId,
            normalizedStatus
        );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully.",
            data: {
                payment,
            },
        });
    } catch (error) {
        console.error("Update payment status error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update payment status.",
        });
    }
};