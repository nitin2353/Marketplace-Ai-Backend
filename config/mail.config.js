require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("doneee")
const transporter = nodemailer.createTransport({
  service: 'gmail',
    auth:{
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    }
})
console.log("transporter", transporter)


const sendMail = async ({ to, subject, html }) => {
    console.log('to, subject, html', to, subject, html)
    return await transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || "ShopEase"}" <${process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER}>`,
        to,
        subject,
        html
    });
};

module.exports = {
    sendMail,
};