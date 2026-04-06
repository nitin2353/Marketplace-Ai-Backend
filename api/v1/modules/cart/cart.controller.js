const Response = require("../response");
const CartModal = require('./cart.modal')


const handleGetCart = async (req, res) => {
    try {
        const id = req.user.id
        const data = await CartModal.getAllCart(id);

        Response.success(res, "Get Wishlist Data Successfully", data);

    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};


const handleUpdateCart = async (req, res) => {
    try {
        const cartId = req.params.id;
        const quantity = req.body.quantity
        const userId = req.user.id

        await CartModal.updateCart(quantity, cartId, userId);

        Response.success(res, "Wishlist updated Successfully");

    } catch (err) {
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};


const handleCreateCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const payload = req.body

        const data = await CartModal.createCart(payload, userId);

        Response.created(res, "Cart Created Successfully", data);

    } catch (err) {
       return Response.serverError(res, err.message || "Internal Server Error");
    }
};

const handleDeleteCart = async (req, res) => {
    try {
        const cartId = req.params.id
        const userId = req.user.id

        const result = await CartModal.deleteCart(cartId, userId);

        Response.success(res, "Cart Deleted Successfully", result);

    } catch (error) {
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};

const handleDeleteAllCartItems = async (req, res) => {
    try {
        
        const userId = req.user.id

        const result = await CartModal.deleteCartAll(userId);

        Response.success(res, "Cart Deleted Successfully", result);

    } catch (err) {
        return Response.serverError(res, err.message || "Internal Server Error");
    }
};

module.exports = { handleGetCart, handleUpdateCart, handleCreateCart, handleDeleteCart, handleDeleteAllCartItems }