const pool = require('../config/database');
const orderModal = require('../api/v1/modules/orders/order.modal');
const crypto = require('crypto');

async function runTest() {
    console.log("Starting Sold Increment Test...");
    
    const userId = 'f489a32d-2b11-49c2-8a3e-36505396bd32';
    const addressId = (await pool.query("SELECT id FROM public.address WHERE user_id = $1 LIMIT 1", [userId])).rows[0]?.id;
    const nonVariantId = 'b5dcd0f7-52cc-402a-b3f2-60bd5d375105';
    const variantId = 'eb492a99-e439-47a2-aa80-43a991fb1ac3'; // Blue L
    const variantProductId = '28fa7600-a761-46f0-9d59-d6f0bcf24c47';

    if (!addressId) {
        console.error("No address found for user");
        process.exit(1);
    }

    // --- TEST 1: COD FLOW ---
    console.log("\n--- TEST 1: COD FLOW ---");
    
    await pool.query("DELETE FROM public.cart WHERE user_id = $1", [userId]);
    await pool.query(
        "INSERT INTO public.cart (user_id, product_id, total_quantity, amount) VALUES ($1, $2, $3, $4)",
        [userId, nonVariantId, 2, 200]
    );

    const initialSoldNonVariant = (await pool.query("SELECT sold FROM public.products WHERE id = $1", [nonVariantId])).rows[0].sold;
    console.log(`Initial Sold (Non-variant): ${initialSoldNonVariant}`);

    const codOrderRes = await orderModal.createOrderFromCart({
        user_id: userId,
        address_id: addressId,
        payment_method: 'cod',
        created_by: userId,
        modified_by: userId
    });
    
    const codOrderId = codOrderRes.order.id;
    console.log(`COD Order Created: ${codOrderId}`);

    console.log("Confirming COD Order (1st time)...");
    await orderModal.updateOrderStatus(codOrderId, 'confirmed', userId);
    let soldAfter1 = (await pool.query("SELECT sold FROM public.products WHERE id = $1", [nonVariantId])).rows[0].sold;
    console.log(`Sold: ${soldAfter1}`);

    console.log("Confirming COD Order (2nd time)...");
    await orderModal.updateOrderStatus(codOrderId, 'confirmed', userId);
    let soldAfter2 = (await pool.query("SELECT sold FROM public.products WHERE id = $1", [nonVariantId])).rows[0].sold;
    console.log(`Sold: ${soldAfter2} (Expected: ${soldAfter1})`);


    // --- TEST 2: RAZORPAY FLOW ---
    console.log("\n--- TEST 2: RAZORPAY FLOW ---");
    
    await pool.query("DELETE FROM public.cart WHERE user_id = $1", [userId]);
    await pool.query(
        "INSERT INTO public.cart (user_id, product_id, variant_id, total_quantity, amount) VALUES ($1, $2, $3, $4, $5)",
        [userId, variantProductId, variantId, 3, 300]
    );

    const initialSoldVariant = (await pool.query("SELECT sold FROM public.products WHERE id = $1", [variantProductId])).rows[0].sold;
    console.log(`Initial Sold (Variant Product): ${initialSoldVariant}`);

    const rzpOrderRes = await orderModal.createOrderFromCart({
        user_id: userId,
        address_id: addressId,
        payment_method: 'upi',
        payment_gateway: 'razorpay',
        payment_order_id: 'rzp_test_order_456',
        created_by: userId,
        modified_by: userId
    });
    
    const rzpOrderId = rzpOrderRes.order.id;
    console.log(`Razorpay Order Created: ${rzpOrderId}`);

    const razorpay_order_id = 'rzp_test_order_456';
    const razorpay_payment_id = 'pay_test_456';
    const razorpay_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    console.log("Verifying Razorpay Payment (1st time)...");
    await orderModal.verifyOrderPayment({
        order_id: rzpOrderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        modified_by: userId
    });
    let vSoldAfter1 = (await pool.query("SELECT sold FROM public.products WHERE id = $1", [variantProductId])).rows[0].sold;
    console.log(`Sold: ${vSoldAfter1}`);

    console.log("Verifying Razorpay Payment (2nd time)...");
    const result = await orderModal.verifyOrderPayment({
        order_id: rzpOrderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        modified_by: userId
    });
    console.log(`Result: ${result.message}`);
    let vSoldAfter2 = (await pool.query("SELECT sold FROM public.products WHERE id = $1", [variantProductId])).rows[0].sold;
    console.log(`Sold: ${vSoldAfter2} (Expected: ${vSoldAfter1})`);

    process.exit(0);
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
