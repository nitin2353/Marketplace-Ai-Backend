const bcrypt = require('bcrypt');

/**
 * @Description : return securely converts a plain-text password into a hashed format synchronously for safe storage and user authentication.
 */
const convertPassowrdHashSync = async (password) => {
  try {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  } catch (error) {
    throw error;
  }
}

/**
 * @Description : Return Sent OTP Email Tempalte in HTML formate.
 */
const OTP_EMIAL_TEMPLATE = async (otp) => {
  return `
        <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <title>Email OTP</title>
            </head>
            <body style="background: #f4f6f8; font-family: Arial, sans-serif; padding: 40px; text-align: center;">
              <div style="background: #ffffff; border-radius: 8px; padding: 40px; display: inline-block; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                
                <div style="font-size: 40px; color: #f1c40f; margin-bottom: 20px;">🔒</div>
                <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #333333;">EMAIL OTP</h2>
                <p style="color: #555555; font-size: 16px; margin: 10px 0;">
                  Your requested OTP for <strong>Email OTP</strong> is:
                </p>
                
                <div style="display: inline-block; background: #b8973cff; color: #ffffff; font-size: 20px; padding: 10px 30px; border-radius: 50px; margin: 20px 0;">
                  ${otp}
                </div>
                
                <p style="color: #555555; font-size: 16px; margin: 10px 0;">
                  This code is valid for the next <strong>10 minutes</strong>.
                </p>
                
                <p style="color: #555555; font-size: 16px; margin: 10px 0;">
                  If you did not request this, please ignore this email.
                </p>
                
                <div style="margin-top: 30px; font-size: 14px; color: #777777;">
                  Stay secure,<br /> <strong>Ratan Textile Team</strong>
                </div>
              </div>
            </body>

          </html>
    `;
}

/**
 * @Description : This return current date and time in yyyy-mm-dd hh:mm:ss formate
 */
const formatedDateTime = async (date) => {
  const pad = (n, z = 2) => ('00' + n).slice(-z);

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Months are 0-indexed
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Compare hashed DB password with plain payload password
 * @param {string} dbPassword - Hashed password from DB
 * @param {string} payloadPassword - Plain password from request payload or token
 * @returns {Promise<boolean>}
 */
const isPasswordMatchingToken = async (dbPassword, payloadPassword) => {
  try {
    if (!dbPassword || !payloadPassword) {
      return false;
    }

    const isMatch = await bcrypt.compare(payloadPassword, dbPassword);
    return isMatch;
  } catch (err) {
    return false;
  }
};

const TEAM_OBJECT_FIELDS = ['module_id', 'record_id', 'type', 'createdbyid', 'lastmodifiedbyid'];
const TEAM_MEMBEROBJECT_FIELDS = ['team_id', 'user_id', 'is_manager', 'createdbyid', 'lastmodifiedbyid'];

module.exports = {
  convertPassowrdHashSync,
  OTP_EMIAL_TEMPLATE,
  formatedDateTime,
  isPasswordMatchingToken,
  TEAM_OBJECT_FIELDS,
  TEAM_MEMBEROBJECT_FIELDS
};