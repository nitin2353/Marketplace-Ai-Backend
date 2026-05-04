const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api/v1';

async function testPublicApi() {
    try {
        console.log("Testing public API access (no token)");
        const res = await axios.get(`${API_URL}/product/category-sections`);
        console.log("Success:", res.data.success);
        console.log("Sections count:", res.data.data.length);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testPublicApi();
