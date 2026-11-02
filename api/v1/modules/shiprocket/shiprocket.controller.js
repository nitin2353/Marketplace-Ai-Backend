const axios = require("axios");
const { getShiprocketToken } = require("../../../../services/shiprocket.service");


exports.getCourierServiceability = async (req, res) => {
    try {
        const {
            pickup_postcode,
            delivery_postcode,
            weight = 1,
            cod = 0,
        } = req.body;

        // Validate required fields
        if (!pickup_postcode || !delivery_postcode) {
            return res?.status(400).json({
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
            return res?.status(400).json({
                success: false,
                message: "Both PIN codes must contain exactly 6 digits.",
            });
        }

        // Validate package weight
        if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
            return res?.status(400).json({
                success: false,
                message: "Weight must be greater than 0.",
            });
        }

        // Validate COD flag
        if (![0, 1, "0", "1"].includes(cod)) {
            return res?.status(400).json({
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

        return res?.status(200).json({
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
            return res?.status(502).json({
                success: false,
                message: "Shiprocket authentication failed. Please retry later.",
            });
        }

        return res?.status(
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


exports.addPickupAddress = async (req, res) => {
    try {
        const {
            pickup_location = 'Home',
            name,
            email,
            phone,
            address = req.address_line_1,
            address_2 = req.address_line_1,
            city,
            state,
            country = "India",
            pincode,
        } = req;

        // 1. Validate required fields
        const requiredFields = {
            pickup_location,
            name,
            email,
            phone,
            address,
            city,
            state,
            pincode,
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => !String(value ?? "").trim())
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res?.status(400).json({
                success: false,
                message: "Required pickup address fields are missing.",
                missingFields,
            });
        }

        // 2. Validate email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(String(email).trim())) {
            return res?.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        // 3. Validate phone number
        const phonePattern = /^\d{10}$/;

        if (!phonePattern.test(String(phone).trim())) {
            return res?.status(400).json({
                success: false,
                message: "Phone number must contain exactly 10 digits.",
            });
        }

        // 4. Validate PIN code
        const pincodePattern = /^\d{6}$/;

        if (!pincodePattern.test(String(pincode).trim())) {
            return res?.status(400).json({
                success: false,
                message: "PIN code must contain exactly 6 digits.",
            });
        }

        // 5. Get Shiprocket authentication token
        const token = await getShiprocketToken();

        // 6. Prepare Shiprocket payload
        const pickupPayload = {
            pickup_location: String(pickup_location+name.length+email.length).trim(),
            name: String(name).trim(),
            email: String(email).trim(),
            phone: String(phone).trim(),
            address: String(address).trim(),
            address_2: String(address_2 ?? "").trim(),
            city: String(city).trim(),
            state: String(state).trim(),
            country: String(country).trim(),
            pin_code: String(pincode).trim(),
        };

        // 7. Register pickup address with Shiprocket
        const response = await axios.post(
            `${process.env.SHIPROCKET_BASE_URL}/settings/company/addpickup`,
            pickupPayload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            }
        );

        // 8. Return success response
        return res?.status(200).json({
            success: true,
            message:
                response.data?.message ||
                "Pickup address registered successfully.",
            data: response.data,
        });

    } catch (error) {
        const statusCode = error.response?.status;
        const shiprocketError = error.response?.data;

        console.error(
            "Shiprocket add pickup address error:",
            shiprocketError || error.message
        );

        // Authentication error
        if (statusCode === 401) {
            return res?.status(502).json({
                success: false,
                message:
                    "Shiprocket authentication failed. Please retry later.",
            });
        }

        // Validation errors from Shiprocket
        if (statusCode === 422) {
            return res?.status(422).json({
                success: false,
                message:
                    shiprocketError?.message ||
                    "Shiprocket rejected the pickup address.",
                data: shiprocketError,
            });
        }

        // Other errors
        return res?.status(
            statusCode >= 400 && statusCode < 500 ? 400 : 502
        ).json({
            success: false,
            message:
                shiprocketError?.message ||
                "Unable to register pickup address right now.",
        });
    }
};




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