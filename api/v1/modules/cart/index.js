const express = require('express');
const router = express.Router();
const CartController = require("./cart.controller");
const authMiddleware = require("../middlewares/index");

router.get("/", authMiddleware, CartController.handleGetCart);
router.put("/:id", authMiddleware, CartController.handleUpdateCart)
router.post("/create", authMiddleware, CartController.handleCreateCart);
router.delete("/:id", authMiddleware, CartController.handleDeleteCart)
router.delete("/", authMiddleware, CartController.handleDeleteAllCartItems)



module.exports = router;