const nodemailer = require('nodemailer');

const emailService = async ({ to, bccAddress, ccAddress, subject, messageBody, body, attachments}) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            service: 'gmail',
            secure: false, // SSL
            auth: {
                user: process.env.SMTP_SENDER_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false,
            }
        });

        const mailOptions = {
            from: `Ratan Textile: <${process.env.SMTP_SENDER_EMAIL}>`,
            to: to,
            bcc: bccAddress,
            cc: ccAddress,
            subject: subject,
            html: body,
            attachments: attachments || [],
        };

        const response = await transporter.sendMail(mailOptions);
        return response;

    } catch (error) {
        console.error('Server error :-> ', error);
        return error;
    }
}

const sentEmailOutlook = async ({ to, bccAddress, ccAddress, emailSubject, messageBody, htmlBody }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            service: 'Outlook',
            secure: false,
            auth: {
                user: 'sarfraj.ajmer@outlook.com',
                pass: 'cxjg nmlb furo mjaw'
            },
            tls: {
                rejectUnauthorized: false,
            }
        });


        const mailOptions = {
            from: `Sarfraj khan <sarfraj.ajmer@outlook.com>`,
            to: 'mohmmadsarfraj22@gmail.com',
            cc: ccAddress,
            bcc: bccAddress,
            subject: 'Test from NodeMailer + Outlook',
            text : "Hi , Good morning",
            html: htmlBody,
        };


        const response = await transporter.sendMail(mailOptions);
        return response;

    } catch (error) {
        throw error;
    }
}

module.exports = { emailService, sentEmailOutlook };