const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../../../../config/database');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



exports.createOrder = async ({ order_id, amount }) => {


    const options = {
        amount: amount * 100,
        currency: "INR",
        receipt: order_id,
        notes: {
            order_id: order_id 
        }
    };


    const order = await razorpay.orders.create(options);

    return order;
};


exports.verifyPayment = async (body) => {

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest("hex");

    if (expectedSign !== razorpay_signature) {
        throw new Error("Invalid payment signature");
    }

    return true;
};

// const options = {
//     amount: amount * 100,
//     currency: "INR",
//     receipt: order_id,
//     notes: {
//         order_id: order_id
//     }
// };