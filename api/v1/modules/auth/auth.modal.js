const pool = require("../../../../config/database");

// ── CREATE USER (Unified for Customer & Seller) ──────────────────────────
const createUser = async (data) => {
    const {
        name,
        email,
        password,
        role = 'customer',
        first_name,
        last_name,
        phone,
        gender,
        business_name,
        business_type,
        gstin,
        pan,
        store_description,
        address_line_1,
        city,
        state,
        pincode,
        country,
        bank_name,
        account_holder,
        account_number,
        ifsc,
        account_type,
        upi_id,
        status = 'active'
    } = data;

    const query = `
        INSERT INTO public.users (
            name, email, password, role, first_name, last_name, phone, gender,
            business_name, business_type, gstin, pan, store_description,
            address_line_1, city, state, pincode, country,
            bank_name, account_holder, account_number, ifsc, account_type, upi_id,
            status
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, $24,
            $25
        )
        RETURNING id, name, email, role, status;
    `;

    const values = [
        name, email, password, role, first_name, last_name, phone, gender,
        business_name || null, business_type || null, gstin || null, pan || null, store_description || null,
        address_line_1 || null, city || null, state || null, pincode || null, country || null,
        bank_name || null, account_holder || null, account_number || null, ifsc || null, account_type || null, upi_id || null,
        status
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

const findUserByEmail = async (email, activeOnly = false) => {
    let query = "SELECT * FROM public.users WHERE email = $1";
    if (activeOnly) {
        query += " AND status = 'active'";
    }
    const result = await pool.query(query, [email]);
    return result.rows[0];
};

const findUserById = async (id) => {
    const result = await pool.query(
        "SELECT * FROM public.users WHERE id = $1",
        [id]
    );
    return result.rows[0];
};

const findAllUsers = async () => {
    const result = await pool.query(
        "SELECT id, name, email, phone, gender, role, first_name, last_name, status FROM public.users ORDER BY id"
    );
    return result.rows;
};

const updateUser = async (id, data) => {
    const result = await pool.query(
        `UPDATE public.users SET
          name = COALESCE(NULLIF($1, ''), name),
          first_name = COALESCE(NULLIF($2, ''), first_name),
          last_name = COALESCE(NULLIF($3, ''), last_name),
          email = COALESCE(NULLIF($4, ''), email),
          phone = COALESCE(NULLIF($5, ''), phone),
          gender = COALESCE(NULLIF($6, ''), gender)
        WHERE id = $7
        RETURNING id, name, email, phone, gender, role, first_name, last_name`,
        [
            data.name,
            data.first_name,
            data.last_name,
            data.email,
            data.phone,
            data.gender,
            id
        ]
    );
    return result.rows[0];
};

const updatePassword = async (id, hashedPassword) => {
    const query = `
        UPDATE public.users
        SET password = $1
        WHERE id = $2
        RETURNING id, name, email
    `;

    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0];
};

const deleteUser = async (id) => {
    await pool.query(
        "UPDATE public.users SET status = 'deleted' WHERE id = $1",
        [id]
    );
};

const deactivateUser = async (id) => {
    await pool.query(
        "UPDATE public.users SET status = 'inactive' WHERE id = $1",
        [id]
    );
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    findAllUsers,
    updateUser,
    deleteUser,
    deactivateUser,
    updatePassword
};