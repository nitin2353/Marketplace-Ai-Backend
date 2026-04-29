
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testProducts() {
    console.log('--- STARTING PRODUCT & STOCK TESTS ---');
    
    let sellerToken;
    try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'seller@test.com',
            password: 'Password@123'
        });
        sellerToken = loginRes.data.data.token;
    } catch (e) {
        console.error('Login failed for product test');
        return;
    }

    // Create a dummy image file
    const dummyImagePath = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(dummyImagePath, 'dummy content');

    let variantProductId;
    try {
        console.log('\n[1] Creating Product with Variants...');
        
        const form = new FormData();
        form.append('title', 'Test Variant Product');
        form.append('description', 'Description');
        form.append('base_price', '2000');
        form.append('category', 'Clothing');
        form.append('status', 'true');
        form.append('variants', JSON.stringify([
            { color: 'Red', size: 'M', stock: 20, final_price: 2100 },
            { color: 'Blue', size: 'L', stock: 30, final_price: 2200 }
        ]));
        form.append('images', fs.createReadStream(dummyImagePath));

        const res = await axios.post(`${BASE_URL}/product/create`, form, {
            headers: { 
                ...form.getHeaders(),
                Authorization: `Bearer ${sellerToken}` 
            }
        });
        console.log('✅ Variant Product Created Success');
        variantProductId = res.data.data.id;
    } catch (error) {
        console.error('❌ Variant Product Creation Failed:', error.response?.data || error.message);
    }

    // 2. Verify Stock Sync
    if (variantProductId) {
        try {
            console.log('\n[2] Verifying Stock Sync...');
            const res = await axios.get(`${BASE_URL}/product/${variantProductId}`, {
                headers: { Authorization: `Bearer ${sellerToken}` }
            });
            const product = res.data.data;
            console.log('Product Total Stock:', product.stock);
            if (Number(product.stock) === 50) {
                console.log('✅ Stock Sync Correct (20+30=50)');
            } else {
                console.error('❌ Stock Sync Failed! Expected 50, got:', product.stock);
            }
        } catch (error) {
            console.error('❌ Stock Verification Failed:', error.response?.data || error.message);
        }
    }

    console.log('\n--- PRODUCT & STOCK TESTS COMPLETE ---');
    // Cleanup
    if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
}

testProducts();
