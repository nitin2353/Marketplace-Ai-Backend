const EMAIL_SERVICES = require("./email.service");

const sentEmail = async (body) => {
    return await EMAIL_SERVICES.emailService(body);
}

const sentEmailOutlook = async (body) => {
    return await EMAIL_SERVICES.sentEmailOutlook(body);
}

module.exports = {
    sentEmail,
    sentEmailOutlook,
}