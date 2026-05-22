const pool = require('../config/database');
const { getProductById } = require('../api/v1/modules/product/product.model');

async function test() {
    try {
        const productId = 'eded115a-4c1b-4a82-80cc-e06852db373f'; // Review Test Product 1777532316606
        console.log("Calling getProductById for productId:", productId);
        const product = await getProductById(productId);
        console.log("Product result returned from model:", product);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
