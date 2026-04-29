
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testAuth() {
    console.log('--- STARTING AUTH & PROFILE TESTS ---');
    
    let sellerToken, customerToken;

    // 1. Seller Register
    try {
        console.log('\n[1] Testing Seller Registration...');
        const sellerData = {
            name: 'Test Seller',
            email: 'seller@test.com',
            password: 'Password@123',
            business_name: 'Test Business'
        };
        const res = await axios.post(`${BASE_URL}/auth/seller/register`, sellerData);
        console.log('✅ Seller Registration Success');
        sellerToken = res.data.data.token;
    } catch (error) {
        if (error.response?.data?.message === 'Email already exists') {
            console.log('ℹ️ Seller already exists, logging in...');
        } else {
            console.error('❌ Seller Registration Failed:', error.response?.data || error.message);
        }
    }

    // 2. Seller Login
    try {
        console.log('\n[2] Testing Seller Login...');
        const loginData = {
            email: 'seller@test.com',
            password: 'Password@123'
        };
        const res = await axios.post(`${BASE_URL}/auth/login`, loginData);
        console.log('✅ Seller Login Success');
        sellerToken = res.data.data.token;
        if (res.data.data.user.role !== 'seller') console.error('❌ Role Mismatch for Seller');
    } catch (error) {
        console.error('❌ Seller Login Failed:', error.response?.data || error.message);
    }

    // 3. Customer Register
    try {
        console.log('\n[3] Testing Customer Registration...');
        const customerData = {
            first_name: 'Test',
            last_name: 'Customer',
            email: 'customer@test.com',
            password: 'Password@123',
            phone: '1234567890',
            gender: 'Male'
        };
        const res = await axios.post(`${BASE_URL}/auth/customer/register`, customerData);
        console.log('✅ Customer Registration Success');
        customerToken = res.data.data.token;
    } catch (error) {
        if (error.response?.data?.message?.includes('already exists')) {
            console.log('ℹ️ Customer already exists, logging in...');
        } else {
            console.error('❌ Customer Registration Failed:', error.response?.data || error.message);
        }
    }

    // 4. Customer Login
    try {
        console.log('\n[4] Testing Customer Login...');
        const loginData = {
            email: 'customer@test.com',
            password: 'Password@123'
        };
        const res = await axios.post(`${BASE_URL}/auth/login`, loginData);
        console.log('✅ Customer Login Success');
        customerToken = res.data.data.token;
    } catch (error) {
        console.error('❌ Customer Login Failed:', error.response?.data || error.message);
    }

    // 5. Profile & Security
    try {
        console.log('\n[5] Testing Profile Access...');
        const res = await axios.get(`${BASE_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log('✅ Profile Access Success:', res.data.data.user.name);
    } catch (error) {
        console.error('❌ Profile Access Failed:', error.response?.data || error.message);
    }

    console.log('\n--- AUTH & PROFILE TESTS COMPLETE ---');
    return { sellerToken, customerToken };
}

testAuth();
