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

