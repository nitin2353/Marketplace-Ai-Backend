require("dotenv").config();
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    port: 587,
    secure: false,
    auth: {
        user: 'nv5327260@gmail.com',
        pass: 'vggh ioza bvxr efsf',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
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