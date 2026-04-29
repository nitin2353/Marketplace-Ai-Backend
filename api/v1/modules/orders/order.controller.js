const orderService = require("./order.modal");
const Response = require('../response');

// =====================================
// CREATE ORDER
// =====================================
exports.createOrder = async (req, res) => {
    try {
        const {
            address_id,
            payment_method,
            payment_gateway,
            payment_order_id,
            payment_id,
            payment_signature,
            notes
        } = req.body;

        const user_id = req.user?.id || null;


        const created_by = req.user?.id || req.body.created_by || null;
        const modified_by = req.user?.id || req.body.modified_by || null;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required"
            });
        }

        if (!address_id) {
            return res.status(400).json({
                success: false,
                message: "address_id is required"
            });
        }

        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: "payment_method is required"
            });
        }

        const allowedPaymentMethods = ["cod", "upi", "card", "netbanking", "wallet"];
        if (!allowedPaymentMethods.includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        const data = await orderService.createOrderFromCart({
            user_id,
            address_id,
            payment_method,
            payment_gateway,
            payment_order_id,
            payment_id,
            payment_signature,
            notes,
            created_by,
            modified_by
        });

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data
        });
    } catch (err) {
        console.error("CREATE ORDER ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// GET CUSTOMER ORDERS
// =====================================
exports.getCustomerOrders = async (req, res) => {
    try {
        const user_id = req.user.id; // Enforce logged-in user ID

        const data = await orderService.getCustomerOrders(user_id);

        return res.status(200).json({
            success: true,
            message: "Customer orders fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET CUSTOMER ORDERS ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// GET SINGLE CUSTOMER ORDER
// =====================================
exports.getCustomerOrderById = async (req, res) => {
    try {
        const user_id = req.user.id; // Enforce logged-in user ID
        const { order_id } = req.params;

        const data = await orderService.getCustomerOrderById(user_id, order_id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Order not found or unauthorized"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer order fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET CUSTOMER ORDER BY ID ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};


exports.getSellerOrders = async (req, res) => {
    try {
        const { seller_id } = req.params;

        const data = await orderService.getSellerOrders(seller_id);

        return res.status(200).json({
            success: true,
            message: "Seller orders fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET SELLER ORDERS ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};


exports.getSellerOrderById = async (req, res) => {
    try {
        const { seller_id, order_id } = req.params;

        const data = await orderService.getSellerOrderById(seller_id, order_id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Seller order fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET SELLER ORDER BY ID ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// GET FULL ORDER DETAILS
// =====================================
exports.getOrderById = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user_id = req.user.id;
        
        // For security, customers can only see their own orders
        const data = await orderService.getOrderById(order_id, user_id);
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Order not found or unauthorized"
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "Order fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET ORDER BY ID ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// GET ORDER ITEMS
// =====================================
exports.getOrderItems = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user_id = req.user.id;

        // Verify ownership before returning items
        const order = await orderService.getCustomerOrderById(user_id, order_id);
        if (!order) {
            return res.status(403).json({ success: false, message: "Unauthorized access to order items" });
        }

        const data = await orderService.getOrderItems(order_id);

        return res.status(200).json({
            success: true,
            message: "Order items fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET ORDER ITEMS ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// GET ORDER ADDRESS SNAPSHOT
// =====================================
exports.getOrderAddressSnapshot = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user_id = req.user.id;

        // Verify ownership
        const order = await orderService.getCustomerOrderById(user_id, order_id);
        if (!order) {
            return res.status(403).json({ success: false, message: "Unauthorized access to address snapshot" });
        }

        const data = await orderService.getOrderAddressSnapshot(order_id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Address snapshot not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order address snapshot fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET ORDER ADDRESS SNAPSHOT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// GET ORDER USER SNAPSHOT
// =====================================
exports.getOrderUserSnapshot = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user_id = req.user.id;

        // Verify ownership
        const order = await orderService.getCustomerOrderById(user_id, order_id);
        if (!order) {
            return res.status(403).json({ success: false, message: "Unauthorized access to user snapshot" });
        }

        const data = await orderService.getOrderUserSnapshot(order_id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "User snapshot not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order user snapshot fetched successfully",
            data
        });
    } catch (err) {
        console.error("GET ORDER USER SNAPSHOT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// UPDATE ORDER STATUS
// =====================================
exports.updateOrderStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status } = req.body;

        const modified_by = req.user?.id || req.body.modified_by || null;

        const allowedStatuses = [
            "placed",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "payment_failed"
        ];

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });
        }

        const data = await orderService.updateOrderStatus(order_id, status, modified_by);

        return Response.success(res, "Order status updated successfully", data);
    } catch (err) {
        console.error("UPDATE ORDER STATUS ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// UPDATE PAYMENT STATUS
// =====================================
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { order_id } = req.params;
        const { paymentStatus } = req.body;
        
        const modified_by = req.user?.id || req.body.modified_by || null;

        const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded", "cancelled"];

        if (!paymentStatus) {
            return res.status(400).json({
                success: false,
                message: "payment status is required"
            });
        }

        if (!allowedPaymentStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status"
            });
        }

        const data = await orderService.updatePaymentStatus(order_id, paymentStatus, modified_by);

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data
        });
    } catch (err) {
        console.error("UPDATE PAYMENT STATUS ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// VERIFY RAZORPAY PAYMENT
// =====================================
exports.verifyOrderPayment = async (req, res) => {
    try {
        const { order_id } = req.params;

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const modified_by = req.user?.id || req.body.modified_by || null;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required"
            });
        }

        const data = await orderService.verifyOrderPayment({
            order_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            modified_by
        });

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            data
        });
    } catch (err) {
        console.error("VERIFY ORDER PAYMENT ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

// =====================================
// CANCEL ORDER
// =====================================
exports.cancelOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        const user_id = req.user.id;

        // Verify ownership
        const order = await orderService.getCustomerOrderById(user_id, order_id);
        if (!order) {
            return res.status(403).json({ success: false, message: "Unauthorized to cancel this order" });
        }

        if (order.order_status === 'delivered' || order.order_status === 'cancelled') {
             return res.status(400).json({ success: false, message: `Cannot cancel order in ${order.order_status} state` });
        }

        const data = await orderService.cancelOrder(order_id, user_id);

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data
        });
    } catch (err) {
        console.error("CANCEL ORDER ERROR:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};