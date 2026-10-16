const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000/api/v1';
const customerCreds = { email: 'nv5327260@gmail.com', password: 'Nitin@1234' };
const RAZORPAY_KEY_SECRET = 'N3Os6n4j4He7MqC4pTDrJRyU';

function parseJwt(token) { return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()); }

async function runTests() {
    let customerToken = null; let customerId = null;

    try {
        const res = await axios.post(`${API_URL}/auth/login`, customerCreds);
        customerToken = res.data.data.token; customerId = parseJwt(customerToken).id;
        console.log('Customer login: SUCCESS');
    } catch (e) { console.error('Customer login: FAILED', e.response?.data || e.message); return; }

    let addressId = null;
    try {
        const res = await axios.get(`${API_URL}/address/`, { headers: { Authorization: `Bearer ${customerToken}` } });
        if (res.data.data && res.data.data.length > 0) addressId = res.data.data[0].id;
    } catch (e) {}

    // We assume the customer has something in the cart (if not, it will fail, but cart was populated in previous test run, maybe? Let's add a product just in case)
    let productId = null;
    try {
        const prodRes = await axios.get(`${API_URL}/product/`, { headers: { Authorization: `Bearer ${customerToken}` } });
        const products = Array.isArray(prodRes.data.data) ? prodRes.data.data : prodRes.data.data.products;
        if (products && products.length > 0) productId = products[0].id;
        await axios.post(`${API_URL}/cart/create`, { product_id: productId, quantity: 1 }, { headers: { Authorization: `Bearer ${customerToken}` } });
    } catch(e) { console.error("Cart setup failed", e.response?.data || e.message); }

    console.log("\n--- Razorpay Payment Flow ---");
    let paymentOrderId = null;
    try {
        const res = await axios.post(`${API_URL}/payment/create-order`, {
            address_id: addressId,
            payment_method: 'card',
            subtotal_amount: 100
        }, { headers: { Authorization: `Bearer ${customerToken}` } });
        paymentOrderId = res.data.data.razorpay_order_id;
        console.log('Create razorpay order: SUCCESS', paymentOrderId);
    } catch (e) { console.error('Create razorpay order: FAILED', e.response?.data || e.message); }

    if (paymentOrderId) {
        try {
            const paymentId = 'pay_test_' + Date.now();
            const signature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${paymentOrderId}|${paymentId}`).digest("hex");

            const res = await axios.post(`${API_URL}/payment/verify-and-create-order`, {
                address_id: addressId,
                payment_method: 'card',
                payment_id: paymentId,
                payment_order_id: paymentOrderId,
                payment_signature: signature,
                subtotal_amount: 100
            }, { headers: { Authorization: `Bearer ${customerToken}` } });
            
            console.log('Verify and create order: SUCCESS', res.data.data.order_id);
        } catch (e) { console.error('Verify and create order: FAILED', e.response?.data || e.message); }
    }
}
runTests();
