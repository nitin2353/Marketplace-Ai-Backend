const pool = require("../../../../config/database");

// 🔥 CREATE USER
const createCustomer = async (data) => {
    const {
        name,
        first_name,
        last_name,
        email,
        password,
        phone,
        gender,
        role
    } = data;

    const result = await pool.query(
        `INSERT INTO users 
        (name, first_name, last_name, email, password, phone, gender, role)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id, email, role`,
        [name, first_name, last_name, email, password, phone, gender, role]
    );

    return result.rows[0];
};



const findUserByEmail = async (email) => {
    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    return result.rows[0];
};

const findUserById = async (id) => {
    const result = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
    );
    return result.rows[0];
};

const findAllUsers = async () => {
    const result = await pool.query(
        "SELECT id, name, email, phone, gender, role, first_name, last_name FROM users ORDER BY id"
    );
    return result.rows;
};

const updateUser = async (id, data) => {
    const result = await pool.query(
        `UPDATE users SET
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
        UPDATE users
        SET password = $1
        WHERE id = $2
        RETURNING id, name, email
    `;

    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0];
};


const deleteUser = async (id) => {
    await pool.query(
        "DELETE FROM users WHERE id = $1",
        [id]
    );
};

const createUser = async (data) => {
    const {
        name,
        email,
        password,
        phone,
        first_name,
        last_name
    } = data;

    const result = await pool.query(
        `INSERT INTO users 
    (name, email, password, role, first_name, last_name, phone)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
        [name, email, password, "seller", first_name, last_name, phone]
    );

    return result.rows[0];
};

// 🔹 Create seller
const createSeller = async (data, user_id) => {
    const result = await pool.query(
        `INSERT INTO sellers (
      user_id,
      business_name,
      business_type,
      category,
      experience,
      description,
      country,
      state,
      city,
      pincode,
      full_address,
      account_number,
      ifsc_code,
      account_holder_name,
      upi_id,
      pan_number,
      aadhaar_number
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
    )
    RETURNING *`,
        [
            user_id,
            data.business_name,
            data.business_type,
            data.category,
            data.experience,
            data.description,
            data.country,
            data.state,
            data.city,
            data.pincode,
            data.full_address,
            data.account_number,
            data.ifsc_code,
            data.account_holder_name,
            data.upi_id,
            data.pan_number,
            data.aadhaar_number
        ]
    );

    return result.rows[0];
};

module.exports = {
    createCustomer,
    findUserByEmail,
    findUserById,
    findAllUsers,
    updateUser,
    deleteUser,
    createUser,
    createSeller,
    updatePassword
};