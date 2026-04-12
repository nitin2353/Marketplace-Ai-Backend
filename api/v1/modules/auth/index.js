const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/index");

const authController = require("./auth.controller");

router.post("/customer/register", authController.customerRregister);
router.post("/seller/register", authController.registerSeller);
router.post("/register", authController.customerRregister);
router.post("/login", authController.login);

router.get("/profile", authMiddleware, authController.getProfile);
router.get("/users", authMiddleware, authController.getAllUsers);
router.get("/users/:id", authMiddleware, authController.getUserById);
router.put("/users/:id", authMiddleware, authController.updateUser);
router.put("/password/users/:id", authMiddleware, authController.updatePassword);
router.delete("/users/:id", authMiddleware, authController.deleteUser);

module.exports = router;