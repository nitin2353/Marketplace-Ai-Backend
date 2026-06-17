require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("📧 Mail Service Initializing...");

console.log("MAIL_USER:", process.env.MAIL_USER);
console.log(
    "MAIL_PASS:",
    process.env.MAIL_PASS ? "FOUND ✅" : "MISSING ❌"
);

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
        rejectUnauthorized: false,
    },
});
// SMTP Verification
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
        console.log("=================================");
        console.log("📨 SEND MAIL REQUEST RECEIVED");
        console.log("TO:", to);
        console.log("SUBJECT:", subject);
        console.log("=================================");

        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME || "ShopEase"}" <${process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER
                }>`,
            to,
            subject,
            html,
        };

        console.log("📤 BEFORE transporter.sendMail()");

        const response = await transporter.sendMail(mailOptions);

        console.log("✅ MAIL SENT SUCCESSFULLY");
        console.log("MESSAGE ID:", response.messageId);
        console.log("RESPONSE:", response);

        return response;
    } catch (error) {
        console.error("❌ SEND MAIL ERROR");
        console.error("MESSAGE:", error.message);
        console.error("CODE:", error.code);
        console.error("COMMAND:", error.command);
        console.error("FULL ERROR:", error);

        throw error;
    }
};

module.exports = {
    sendMail,
    transporter,
};