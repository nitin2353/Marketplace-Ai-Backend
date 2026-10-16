
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testCart() {
    console.log('--- STARTING CART & WISHLIST TESTS ---');
    
    let customerToken;
    try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'customer@test.com',
            password: 'Password@123'
        });
        customerToken = loginRes.data.data.token;
    } catch (e) {
        console.error('Login failed for cart test');
        return;
    }

    // Get an active product
    let productId, variantId;
    try {
        const res = await axios.get(`${BASE_URL}/product`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const product = res.data.data.find(p => p.variants && p.variants.length > 0);
        if (!product) throw new Error('No product with variants found');
        productId = product.id;
        variantId = product.variants[0].id;
        console.log('Using Product:', product.title, 'Variant:', variantId);
    } catch (error) {
        console.error('❌ Failed to get products:', error.message);
        return;
    }

    // 1. Add to Cart
    try {
        console.log('\n[1] Adding to Cart...');
        const res = await axios.post(`${BASE_URL}/cart/create`, {
            product_id: productId,
            variant_id: variantId,
            total_quantity: 2
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Add to Cart Success');
    } catch (error) {
        console.error('❌ Add to Cart Failed:', error.response?.data || error.message);
    }

    // 2. Fetch Cart
    try {
        console.log('\n[2] Fetching Cart...');
        const res = await axios.get(`${BASE_URL}/cart`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Cart Fetched Success, Items:', res.data.data.length);
    } catch (error) {
        console.error('❌ Fetch Cart Failed:', error.response?.data || error.message);
    }

    // 3. Add to Wishlist
    try {
        console.log('\n[3] Adding to Wishlist...');
        const res = await axios.post(`${BASE_URL}/wishlist/toogle`, {
            product_id: productId
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Add to Wishlist Success');
    } catch (error) {
        console.error('❌ Add to Wishlist Failed:', error.response?.data || error.message);
    }

    console.log('\n--- CART & WISHLIST TESTS COMPLETE ---');
}

testCart();
