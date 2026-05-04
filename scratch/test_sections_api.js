const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api/v1';

async function testApi() {
    try {
        // First login to get token
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'nv5327260@gmail.com',
            password: 'Nitin@1234'
        });
        const token = loginRes.data.data.token;
        console.log("Login successful, token obtained");

        const res = await axios.get(`${API_URL}/product/category-sections`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success:", res.data.success);
        console.log("Sections count:", res.data.data.length);
        res.data.data.forEach(s => {
            console.log(`- ${s.title}: ${s.products.length} products`);
        });
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testApi();
