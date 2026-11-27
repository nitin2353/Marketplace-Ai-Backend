const express = require("express");
const router = express.Router();
const returnController = require("./return.controller");
const authMiddleware = require("../middlewares");
const upload = require("../middlewares/multer");

router.post("/", authMiddleware, upload.array("images", 5), returnController.createReturnRequest);
router.get("/customer", authMiddleware, returnController.getCustomerReturnRequests);
router.get("/seller", authMiddleware, returnController.getSellerReturnRequests);
router.get("/:id", authMiddleware, returnController.getReturnRequestById);
router.patch("/:id/status", authMiddleware, returnController.updateReturnStatus);
router.patch("/:id/cancel", authMiddleware, returnController.cancelReturnRequest);

module.exports = router;
