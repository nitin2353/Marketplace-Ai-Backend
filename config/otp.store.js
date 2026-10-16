const otpStore = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const normalizeEmail = (email) => {
    return String(email || "").trim().toLowerCase();
};

const setOtp = (email, otp) => {
    const key = normalizeEmail(email);

    if (!key || !otp) {
        throw new Error("Email and OTP are required");
    }

    const otpData = {
        otp: String(otp).trim(),
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        verified: false,
        createdAt: Date.now(),
    };

    otpStore.set(key, otpData);

    console.log("OTP SAVED KEY:", key);
    console.log("FULL STORE AFTER SAVE:", Array.from(otpStore.entries()));

    return otpData;
};

const getOtp = (email) => {
    const key = normalizeEmail(email);

    console.log("GET OTP KEY:", key);
    console.log("FULL STORE BEFORE GET:", Array.from(otpStore.entries()));

    if (!key) return null;

    const otpData = otpStore.get(key);

    console.log("GET OTP DATA:", otpData);

    if (!otpData) return null;

    if (Date.now() > otpData.expiresAt) {
        otpStore.delete(key);
        return null;
    }

    return otpData;
};

const verifyOtp = (email, otp) => {
    const key = normalizeEmail(email);
    const cleanOtp = String(otp || "").trim();

    if (!key || !cleanOtp) {
        return { success: false, message: "Email and OTP are required" };
    }

    const otpData = getOtp(key);

    if (!otpData) {
        return { success: false, message: "Invalid or expired OTP" };
    }

    if (String(otpData.otp).trim() !== cleanOtp) {
        return { success: false, message: "Invalid OTP" };
    }

    const verifiedData = {
        ...otpData,
        verified: true,
        verifiedAt: Date.now(),
    };

    otpStore.set(key, verifiedData);

    return {
        success: true,
        message: "OTP verified successfully",
        data: verifiedData,
    };
};

const isOtpVerified = (email) => {
    const otpData = getOtp(email);
    return Boolean(otpData?.verified);
};

const deleteOtp = (email) => {
    const key = normalizeEmail(email);
    return key ? otpStore.delete(key) : false;
};

module.exports = {
    setOtp,
    getOtp,
    verifyOtp,
    isOtpVerified,
    deleteOtp,
};