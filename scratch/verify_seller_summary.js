const { getSellerSummary } = require('../api/v1/modules/report/report.modal');
const { getSellerSummary: getPaymentSummary } = require('../api/v1/modules/payments/seller_payment.modal');

async function test() {
    try {
        const sellerId = '4472b571-468c-4901-9aef-211b8ab3dcb3'; // Let's test with the seller ID
        console.log("Running getSellerSummary for seller:", sellerId);
        
        const summary = await getSellerSummary(sellerId);
        console.log("Report Summary results:", summary);
        
        const paymentSummary = await getPaymentSummary(sellerId);
        console.log("Payment Summary results:", paymentSummary);
        
        console.log("Success! Both backend summaries resolved successfully.");
    } catch (err) {
        console.error("Verification failed with error:", err);
    } finally {
        process.exit();
    }
}

test();
