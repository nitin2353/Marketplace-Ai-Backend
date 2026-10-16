const pool = require("../../../../config/database");

const findUserById = async (id) => {
    const result = await pool.query(
        "SELECT id, name, email, phone, gender, role, first_name, last_name, dob, bio, website, avatar, business_name, business_type, gstin, pan, store_description, address_line_1, city, state, pincode, country, bank_name, account_holder, account_number, ifsc, account_type, upi_id, notification_preferences FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0];
};

const updateProfile = async (id, data) => {
    const result = await pool.query(
        `UPDATE users SET
          first_name = COALESCE(NULLIF($1, ''), first_name),
          last_name = COALESCE(NULLIF($2, ''), last_name),
          email = COALESCE(NULLIF($3, ''), email),
          phone = COALESCE(NULLIF($4, ''), phone),
          gender = COALESCE(NULLIF($5, ''), gender),
          dob = COALESCE(NULLIF($6, '')::DATE, dob),
          bio = COALESCE(NULLIF($7, ''), bio),
          website = COALESCE(NULLIF($8, ''), website),
          avatar = COALESCE(NULLIF($9, ''), avatar),
          name = CONCAT(COALESCE(NULLIF($1, ''), first_name), ' ', COALESCE(NULLIF($2, ''), last_name))
        WHERE id = $10
        RETURNING *`,
        [
            data.first_name,
            data.last_name,
            data.email,
            data.mobile || data.phone,
            data.gender,
            data.dob,
            data.bio,
            data.website,
            data.avatar,
            id
        ]
    );
    return result.rows[0];
};

const updateStore = async (id, data) => {
    const result = await pool.query(
        `UPDATE users SET
          business_name = COALESCE(NULLIF($1, ''), business_name),
          business_type = COALESCE(NULLIF($2, ''), business_type),
          gstin = COALESCE(NULLIF($3, ''), gstin),
          pan = COALESCE(NULLIF($4, ''), pan),
          store_description = COALESCE(NULLIF($5, ''), store_description),
          address_line_1 = COALESCE(NULLIF($6, ''), address_line_1),
          city = COALESCE(NULLIF($7, ''), city),
          state = COALESCE(NULLIF($8, ''), state),
          pincode = COALESCE(NULLIF($9, ''), pincode),
          country = COALESCE(NULLIF($10, ''), country)
        WHERE id = $11
        RETURNING *`,
        [
            data.business_name,
            data.business_type,
            data.gstin,
            data.pan,
            data.store_description,
            data.address_line_1,
            data.city,
            data.state,
            data.pincode,
            data.country,
            id
        ]
    );
    return result.rows[0];
};

const updatePayment = async (id, data) => {
    const result = await pool.query(
        `UPDATE users SET
          bank_name = COALESCE(NULLIF($1, ''), bank_name),
          account_holder = COALESCE(NULLIF($2, ''), account_holder),
          account_number = COALESCE(NULLIF($3, ''), account_number),
          ifsc = COALESCE(NULLIF($4, ''), ifsc),
          account_type = COALESCE(NULLIF($5, ''), account_type),
          upi_id = COALESCE(NULLIF($6, ''), upi_id)
        WHERE id = $7
        RETURNING *`,
        [
            data.bank_name,
            data.account_holder,
            data.account_number,
            data.ifsc,
            data.account_type,
            data.upi_id,
            id
        ]
    );
    return result.rows[0];
};

const updateNotificationPrefs = async (id, prefs) => {
    const result = await pool.query(
        `UPDATE users SET
          notification_preferences = $1
        WHERE id = $2
        RETURNING *`,
        [JSON.stringify(prefs), id]
    );
    return result.rows[0];
};

module.exports = {
    findUserById,
    updateProfile,
    updateStore,
    updatePayment,
    updateNotificationPrefs
};
