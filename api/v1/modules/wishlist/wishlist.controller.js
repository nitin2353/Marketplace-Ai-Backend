const Response = require("../response");
const WhishlistModal = require('./wishlist.modal')


const handleGetWishlist = async (req, res) => {
    try {
        const id = req.user.id
        
        const data = await WhishlistModal.getAllWishlist(id);

        Response.success(res, "Get Wishlist Data Successfully", data);

    } catch (err) {
        Response.serverError(res, err.message || "Internal Server error");
    }
};



const handleToogleWishlist = async (req, res) => {
    try {
        const id = req.body.id
        const userId = req.user.id
        
        const result = await WhishlistModal.toggleWishlist(id, userId);

        Response.success(res, "Item Added in Your Wishlist", result);

    } catch (error) {
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};



const handleRemoveWishlistAll = async (req, res) => {
    try {
        const userId = req.user.id
        
        const result = await WhishlistModal.removeAllWishlist(userId);

        Response.success(res, "All Item Removed Successfully", result);

    } catch (error) {
        return Response.serverError(res, error.message || "Internal Server Error");
    }
};


module.exports = {
    handleGetWishlist,
    handleToogleWishlist,
    handleRemoveWishlistAll
}