require("dotenv").config();
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

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



const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async ({ to, subject, html }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "ShopEase <onboarding@resend.dev>",
            to: [to],
            subject,
            html,
        });

        if (error) {
            console.error("Email API error:", error);
            throw new Error(error.message || "Email sending failed");
        }

        return data;
    } catch (error) {
        console.error("SEND MAIL ERROR:", error.message);
        throw error;
    }
};

module.exports = sendMail;

module.exports = {
    sendMail,
    transporter,
};