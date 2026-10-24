
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
