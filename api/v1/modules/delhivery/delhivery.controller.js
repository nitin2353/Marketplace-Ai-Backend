const axios = require("axios");
const { checkPincode, createShipment } = require("../../../../services/delhivery.service");
const ResponseManager = require("../response");
const pool = require("../../../../config/database");
const { normalizeShiprocketPayload, generatePickupLocation, prepareDelhiveryShipment } = require("../../../../utils/global");




exports.checkPincodeServiceability = async (req, res) => {
    try {
        const { pincode } = req.body;

        if (!pincode) {
            return res?.status(400).json({
                success: false,
                available: false,
                message: "Pickup postcode is required"
            });
        }

        const result = await checkPincode(pincode);

        const deliveryCodes = result?.delivery_codes || [];

        const available = deliveryCodes.some((item) => {
            const postalCode = item?.postal_code;

            return (
                String(postalCode?.pin) === String(pincode) &&
                postalCode?.pickup === "Y"
            );
        });

        return res?.status(200).json({
            success: true,
            available,
            message: available
                ? "Pickup service is available"
                : "Pickup service is not available"
        });

    } catch (error) {
        return res?.status(error.response?.status || 500).json({
            success: false,
            available: false,
            message: error.message,
            error: error.response?.data || null
        });
    }
};



exports.addPickupAddress = async (payload) => {
    try {
        const {
            name,
            email,
            phone,
            address = payload?.address_line_1,
            city,
            country = "India",
            pincode,
            return_address,
            return_pin
        } = payload || {};

        // 1. Validate required fields
        const requiredFields = {
            name,
            email,
            phone,
            address,
            city,
            pincode
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => !String(value ?? "").trim())
            .map(([key]) => key);

        if (missingFields.length > 0) {
            throw new Error(
                `Required pickup address fields are missing: ${missingFields.join(", ")}`
            );
        }

        // 2. Validate email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(String(email).trim())) {
            throw new Error("Please provide a valid email address.");
        }

        // 3. Validate phone
        const phonePattern = /^\d{10}$/;

        if (!phonePattern.test(String(phone).trim())) {
            throw new Error("Phone number must contain exactly 10 digits.");
        }

        // 4. Validate PIN
        const pincodePattern = /^\d{6}$/;

        if (!pincodePattern.test(String(pincode).trim())) {
            throw new Error("PIN code must contain exactly 6 digits.");
        }

        // 5. Prepare Delhivery payload
        const pickupPayload = {
            phone: String(phone).trim(),
            city: String(city).trim(),
            name: String(
                name + "-" + email.split("@")[0].replace(/[\/,.]/g, "")
            ).trim(),
            pin: String(pincode).trim(),
            address: String(address).trim(),
            country: String(country).trim(),
            email: String(email).trim(),
            return_address: String(
                return_address || address
            ).trim(),
            return_pin: String(return_pin || pincode).trim()
        };

        // 6. Create warehouse in Delhivery
        const response = await axios.post(
            "https://track.delhivery.com/api/backend/clientwarehouse/create/",
            pickupPayload,
            {
                headers: {
                    Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                timeout: 15000
            }
        );

        return {
            success: true,
            message: "Pickup warehouse created successfully.",
            data: response.data
        };

    } catch (error) {
        console.error(
            "Delhivery create warehouse error:",
            error.response?.data || error.message
        );

        throw error;
    }
};



exports.calculateShippingCharges = async (req, res) => {
    try {
        const {
            md = "S",
            ss = "Delivered",
            o_pin,
            d_pin,
            cgm,
            pt = "Pre-paid"
        } = req.body || {};

        // 1. Validate required fields
        const requiredFields = {
            o_pin,
            d_pin,
            cgm
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => value === undefined || value === null || String(value).trim() === "")
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Required shipping details are missing.",
                missingFields
            });
        }

        // 2. Validate pincodes
        const pinPattern = /^\d{6}$/;

        if (
            !pinPattern.test(String(o_pin)) ||
            !pinPattern.test(String(d_pin))
        ) {
            return res.status(400).json({
                success: false,
                message: "Origin and destination PIN must contain 6 digits."
            });
        }

        // 3. Validate chargeable weight
        if (!Number.isFinite(Number(cgm)) || Number(cgm) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Chargeable weight must be greater than 0 grams."
            });
        }

        // 4. Validate shipment mode
        if (!["S", "E"].includes(md)) {
            return res.status(400).json({
                success: false,
                message: "Shipment mode must be S or E."
            });
        }

        // 5. Validate shipment status
        if (!["Delivered", "RTO", "DTO"].includes(ss)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Delivered, RTO or DTO."
            });
        }

        // 6. Validate payment type
        if (!["Pre-paid", "COD"].includes(pt)) {
            return res.status(400).json({
                success: false,
                message: "Payment type must be Pre-paid or COD."
            });
        }

        // 7. Delhivery API parameters
        const params = {
            md,
            ss,
            o_pin: String(o_pin),
            d_pin: String(d_pin),
            cgm: Math.ceil(Number(cgm)),
            pt
        };


        // 8. Calculate shipping charges
        const response = await axios.get(
            `${process.env.DELHIVERY_BASE_URL}/api/kinko/v1/invoice/charges/.json`,
            {
                params,
                headers: {
                    Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
                    Accept: "application/json"
                },
                timeout: 15000
            }
        );

        // 9. Return charges
        return res.status(200).json({
            success: true,
            message: "Shipping charges calculated successfully.",
            request: params,
            data: response.data
        });

    } catch (error) {
        const statusCode = error.response?.status;

        console.error(
            "Delhivery shipping charges error:",
            error.response?.data || error.message
        );

        return res.status(
            statusCode >= 400 && statusCode < 500 ? statusCode : 502
        ).json({
            success: false,
            message:
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Unable to calculate shipping charges.",
            data: error.response?.data || null
        });
    }
};



exports.createDelhiveryOrder = async (data, order_ids = []) => {
    try {

        const shipmentPayloads = prepareDelhiveryShipment(data);



        const results = await Promise.all(
            shipmentPayloads.map(async (payload, i) => {
                let dbClient;

                try {
                    const orderId = order_ids[i]?.id;

                    if (!orderId) {
                        throw new Error(`Order ID not found at index ${i}`);
                    }
                    // Create Delhivery shipment
                    const result = await createShipment(payload, order_ids[i]?.id);

                    const groups = result?.results || [];

                    const upload_wbn =
                        groups[0]?.response?.upload_wbn || null;

                    const packages = groups.flatMap(
                        group => group?.response?.packages || []
                    );

                    // Validate package-level shipment success
                    const successfulPackages = packages.filter(element =>
                        String(element?.status || "").toLowerCase() === "success" &&
                        Boolean(element?.waybill?.trim())
                    );


                    const failedPackages = packages.filter(element =>
                        !(
                            String(element?.status || "").toLowerCase() === "success" &&
                            Boolean(element?.waybill?.trim())
                        )
                    );
        

                    const shipmentSuccess =
                        packages.length > 0 &&
                        failedPackages.length === 0 &&
                        groups.every(group => group?.response?.success === true);

                    // Save provider information transactionally
                    dbClient = await pool.connect();

                    try {
                        await dbClient.query("BEGIN");

                        // Verify order exists
                        const orderCheck = await pool.query(
                            `SELECT id
                     FROM public.orders
                     WHERE id = $1
                     FOR UPDATE`,
                            [orderId]
                        );

                        if (orderCheck.rowCount === 0) {
                            throw new Error("Order not found in database");
                        }

                        // Save upload WBN if available
                        if (upload_wbn) {
                            await pool.query(
                                `UPDATE public.orders
                                SET upload_wbn = $1
                                WHERE id = $2`,
                                [upload_wbn, orderId]
                            );
                        }

                    } catch (dbError) {
                        await dbClient.query("ROLLBACK");
                        throw dbError;
                    } finally {
                        dbClient.release();
                        dbClient = null;
                    }

                    if (!upload_wbn) {
                        throw new Error("Upload WBN not found in Delhivery response");
                    }

                    if (!shipmentSuccess) {
                        return {
                            success: false,
                            order_id: orderId,
                            upload_wbn,
                            shipment: result,
                            error: failedPackages
                        };
                    }

                    return {
                        success: true,
                        upload_wbn,
                        order_id: orderId,
                        shipment: result
                    };

                } catch (error) {
                    if (dbClient) {
                        dbClient.release();
                    }

                    console.error("Shipment processing error:", {
                        order_id: order_ids[i]?.id,
                        message: error.message,
                        response: error.response?.data || null
                    });

                    return {
                        success: false,
                        order_id: order_ids[i]?.id,
                        error: error.response?.data || error.message
                    };
                }
            })
        );

        const successCount = results.filter(item => item.success).length;
        const failedCount = results.length - successCount;

        return {
            success: failedCount === 0,
            message: `${successCount} shipment(s) created, ${failedCount} failed`,
            total: results.length,
            successful: successCount,
            failed: failedCount,
            data: results
        };

    } catch (error) {
        console.error(
            "Delhivery Shipment Error:",
            error.response?.data || error.message
        );

        return {
            success: false,
            message: error.message || "Unable to create Delhivery shipment",
            error: error.response?.data || error.message
        };
    }
};





exports.trackDelivery = async (req, res) => {
    try {
        const { waybill, ref_ids } = req.query;
        const response = await axios.get(
            `${process.env.TESTING_DELHIVERY_BASE_URL}/api/v1/packages/json/?waybill=${waybill}&ref_ids=${ref_ids}`,
            {
                headers: {
                    Authorization: `Token ${process.env.TESTING_DELHIVERY_TOKEN}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            }
        );



        ResponseManager.success(res, "Delivery Status fetched Successfully", response?.data);
    } catch (error) {
        ResponseManager?.serverError(res, error.message);
    }
}





















exports.updatePickupAddress = async (req, res) => {
    try {
        const { order_id, pickup_location } = req.body;

        if (
            !Array.isArray(order_id) ||
            order_id.length === 0 ||
            !pickup_location?.trim()
        ) {
            return res?.status(400).json({
                success: false,
                message: "order_id array and pickup_location are required.",
            });
        }

        const token = await getShiprocketToken();

        const response = await axios.patch(
            `${process.env.SHIPROCKET_BASE_URL}/orders/address/pickup`,
            {
                order_id,
                pickup_location: pickup_location.trim(),
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            }
        );

        return res?.status(200).json({
            success: true,
            message:
                response.data?.message ||
                "Pickup location updated successfully.",
            data: response.data,
        });
    } catch (error) {
        console.error(
            "Shiprocket update pickup location error:",
            error.response?.data || error.message
        );

        const status = error.response?.status;

        return res?.status(
            status >= 400 && status < 500 ? status : 502
        ).json({
            success: false,
            message:
                error.response?.data?.message ||
                "Unable to update pickup location.",
            data: error.response?.data || null,
        });
    }
};


exports.createShiprocketOrder = async (req, res) => {
    let client;

    try {
        const payload = req.body;

        // 1. Normalize both address formats
        const address = payload.address || payload;

        const normalizedPayload = {
            ...payload,
            address,
            address_id: payload.address_id || address.id,
            payment_method: payload.payment_method,
            cart_items: payload.cart_items || [],
            total_amount: Number(payload.total_amount || 0),
            subtotal_amount: Number(payload.subtotal_amount || 0),
            discount_amount: Number(payload.discount_amount || 0),
            delivery_charge: Number(payload.delivery_charge || 0),
            notes: payload.notes || address.instructions || "",
        };

        // 2. Validate required fields
        if (!address.name || !address.city || !address.state ||
            !address.pincode || !address.phone) {
            return res?.status(400).json({
                success: false,
                message: "Customer address details are incomplete",
            });
        }

        if (!normalizedPayload.cart_items.length) {
            return res?.status(400).json({
                success: false,
                message: "Cart items are required",
            });
        }

        // 3. Fetch product details
        client = await pool.connect();

        const productIds = [
            ...new Set(
                normalizedPayload.cart_items.map(item => item.product_id)
            )
        ];

        const productRes = await client.query(
            `SELECT *
             FROM public.products
             WHERE id = ANY($1::uuid[])
             AND status = 'true'`,
            [productIds]
        );

        const productMap = new Map(
            productRes.rows.map(product => [product.id, product])
        );

        const order_items = normalizedPayload.cart_items.map(item => {
            const product = productMap.get(item.product_id);

            if (!product) {
                throw new Error(
                    `Product not found: ${item.product_id}`
                );
            }

            return {
                ...product,
                quantity: Number(item.quantity || 1),
                selling_price: Number(
                    item.price ?? product.base_price
                ),
                variant_id: item.variant_id || null,
            };
        });

        // 4. Prepare complete marketplace order
        const updatedPayload = {
            ...normalizedPayload,
            order_items,
        };

        // 5. Get persistent marketplace order ID
        const orderId =
            `${payload.id.split('-')[0]}-${payload.user_id.split('-')[0]}` ||
            `${payload?.address.id.split('-')[0]}-${payload?.address.user_id.split('-')[0]}`;

        if (!orderId) {
            return res?.status(400).json({
                success: false,
                message: "A persistent marketplace order ID is required",
            });
        }

        // 6. Pickup location must be the exact registered
        // Shiprocket pickup_location name for this seller.
        const pickupLocation = payload.pickup_location;

        if (!pickupLocation) {
            return res?.status(400).json({
                success: false,
                message: "Registered Shiprocket pickup location is required",
            });
        }

        // 7. Convert marketplace payload to Shiprocket format
        const shiprocketPayload = normalizeShiprocketPayload(
            updatedPayload,
            orderId,
            pickupLocation
        );

        // 8. Get Shiprocket token
        const token = await getShiprocketToken();

        // 9. Create Shiprocket order
        const response = await axios.post(
            `${process.env.SHIPROCKET_BASE_URL}/orders/create/adhoc`,
            shiprocketPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                timeout: 30000,
            }
        );

        const result = response.data;

        // 10. Check Shiprocket's actual response
        const errorMessage = String(result?.message || "").toLowerCase();

        if (
            result?.status === false ||
            errorMessage.includes("wrong pickup location") ||
            errorMessage.includes("please add billing") ||
            errorMessage.includes("error")
        ) {
            return res?.status(400).json({
                success: false,
                message: result.message || "Shiprocket order creation failed",
                data: result,
            });
        }

        return res?.status(201).json({
            success: true,
            message: "Shiprocket order created successfully",
            marketplace_order_id: orderId,
            data: result,
        });

    } catch (error) {
        console.error(
            "Shiprocket Create Order Error:",
            error.response?.data || error.message
        );

        return res?.status(error.response?.status || 500).json({
            success: false,
            message:
                error.response?.data?.message ||
                error.message ||
                "Shiprocket order creation failed",
            data: error.response?.data || null,
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};