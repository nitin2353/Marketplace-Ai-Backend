const express = require("express");
const router = express.Router();
const pool = require("../../../../config/database");

// IMPORTANT:
// Add your existing admin authentication middleware here.

router.get("/sellers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id AS seller_id,
        u.business_name,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        COALESCE(SUM(p.seller_amount), 0) AS seller_amount,
        COALESCE(SUM(p.seller_earning), 0) AS seller_earning,
        COUNT(p.id) AS payment_records
      FROM public.users u
      LEFT JOIN public.payments p
        ON p.seller_id = u.id
      WHERE LOWER(u.role) = 'seller'
      GROUP BY
        u.id, u.business_name, u.first_name,
        u.last_name, u.email, u.phone, u.status
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      sellers: result.rows
    });
  } catch (error) {
    console.error("Seller fetch failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to fetch sellers"
    });
  }
});

router.patch("/sellers/:id/status", async (req, res) => {
  const { status } = req.body;
  const sellerId = req.params.id;

  if (!["active", "inactive"].includes(
    String(status).toLowerCase()
  )) {
    return res.status(400).json({
      success: false,
      message: "Status must be active or inactive"
    });
  }

  try {
    const result = await pool.query(
      `UPDATE public.users
       SET status = $1
       WHERE id = $2
         AND LOWER(role) = 'seller'
       RETURNING id, business_name, email, status`,
      [String(status).toLowerCase(), sellerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    res.json({
      success: true,
      seller: result.rows[0]
    });
  } catch (error) {
    console.error("Seller status update failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to update seller status"
    });
  }
});

module.exports = router;