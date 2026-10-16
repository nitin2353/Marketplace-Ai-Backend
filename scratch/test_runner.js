const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000/api/v1';

const customerCreds = { email: 'nv5327260@gmail.com', password: 'Nitin@1234' };
const sellerCreds = { email: 'nitin.v@ibirdsservices.com', password: 'Nitin@123400' };

const imgBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
if (!fs.existsSync('test.png')) { fs.writeFileSync('test.png', imgBuffer); }

function parseJwt(token) { return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()); }

async function runTests() {
    let customerToken = null; let sellerToken = null;
    let customerId = null; let sellerId = null;
    let createdProductId = null; let orderId = null;

    console.log("--- 1. Auth ---");
    try {
        const res = await axios.post(`${API_URL}/auth/login`, customerCreds);
        customerToken = res.data.data.token; customerId = parseJwt(customerToken).id;
        console.log('Customer login: SUCCESS');
    } catch (e) { console.error('Customer login: FAILED', e.response?.data || e.message); }

    try {
        const res = await axios.post(`${API_URL}/auth/login`, sellerCreds);
        sellerToken = res.data.data.token; sellerId = parseJwt(sellerToken).id;
        console.log('Seller login: SUCCESS');
    } catch (e) { console.error('Seller login: FAILED', e.response?.data || e.message); }

    console.log("\n--- 2. Seller product flow ---");
    try {
        const form = new FormData();
        form.append('images', fs.createReadStream('test.png'));
        form.append('title', 'Test Product For Review');
        form.append('description', 'Test');
        form.append('base_price', '100');
        form.append('stock', '10');
        form.append('status', 'active');
        const res = await axios.post(`${API_URL}/product/create`, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${sellerToken}` } });
        createdProductId = res.data.data.id;
        console.log('Create product: SUCCESS');
    } catch (e) { console.error('Create product: FAILED', e.response?.data || e.message); }

    console.log("\n--- 3. Cart & Order ---");
    let addressId = null;
    try {
        const res = await axios.get(`${API_URL}/address/`, { headers: { Authorization: `Bearer ${customerToken}` } });
        if (res.data.data && res.data.data.length > 0) addressId = res.data.data[0].id;
    } catch (e) { }

    try {
        await axios.post(`${API_URL}/cart/create`, { product_id: createdProductId, quantity: 1 }, { headers: { Authorization: `Bearer ${customerToken}` } });
        const res = await axios.post(`${API_URL}/order/`, { address_id: addressId, payment_method: 'cod' }, { headers: { Authorization: `Bearer ${customerToken}` } });
        orderId = res.data.data.id || res.data.data.order_id || res.data.data.order?.id;
        console.log('Order created: SUCCESS', orderId);
        
        await axios.patch(`${API_URL}/order/${orderId}/status`, { status: 'delivered' }, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Order status updated to delivered: SUCCESS');
    } catch (e) { console.error('Order/Cart: FAILED', e.response?.data || e.message); }

    console.log("\n--- 5. Reviews ---");
    try {
        const res = await axios.post(`${API_URL}/review/`, {
            order_id: orderId,
            seller_id: sellerId,
            product_id: createdProductId,
            rating: 5,
            comment: "Great product!"
        }, { headers: { Authorization: `Bearer ${customerToken}` } });
        console.log('Create review: SUCCESS');
    } catch (e) { console.error('Create review: FAILED', e.response?.data || e.message); }

    try {
        const res = await axios.get(`${API_URL}/review/product/${createdProductId}/summary`, { headers: { Authorization: `Bearer ${customerToken}` } });
        console.log('Product rating summary: SUCCESS', res.data.data);
    } catch (e) { console.error('Product rating summary: FAILED', e.response?.data || e.message); }

    console.log("\n--- 6. Notifications ---");
    try {
        const res = await axios.get(`${API_URL}/notification/seller/${sellerId}`, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Get seller notifications: SUCCESS, count=', res.data.data?.length);
    } catch (e) { console.error('Get seller notifications: FAILED', e.response?.data || e.message); }

    console.log("\n--- 7. Reports ---");
    try {
        const res = await axios.get(`${API_URL}/report/seller-summary/${sellerId}`, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Seller summary: SUCCESS');
    } catch (e) { console.error('Seller summary: FAILED', e.response?.data || e.message); }

    try {
        const res = await axios.get(`${API_URL}/report/recent-activities`, { headers: { Authorization: `Bearer ${sellerToken}` } });
        console.log('Recent activities: SUCCESS', res.data.data?.length);
    } catch (e) { console.error('Recent activities: FAILED', e.response?.data || e.message); }
}
runTests();
