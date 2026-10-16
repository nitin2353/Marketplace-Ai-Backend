const axios = require('axios');

async function test() {
    try {
        const productId = 'eded115a-4c1b-4a82-80cc-e06852db373f'; // Review Test Product
        const response = await axios.get(`http://localhost:3000/api/v1/product/${productId}`);
        console.log("Response data:", JSON.stringify(response.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.error("API error:", err.response.status, err.response.data);
        } else {
            console.error("Error connecting to localhost:5000", err.message);
        }
    }
}

test();
