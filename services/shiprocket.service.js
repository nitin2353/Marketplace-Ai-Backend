const axios = require("axios");

const SHIPROCKET_BASE_URL =
    "https://apiv2.shiprocket.in/v1/external";

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Authenticate with Shiprocket.
 * Token is cached in memory to avoid logging in for every shipment.
 */
async function getShiprocketToken() {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
        throw new Error("Shiprocket credentials are not configured.");
    }

    const response = await axios.post(
        `${SHIPROCKET_BASE_URL}/auth/login`,
        { email, password },
        {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: 20000,
        }
    );

    if (!response.data?.token) {
        throw new Error("Shiprocket authentication failed.");
    }

    cachedToken = response.data.token;

    // Refresh before the documented 10-day token expiry.
    tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;

    return cachedToken;
}


const getCourierServiceability = async (req, res) => {
    try {
        const {
            pickup_postcode,
            delivery_postcode,
            weight = 1,
            cod = 0,
        } = req.body;

        // Validate required fields
        if (!pickup_postcode || !delivery_postcode) {
            return res.status(400).json({
                success: false,
                message: "Pickup and delivery PIN codes are required.",
            });
        }

        // Validate PIN codes
        const pincodePattern = /^\d{6}$/;

        if (
            !pincodePattern.test(String(pickup_postcode)) ||
            !pincodePattern.test(String(delivery_postcode))
        ) {
            return res.status(400).json({
                success: false,
                message: "Both PIN codes must contain exactly 6 digits.",
            });
        }

        // Validate package weight
        if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Weight must be greater than 0.",
            });
        }

        // Validate COD flag
        if (![0, 1, "0", "1"].includes(cod)) {
            return res.status(400).json({
                success: false,
                message: "COD must be 0 or 1.",
            });
        }

        // Get Shiprocket token from existing service
        const token = await getShiprocketToken();

        // Check courier serviceability
        const response = await axios.get(
            `${process.env.SHIPROCKET_BASE_URL}/courier/serviceability/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                params: {
                    pickup_postcode: String(pickup_postcode),
                    delivery_postcode: String(delivery_postcode),
                    weight: Number(weight),
                    cod: Number(cod),
                },
                timeout: 15000,
            }
        );

        const couriers =
            response.data?.data?.available_courier_companies || [];

        return res.status(200).json({
            success: true,
            available: couriers.length > 0,
            message:
                couriers.length > 0
                    ? "Delivery service is available."
                    : "Delivery service is not available for this route.",
            data: response.data.data,
        });

    } catch (error) {
        console.error(
            "Shiprocket serviceability error:",
            error.response?.data || error.message
        );

        if (error.response?.status === 401) {
            return res.status(502).json({
                success: false,
                message: "Shiprocket authentication failed. Please retry later.",
            });
        }

        return res.status(
            error.response?.status >= 400 &&
            error.response?.status < 500
                ? 400
                : 502
        ).json({
            success: false,
            message: "Unable to check delivery availability right now.",
        });
    }
};

module.exports = {
    getShiprocketToken,
    getCourierServiceability
};




// async function createShiprocketShipment({
//     db,
//     order,
//     seller,
//     customer,
//     items,
//     packageDetails,
// }) {
//     if (!db || !order || !seller || !customer) {
//         throw new Error("Required shipment information is missing.");
//     }

//     if (!order.id || !order.order_number) {
//         throw new Error("Order ID and order number are required.");
//     }

//     if (!seller.id) {
//         throw new Error("Seller ID is missing.");
//     }

//     if (!Array.isArray(items) || items.length === 0) {
//         throw new Error("Shipment must contain at least one product.");
//     }

//     // Prevent ordinary repeated calls for an already-created shipment.
//     const existing = await db.query(
//         `SELECT
//             shiprocket_order_id,
//             shiprocket_shipment_id,
//             shiprocket_awb_code,
//             shiprocket_status
//          FROM public.orders
//          WHERE id = $1`,
//         [order.id]
//     );

//     if (!existing.rows.length) {
//         throw new Error("Local order was not found.");
//     }

//     const savedShipment = existing.rows[0];

//     if (savedShipment.shiprocket_shipment_id) {
//         return {
//             success: true,
//             alreadyCreated: true,
//             shipment: savedShipment,
//         };
//     }

//     // The pickup address can come from public.users or public.address.
//     const pickupAddress =
//         seller.address_line_1 || seller.address || "";

//     const pickupAddress2 =
//         seller.address_line_2 || seller.address_2 || "";

//     const pickupCity = seller.city || "";
//     const pickupState = seller.state || "";
//     const pickupPincode = String(seller.pincode || seller.pin_code || "");
//     const pickupCountry = seller.country || "India";

//     const sellerName =
//         seller.business_name ||
//         seller.name ||
//         [seller.first_name, seller.last_name]
//             .filter(Boolean)
//             .join(" ");

//     const sellerEmail = seller.email || "";
//     const sellerPhone = String(seller.phone || "").replace(/\D/g, "");

//     if (
//         !pickupAddress ||
//         pickupAddress.length < 10 ||
//         !pickupCity ||
//         !pickupState ||
//         !pickupPincode ||
//         !sellerName ||
//         !sellerEmail ||
//         sellerPhone.length < 10
//     ) {
//         throw new Error(
//             "Seller pickup address is incomplete. Check the seller's profile and address."
//         );
//     }

//     if (pickupPincode.length !== 6) {
//         throw new Error("Seller pickup pincode must contain 6 digits.");
//     }

//     // Stable pickup-location name based on the seller's user ID.
//     // Letters and numbers only; maximum 36 characters.
//     const pickupLocation =
//         `S${String(seller.id).replace(/[^a-zA-Z0-9]/g, "")}`
//             .slice(0, 36);

//     const shippingAddress =
//         customer.address_line_1 || customer.address || "";

//     const shippingAddress2 =
//         customer.address_line_2 || customer.address_2 || "";

//     const customerName =
//         customer.name ||
//         [customer.first_name, customer.last_name]
//             .filter(Boolean)
//             .join(" ");

//     const nameParts = customerName.trim().split(/\s+/);
//     const customerFirstName = nameParts.shift() || "";
//     const customerLastName = nameParts.join(" ");

//     const customerPhone = String(
//         customer.mobile || customer.phone || ""
//     ).replace(/\D/g, "");

//     const customerPincode = String(
//         customer.pincode || customer.pin_code || ""
//     );

//     if (
//         !customerFirstName ||
//         !shippingAddress ||
//         !customer.city ||
//         !customer.state ||
//         !customerPincode ||
//         !customerPhone
//     ) {
//         throw new Error("Customer delivery address is incomplete.");
//     }

//     if (customerPincode.length !== 6) {
//         throw new Error("Customer delivery pincode must contain 6 digits.");
//     }

//     const weight = Number(packageDetails?.weight);
//     const length = Number(packageDetails?.length);
//     const breadth = Number(
//         packageDetails?.breadth ?? packageDetails?.width
//     );
//     const height = Number(packageDetails?.height);

//     if (
//         !Number.isFinite(weight) ||
//         !Number.isFinite(length) ||
//         !Number.isFinite(breadth) ||
//         !Number.isFinite(height) ||
//         weight <= 0 ||
//         length <= 0 ||
//         breadth <= 0 ||
//         height <= 0
//     ) {
//         throw new Error(
//             "Valid package weight and dimensions are required."
//         );
//     }

//     const orderItems = items.map((item) => {
//         const units = Number(item.quantity ?? item.units);
//         const price = Number(
//             item.selling_price ?? item.price
//         );

//         if (
//             !Number.isFinite(units) ||
//             units <= 0 ||
//             !Number.isFinite(price) ||
//             price < 0
//         ) {
//             throw new Error(
//                 "Invalid quantity or selling price in order items."
//             );
//         }

//         return {
//             name: String(
//                 item.product_name || item.name || "Product"
//             ).slice(0, 200),

//             sku: String(
//                 item.sku || item.product_id || item.id
//             ).slice(0, 100),

//             units,
//             selling_price: price,
//         };
//     });

//     const isCOD =
//         String(order.payment_method || "").toLowerCase() === "cod";

//     // Never create a prepaid shipment before payment succeeds.
//     if (
//         !isCOD &&
//         String(order.payment_status || "").toLowerCase() !== "paid"
//     ) {
//         throw new Error(
//             "Prepaid order cannot be shipped until payment is successful."
//         );
//     }

//     const subtotal = Number(
//         order.subtotal ?? order.sub_total
//     );

//     if (!Number.isFinite(subtotal) || subtotal < 0) {
//         throw new Error("Invalid order subtotal.");
//     }

//     const payload = {
//         // Use the unique local order reference.
//         order_id: String(order.order_number).slice(0, 50),

//         order_date: new Date(
//             order.created_time || Date.now()
//         ).toISOString().slice(0, 10),

//         billing_customer_name: customerFirstName,
//         billing_last_name: customerLastName,

//         billing_address: shippingAddress,
//         billing_address_2: shippingAddress2,

//         billing_city: customer.city,
//         billing_pincode: customerPincode,
//         billing_state: customer.state,
//         billing_country: customer.country || "India",
//         billing_email: customer.email || "support@example.com",
//         billing_phone: customerPhone,

//         shipping_is_billing: true,

//         order_items: orderItems,

//         payment_method: isCOD ? "COD" : "PREPAID",

//         sub_total: subtotal,

//         length,
//         breadth,
//         height,
//         weight,

//         pickup_location: pickupLocation,

//         // Shiprocket documents vendor_details for a new pickup location.
//         vendor_details: {
//             email: sellerEmail,
//             phone: sellerPhone,
//             name: sellerName,
//             address: pickupAddress,
//             address_2: pickupAddress2,
//             city: pickupCity,
//             state: pickupState,
//             country: pickupCountry,
//             pin_code: pickupPincode,
//             pickup_location: pickupLocation,
//         },
//     };

//     const token = await getShiprocketToken();

//     const response = await axios.post(
//         `${SHIPROCKET_BASE_URL}/shipments/create/forward-shipment`,
//         payload,
//         {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//                 "Content-Type": "application/json",
//             },
//             timeout: 60000,
//         }
//     );

//     const result = response.data?.payload || response.data?.data || response.data;

//     if (
//         !result ||
//         Number(result.status) === 0 ||
//         !result.shipment_id
//     ) {
//         throw new Error(
//             result?.message ||
//             "Shiprocket did not return a valid shipment ID."
//         );
//     }

//     if (!result?.shipment_id) {
//         throw new Error(
//             "Shiprocket did not return a shipment ID. Check the API response."
//         );
//     }

//     // Persist the shipment in your existing orders table.
//     const update = await db.query(
//         `UPDATE public.orders
//          SET
//             shiprocket_order_id = $2,
//             shiprocket_shipment_id = $3,
//             shiprocket_awb_code = $4,
//             shiprocket_courier_name = $5,
//             shiprocket_status = $6,
//             shiprocket_label_url = $7,
//             shiprocket_tracking_url = $8,
//             shiprocket_pickup_scheduled = $9,
//             shiprocket_created_at = NOW(),
//             shiprocket_updated_at = NOW(),
//             modified_time = NOW()
//          WHERE id = $1
//            AND shiprocket_shipment_id IS NULL
//          RETURNING id`,
//         [
//             order.id,
//             result.order_id ? String(result.order_id) : null,
//             String(result.shipment_id),
//             result.awb_code || null,
//             result.courier_name || null,
//             result.status || "created",
//             result.label_url || null,
//             result.tracking_url || null,
//             Boolean(result.pickup_generated),
//         ]
//     );

//     if (!update.rowCount) {
//         throw new Error(
//             "Shipment was created remotely, but the local order could not be updated. Reconcile this order before retrying."
//         );
//     }

//     return {
//         success: true,
//         alreadyCreated: false,
//         shipment: {
//             order_id: result.order_id,
//             shipment_id: result.shipment_id,
//             awb_code: result.awb_code || null,
//             courier_name: result.courier_name || null,
//             label_url: result.label_url || null,
//             tracking_url: result.tracking_url || null,
//             pickup_generated: Boolean(result.pickup_generated),
//         },
//     };
// }

