
require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === "true", // false for port 587
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

// Verify SMTP once when the application starts
transporter.verify()
    .then(() => {
        console.log("✅ SMTP SERVER READY");
    })
    .catch((error) => {
        console.error("❌ SMTP VERIFY ERROR:", error.message);
    });

const sendMail = async ({ to, subject, html }) => {
    try {
        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
            throw new Error("MAIL_USER or MAIL_PASS is missing in .env");
        }

        const fromName = process.env.MAIL_FROM_NAME || "ShopEase";
        const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER;

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html,
        };

        const response = await transporter.sendMail(mailOptions);

        console.log("✅ Email sent successfully:", response.messageId);
        return response;
    } catch (error) {
        console.error("❌ SEND MAIL ERROR:", error.message);
        throw error;
    }
};

module.exports = {
    sendMail,
    transporter,
};
