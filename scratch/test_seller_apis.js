const pool = require('../config/database');
const sellerPaymentModal = require('../api/v1/modules/payments/seller_payment.modal');

async function test() {
    const seller_id = '4472b571-468c-4901-9aef-211b8ab3dcb3';
    console.log("Testing summary for seller:", seller_id);
    
    try {
        const summary = await sellerPaymentModal.getSellerSummary(seller_id);
        console.log("Summary Result:");
        console.table([summary]);
        
        const transactions = await sellerPaymentModal.getSellerTransactions(seller_id);
        console.log(`Found ${transactions.length} transactions.`);
        console.table(transactions.slice(0, 5));
        
        const chartData = await sellerPaymentModal.getSellerChartData(seller_id);
        console.log("Chart Data Keys:", Object.keys(chartData));
        console.log("Monthly Revenue Sample:", chartData.monthly_revenue.slice(0, 2));
        
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        process.exit();
    }
}

test();
