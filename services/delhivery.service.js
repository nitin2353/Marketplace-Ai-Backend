
const axios = require("axios");
const pool = require("../config/database");

const DELHIVERY_TOKEN = process.env.DELHIVERY_TOKEN;
const DELHIVERY_BASE_URL = process.env.DELHIVERY_BASE_URL;


const delhiveryClient = axios.create({
    baseURL: process.env.DELHIVERY_BASE_URL,
    timeout: 30000,
    headers: {
        Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        Accept: "application/json"
    }
});



const checkPincode = async (pincode) => {
    try {
        if (!/^\d{6}$/.test(String(pincode))) {
            throw new Error("Invalid 6 digit pincode");
        }

        const response = await delhiveryClient.get(
            "/c/api/pin-codes/json/",
            {
                params: {
                    filter_codes: pincode
                }
            }
        );

        return response.data;

    } catch (error) {
        console.error(
            "Delhivery API Error:",
            error.response?.data || error.message
        );

        throw error;
    }
};


const createShipment = async (input, order_id) => {
    const url = `${process.env.TESTING_DELHIVERY_BASE_URL}/api/cmu/create.json`;

    try {
        // 1. Validate configuration
        const token = process.env.DELHIVERY_TOKEN;

        if (!token) {
            throw new Error("DELHIVERY_TOKEN is missing");
        }

        if (!input || (Array.isArray(input) && input.length === 0)) {
            throw new Error("Shipment input is empty");
        }

        // 2. Normalize input into pickup-location groups
        const inputItems = Array.isArray(input) ? input : [input];
        const groupedShipments = new Map();

        for (const item of inputItems) {
            if (!item || typeof item !== "object") {
                throw new Error("Invalid shipment group");
            }

            // Already grouped format
            if (Array.isArray(item.shipments)) {
                const pickupName = item.pickup_location?.name?.trim();

                if (!pickupName) {
                    throw new Error("Pickup location name is required");
                }

                if (item.shipments.length === 0) {
                    throw new Error(
                        `No shipments found for pickup: ${pickupName}`
                    );
                }

                if (!groupedShipments.has(pickupName)) {
                    groupedShipments.set(pickupName, []);
                }

                groupedShipments.get(pickupName).push(...item.shipments);
            } else {
                // Flat shipment format
                const pickupName = item.pickup_location?.name?.trim();

                if (!pickupName) {
                    throw new Error(
                        `Pickup location missing for order: ${item.order || "Unknown"}`
                    );
                }

                if (!groupedShipments.has(pickupName)) {
                    groupedShipments.set(pickupName, []);
                }

                groupedShipments.get(pickupName).push(item);
            }
        }

        // 3. Validate and normalize individual shipments
        const normalizeShipment = (shipment) => {
            if (!shipment || typeof shipment !== "object") {
                throw new Error("Invalid shipment data");
            }

            const requiredFields = [
                "name",
                "add",
                "pin",
                "city",
                "state",
                "phone",
                "order",
                "payment_mode"
            ];

            for (const field of requiredFields) {
                if (
                    shipment[field] === undefined ||
                    shipment[field] === null ||
                    String(shipment[field]).trim() === ""
                ) {
                    throw new Error(
                        `Missing required shipment field: ${field}`
                    );
                }
            }

            const pin = String(shipment.pin).trim();
            const phone = String(shipment.phone).trim();
            const totalAmount = Number(shipment.total_amount);
            const codAmount =
                shipment.cod_amount === undefined ||
                    shipment.cod_amount === null
                    ? 0
                    : Number(shipment.cod_amount);

            const quantity =
                shipment.quantity === undefined
                    ? 1
                    : Number(shipment.quantity);

            if (!/^\d{6}$/.test(pin)) {
                throw new Error(`Invalid PIN code: ${pin}`);
            }

            if (!/^\d{10}$/.test(phone)) {
                throw new Error(`Invalid phone number: ${phone}`);
            }

            if (!Number.isFinite(totalAmount) || totalAmount < 0) {
                throw new Error(
                    `Invalid total_amount for order: ${shipment.order}`
                );
            }

            if (!Number.isFinite(codAmount) || codAmount < 0) {
                throw new Error(
                    `Invalid cod_amount for order: ${shipment.order}`
                );
            }

            if (!Number.isInteger(quantity) || quantity < 1) {
                throw new Error(
                    `Invalid quantity for order: ${shipment.order}`
                );
            }

            const paymentMode = String(shipment.payment_mode.toUpperCase() == 'COD' ? "COD" : "PREPAID")
                .trim()
                .toUpperCase();

            if (!["COD", "PREPAID"].includes(paymentMode)) {
                throw new Error(
                    `Invalid payment mode: ${paymentMode}`
                );
            }

            if (paymentMode === "COD" && codAmount <= 0) {
                throw new Error(
                    `COD amount must be greater than zero for order: ${shipment.order}`
                );
            }

            return {
                name: String(shipment.name).trim(),
                add: String(shipment.add).trim(),
                pin,
                city: String(shipment.city).trim(),
                state: String(shipment.state).trim(),
                country: String(shipment.country || "India").trim(),
                phone,
                product_id: shipment?.product_id,
                order: String(shipment.order).trim(),
                payment_mode: paymentMode,
                products_desc:
                    String(
                        shipment.products_desc || "Marketplace Products"
                    ).trim(),
                total_amount: totalAmount,
                cod_amount: codAmount,
                quantity,
                order_date: shipment.order_date,
                waybill: shipment.waybill || ""
            };
        };
        // 4. Send one API request per pickup location
        const results = [];

        for (const [pickupName, shipments] of groupedShipments) {
            try {
                const normalizedShipments = shipments.map(
                    normalizeShipment
                );

                const payload = {
                    shipments: normalizedShipments,
                    pickup_location: {
                        name: pickupName
                    }
                };
                const formData = new URLSearchParams();

                formData.append("format", "json");
                formData.append("data", JSON.stringify(payload));

                const response = await axios.post(
                    url,
                    formData.toString(),
                    {
                        headers: {
                            Authorization: `Token ${process.env.TESTING_DELHIVERY_TOKEN}`,
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },
                        timeout: 30000
                    }
                );

                response?.data?.packages?.forEach(async (element, i) => {
                    const ordItemRes = await pool.query(
                        `UPDATE public.order_items
                                    SET waybill = $1,
                                        refnum = $2,
                                        client = $3
                                    WHERE product_id = $4 AND order_id = $5
                                    RETURNING id`,
                        [
                            element.waybill,
                            element.refnum || null,
                            element.client || null,
                            payload?.shipments[i]?.product_id,
                            order_id
                        ]
                    );

                    if (ordItemRes.rowCount === 0) {
                        throw new Error(
                            "No order items found while updating shipment details"
                        );
                    }
                })


                await pool.query("COMMIT");

                results.push({
                    pickup_location: pickupName,
                    success: true,
                    response: response.data
                });
            } catch (error) {
                console.error(
                    `Delhivery shipment failed for ${pickupName}:`,
                    error.response?.data || error.message
                );

                results.push({
                    pickup_location: pickupName,
                    success: false,
                    shipment_count: shipments.length,
                    error:
                        error.response?.data ||
                        error.message
                });
            }
        }

        // 5. Return consolidated result
        const successful = results.filter(
            (item) => item.success
        );

        const failed = results.filter(
            (item) => !item.success
        );

        return {
            success: failed.length === 0,
            message:
                failed.length === 0
                    ? "All shipment groups processed successfully"
                    : "Some shipment groups failed",
            total_groups: results.length,
            successful_groups: successful.length,
            failed_groups: failed.length,
            total_shipments: results.reduce(
                (sum, item) => sum + item.shipment_count,
                0
            ),
            results
        };

    } catch (error) {
        console.error(
            "Delhivery Create Shipment Error:",
            error.response?.data || error.message
        );

        throw error;
    }
};




const cancelShipment = async ({
    waybill,
    order_id,
    orderId
} = {}) => {
    try {
        // STEP 1: Validate configuration
        if (!process.env.TESTING_DELHIVERY_TOKEN) {
            throw new Error("DELHIVERY_TOKEN is missing");
        }

        // STEP 2: Normalize identifiers
        const normalizedWaybill =
            waybill !== undefined && waybill !== null
                ? String(waybill).trim()
                : "";

        const normalizedOrderId =
            order_id || orderId
                ? String(order_id || orderId).trim()
                : "";

        // At least one identifier is required
        if (!normalizedWaybill && !normalizedOrderId) {
            throw new Error(
                "Either Waybill or Delhivery Order ID is required"
            );
        }

        // STEP 3: Prepare cancellation payload
        const payload = {
            cancellation: "true"
        };

        if (normalizedWaybill) {
            payload.waybill = normalizedWaybill;
        }

        if (normalizedOrderId) {
            payload.order_id = normalizedOrderId;
        }

        // STEP 4: Call Delhivery cancellation API
        const response = await axios.post(
            process.env.TESTING_DELHIVERY_BASE_URL,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                timeout: 30000
            }
        );

        const result = response?.data;

        // STEP 5: Check API-level success
        // Delhivery can return HTTP 200 even on failure.
        if (
            !result ||
            String(result.status || "").toLowerCase() === "failure" ||
            result.error
        ) {
            return {
                success: false,
                message:
                    result?.error ||
                    "Delhivery shipment cancellation failed",
                data: result || null
            };
        }

        // STEP 6: Return successful response
        return {
            success: true,
            message: "Shipment cancellation request processed successfully",
            waybill: result.waybill || normalizedWaybill || null,
            order_id: result.order_id || normalizedOrderId || null,
            data: result
        };

    } catch (error) {
        console.error(
            "Delhivery Cancel Shipment Error:",
            error.response?.data || error.message
        );

        throw error;
    }
};







module.exports = {
    delhiveryClient,
    checkPincode,
    createShipment,
    cancelShipment
};
