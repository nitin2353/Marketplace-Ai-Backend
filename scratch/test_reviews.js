
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testReviews() {
    console.log('--- STARTING REVIEWS & NOTIFICATIONS TESTS ---');
    
    let customerToken, sellerToken, userId, sellerId, productId, orderId;
    try {
        const cLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'customer@test.com',
            password: 'Password@123'
        });
        customerToken = cLogin.data.data.token;
        userId = cLogin.data.data.user.id;

        const sLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'seller@test.com',
            password: 'Password@123'
        });
        sellerToken = sLogin.data.data.token;
        sellerId = sLogin.data.data.user.id;
    } catch (e) {
        console.error('Login failed');
        return;
    }

    // Prepare an order in 'delivered' status
    try {
        const prodRes = await axios.get(`${BASE_URL}/product`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const product = prodRes.data.data.find(p => p.status === 'true');
        productId = product.id;

        // Place & Deliver
        const orderRes = await axios.post(`${BASE_URL}/order`, {
            address_id: (await axios.get(`${BASE_URL}/address`, { headers: { Authorization: `Bearer ${customerToken}` } })).data.data[0].id,
            payment_method: 'cod'
        }, { headers: { Authorization: `Bearer ${customerToken}` } });
        orderId = orderRes.data.data.order.id;

        await axios.patch(`${BASE_URL}/order/${orderId}/status`, { status: 'delivered' }, {
            headers: { Authorization: `Bearer ${sellerToken}` }
        });
        console.log('✅ Order Prepared & Delivered');
    } catch (e) {
        console.error('Prep failed:', e.message);
        return;
    }

    // 1. Create Review
    try {
        console.log('\n[1] Creating Review...');
        const res = await axios.post(`${BASE_URL}/review`, {
            order_id: orderId,
            seller_id: sellerId,
            product_id: productId,
            rating: 5,
            comment: 'Excellent product!'
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Review Success');
    } catch (error) {
        console.error('❌ Review Failed:', error.response?.data || error.message);
    }

    // 2. Notifications
    try {
        console.log('\n[2] Checking Notifications...');
        const res = await axios.get(`${BASE_URL}/notification`, {
            headers: { Authorization: `Bearer ${sellerToken}` }
        });
        console.log('✅ Notifications Fetched Success, Count:', res.data.data.length);
    } catch (error) {
        console.error('❌ Notification Fetch Failed:', error.response?.data || error.message);
    }

    console.log('\n--- REVIEWS & NOTIFICATIONS TESTS COMPLETE ---');
}

testReviews();
