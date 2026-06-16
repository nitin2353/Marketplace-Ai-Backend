require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

const sendMail = async ({ to, subject, html }) => {
    console.log('to, subject, html', to, subject, html)
    const resp = await transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || "ShopEase"}" <${process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER}>`,
        to,
        subject,
        html
    });
    console.log('transporter', resp)
    return resp
};

module.exports = {
    sendMail,
};