
require("dotenv").config();
const nodemailer = require("nodemailer");

// Validate required SMTP configuration
const requiredEnv = [
    "MAIL_HOST",
    "MAIL_PORT",
    "MAIL_USER",
    "MAIL_PASS",
    "MAIL_FROM_EMAIL",
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

// SMTP Transporter
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,

    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,

    logger: true,
    debug: true,
});

// Verify SMTP connection
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

// Reusable Email Function
const sendMail = async ({ to, subject, html, text, replyTo }) => {
    try {
        if (!to || !subject || !html) {
            throw new Error("Recipient, subject and HTML content are required");
        }

        const mailOptions = {
            from: {
                name: process.env.MAIL_FROM_NAME || "AshoNex",
                address: process.env.MAIL_FROM_EMAIL,
            },

            to,
            subject,
            html,

            ...(text && { text }),
            ...(replyTo && { replyTo }),
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("✅ EMAIL SENT SUCCESSFULLY:", {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
        });

        return {
            success: true,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
        };

    } catch (error) {
        console.error("❌ SEND MAIL ERROR:", {
            message: error.message,
            code: error.code,
            responseCode: error.responseCode,
        });

        throw error;
    }
};

module.exports = {
    sendMail,
    transporter,
};
