require("dotenv").config();
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

transporter.verify()
    .then(() => {
        console.log("✅ SMTP SERVER READY");
    })
    .catch((error) => {
        console.error("❌ SMTP VERIFY ERROR:", {
            code: error.code,
            message: error.message,
            command: error.command,
            responseCode: error.responseCode,
        });
    });

const sendMail = async ({ to, subject, html }) => {
    try {
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME || "ShopEase"}" <${process.env.MAIL_FROM_EMAIL}>`,
            to,
            subject,
            html,
        };

        const response = await transporter.sendMail(mailOptions);

        console.log("✅ Email sent:", response.messageId);
        return response;
    } catch (error) {
        console.error("❌ SEND MAIL ERROR:", {
            code: error.code,
            message: error.message,
            command: error.command,
            responseCode: error.responseCode,
        });

        throw error;
    }
};

module.exports = {
    sendMail,
    transporter,
};