
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1';

async function runFullTest() {
    console.log('--- STARTING FULL END-TO-END TEST ---');
    
    let sellerToken, customerToken, sellerId, customerId;
    let productId, variantId, orderId, addressId;

    try {
        console.log('\n[1] Auth: Logging in Seller & Customer...');
        const sRes = await axios.post(`${BASE_URL}/auth/login`, { email: 'seller@test.com', password: 'Password@123' });
        sellerToken = sRes.data.data.token;
        sellerId = sRes.data.data.user.id;

        const cRes = await axios.post(`${BASE_URL}/auth/login`, { email: 'customer@test.com', password: 'Password@123' });
        customerToken = cRes.data.data.token;
        customerId = cRes.data.data.user.id;
        console.log('✅ Auth Success');
    } catch (e) {
        console.error('❌ Auth Failed:', e.message);
        return;
    }

    try {
        console.log('\n[2] Product: Creating Product with Variants...');
        const dummyPath = path.join(__dirname, 'test.png');
        fs.writeFileSync(dummyPath, 'test');
        const form = new FormData();
        form.append('title', 'E2E Test Product ' + Date.now());
        form.append('base_price', '500');
        form.append('category', 'Test');
        form.append('status', 'true');
        form.append('variants', JSON.stringify([{ color: 'Red', size: 'M', stock: 10, final_price: 550 }]));
        form.append('images', fs.createReadStream(dummyPath));

        const res = await axios.post(`${BASE_URL}/product/create`, form, {
            headers: { ...form.getHeaders(), Authorization: `Bearer ${sellerToken}` }
        });
        productId = res.data.data.id;
        variantId = res.data.data.variants[0].id;
        console.log('✅ Product Created Success, ID:', productId);
        fs.unlinkSync(dummyPath);
    } catch (e) {
        console.error('❌ Product Creation Failed:', e.response?.data || e.message);
        return;
    }

    try {
        console.log('\n[3] Address: Adding Address...');
        const res = await axios.post(`${BASE_URL}/address`, {
            name: 'E2E User', mobile: '1111111111', address_line_1: 'E2E Street', city: 'E2E City', state: 'E2E State', pincode: '111111', country: 'India', label: 'Home'
        }, { headers: { Authorization: `Bearer ${customerToken}` } });
        addressId = res.data.data.id;
        console.log('✅ Address Success');
    } catch (e) { console.error('❌ Address Failed'); }

    try {
        console.log('\n[4] Cart: Adding to Cart...');
        await axios.post(`${BASE_URL}/cart/create`, { product_id: productId, variant_id: variantId, total_quantity: 1 }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Cart Success');
    } catch (e) { console.error('❌ Cart Failed'); }

    try {
        console.log('\n[5] Order: Placing COD Order...');
        const res = await axios.post(`${BASE_URL}/order`, { address_id: addressId, payment_method: 'cod' }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        orderId = res.data.data.order.id;
        console.log('✅ Order Success, Stock check:', (await axios.get(`${BASE_URL}/product/${productId}`, { headers: { Authorization: `Bearer ${customerToken}` } })).data.data.stock);
    } catch (e) { console.error('❌ Order Place Failed'); }

    try {
        console.log('\n[6] Order: Confirming & Delivering...');
        await axios.patch(`${BASE_URL}/order/${orderId}/status`, { status: 'confirmed' }, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('✅ Order Confirmed, Stock check:', (await axios.get(`${BASE_URL}/product/${productId}`, { headers: { Authorization: `Bearer ${customerToken}` } })).data.data.stock);
        
        await axios.patch(`${BASE_URL}/order/${orderId}/status`, { status: 'delivered' }, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('✅ Order Delivered');
    } catch (e) { console.error('❌ Order status update failed:', e.response?.data || e.message); }

    try {
        console.log('\n[7] Review: Creating Review...');
        await axios.post(`${BASE_URL}/review`, { order_id: orderId, seller_id: sellerId, product_id: productId, rating: 5, comment: 'Great!' }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Review Success');
    } catch (e) { console.error('❌ Review Failed:', e.response?.data || e.message); }

    try {
        console.log('\n[8] Notification: Checking...');
        const res = await axios.get(`${BASE_URL}/notification`, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('✅ Notifications:', res.data.data.length);
    } catch (e) { console.error('❌ Notification Failed'); }

    console.log('\n--- FULL E2E TEST COMPLETE ---');
}

runFullTest();
