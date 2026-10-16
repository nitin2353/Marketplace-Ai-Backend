const Response = require("../response");
const AddressModal = require('./address.modal');


const getAllAddresses = async (req, res) => {
    try {
        // Customers should only see their own addresses
        const userId = req.user.id;
        const data = await AddressModal.getAddressesByUserId(userId);
        Response.success(res, "Get Addresses Successfully", data);
    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};


const getAddressById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const data = await AddressModal.getAddressById(id, userId);

        if (!data) {
            return Response.notFound(res, "Address not found or unauthorized");
        }

        Response.success(res, "Get Address Successfully", data);
    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};


const getAddressesByUserId = async (req, res) => {
    try {
        const id = req.user.id;
        const data = await AddressModal.getAddressesByUserId(id);
        Response.success(res, "Get Addresses Data Successfully", data);
    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};


const createAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const payload = req.body;

        const addressData = {
            ...payload,
            user_id: userId,
            created_by: userId,
            modified_by: userId
        };
        const data = await AddressModal.createAddress(addressData);
        Response.created(res, "Address created successfully", data);
    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};

const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const payload = req.body;

        const updateData = {
            ...payload,
            modified_by: userId
        };

        const data = await AddressModal.updateAddress(id, userId, updateData);

        if (!data) {
            return Response.notFound(res, "Address not found or unauthorized");
        }

        Response.success(res, "Address updated successfully", data);
    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};


const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const data = await AddressModal.deleteAddress(id, userId);

        if (!data) {
            return Response.notFound(res, "Address not found or unauthorized");
        }

        Response.success(res, "Address deleted successfully", data);
    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};

module.exports = {
    getAllAddresses,
    getAddressById,
    getAddressesByUserId,
    createAddress,
    updateAddress,
    deleteAddress
};