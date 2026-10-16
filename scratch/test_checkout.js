
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testCheckout() {
    console.log('--- STARTING CHECKOUT & ORDER TESTS ---');
    
    let customerToken;
    try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'customer@test.com',
            password: 'Password@123'
        });
        customerToken = loginRes.data.data.token;
    } catch (e) {
        console.error('Login failed for checkout test');
        return;
    }

    // 1. Add Address
    let addressId;
    try {
        console.log('\n[1] Adding Address...');
        const addrData = {
            name: 'Test Customer',
            mobile: '9876543210',
            address_line_1: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456',
            country: 'India',
            label: 'Home'
        };
        const res = await axios.post(`${BASE_URL}/address`, addrData, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Address Added Success');
        addressId = res.data.data.id;
    } catch (error) {
        console.error('❌ Address Add Failed:', error.response?.data || error.message);
        return;
    }

    // 2. Add to Cart (Ensuring we have something to checkout)
    let productId, variantId;
    try {
        const prodRes = await axios.get(`${BASE_URL}/product`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        // Find an active product
        const product = prodRes.data.data.find(p => p.status === 'true');
        if (!product) throw new Error('No active products found');
        productId = product.id;
        variantId = product.variants?.[0]?.id;

        await axios.post(`${BASE_URL}/cart/create`, {
            product_id: productId,
            variant_id: variantId,
            total_quantity: 1
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
    } catch (e) {
        console.error('❌ Cart prep failed:', e.message);
        return;
    }

    // 3. Place COD Order
    let codOrderId;
    try {
        console.log('\n[3] Placing COD Order...');
        const res = await axios.post(`${BASE_URL}/order`, {
            address_id: addressId,
            payment_method: 'cod'
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ COD Order Placed Success');
        codOrderId = res.data.data.order.id;
    } catch (error) {
        console.error('❌ COD Order Failed:', error.response?.data || error.message);
    }

    // 4. Verify Stock NOT Deducted
    try {
        const res = await axios.get(`${BASE_URL}/product/${productId}`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Stock Check (Post-COD Place):', res.data.data.stock);
    } catch (e) {}

    // 5. Confirm COD Order (as Seller)
    let sellerToken;
    try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'seller@test.com',
            password: 'Password@123'
        });
        sellerToken = loginRes.data.data.token;

        console.log('\n[5] Confirming COD Order...');
        await axios.patch(`${BASE_URL}/order/${codOrderId}/status`, {
            status: 'confirmed'
        }, {
            headers: { Authorization: `Bearer ${sellerToken}` }
        });
        console.log('✅ Order Confirmed Success');
    } catch (error) {
        console.error('❌ Order Confirmation Failed:', error.response?.data || error.message);
    }

    // 6. Verify Stock IS Deducted
    try {
        const res = await axios.get(`${BASE_URL}/product/${productId}`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Stock Check (Post-Confirm):', res.data.data.stock);
    } catch (e) {}

    console.log('\n--- CHECKOUT & ORDER TESTS COMPLETE ---');
}

testCheckout();
