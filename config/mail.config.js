require("dotenv").config();
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});


transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP VERIFY ERROR:");
        console.error(error);
    } else {
        console.log("✅ SMTP SERVER READY");
    }
});

const sendMail = async ({ to, subject, html }) => {
    try {

        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME || "ShopEase"}" <${process.env.MAIL_FROM_EMAIL || 'nv5327260@gmail.com'
                }>`,
            to,
            subject,
            html,
        };

        await transporter.verify();
        console.log("SMTP Connected");

        const response = await transporter.sendMail(mailOptions);
        return response;
    } catch (error) {
        console.error("❌ SEND MAIL ERROR", error.message);
        throw error;
    }
};

module.exports = {
    sendMail,
    transporter,
};