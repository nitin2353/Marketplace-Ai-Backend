const pool = require("../../../../config/database");

const ADDRESS_FIELDS = `
    id,
    country_code,
    address_line_1,
    name,
    user_id,
    mobile,
    address_line_2,
    country,
    state,
    city,
    pincode,
    label,
    instructions,
    phone,
    created_by,
    modified_by,
    created_time,
    modified_time
`;

// CREATE ADDRESS
const createAddress = async (data) => {
    try {
        const {
            country_code,
            address_line_1,
            name,
            user_id,
            mobile,
            address_line_2,
            country,
            state,
            city,
            pincode,
            label,
            instructions,
            phone,
            created_by,
            modified_by
        } = data;

        const query = `
            INSERT INTO public.address (
                country_code,
                address_line_1,
                name,
                user_id,
                mobile,
                address_line_2,
                country,
                state,
                city,
                pincode,
                label,
                instructions,
                phone,
                created_by,
                modified_by,
                created_time,
                modified_time
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, NOW(), NOW()
            )
            RETURNING ${ADDRESS_FIELDS}
        `;

        const values = [
            country_code,
            address_line_1,
            name,
            user_id,
            mobile,
            address_line_2,
            country,
            state,
            city,
            pincode,
            label,
            instructions,
            phone,
            created_by,
            modified_by
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

// GET ALL ADDRESSES
const getAllAddresses = async () => {
    try {
        const query = `
            SELECT ${ADDRESS_FIELDS}
            FROM public.address
            ORDER BY created_time DESC
        `;

        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

// GET ADDRESS BY ID
const getAddressById = async (id, user_id) => {
    try {
        const query = `
            SELECT ${ADDRESS_FIELDS}
            FROM public.address
            WHERE id = $1 AND user_id = $2
        `;

        const result = await pool.query(query, [id, user_id]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

// GET ADDRESSES BY USER ID
const getAddressesByUserId = async (user_id) => {
    try {
        const query = `
            SELECT ${ADDRESS_FIELDS}
            FROM public.address
            WHERE user_id = $1
            ORDER BY created_time DESC
        `;

        const result = await pool.query(query, [user_id]);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

// UPDATE ADDRESS
const updateAddress = async (id, user_id, data) => {
    try {
        const {
            country_code,
            address_line_1,
            name,
            mobile,
            address_line_2,
            country,
            state,
            city,
            pincode,
            label,
            instructions,
            phone,
            modified_by
        } = data;

        const query = `
            UPDATE public.address
            SET
                country_code = $1,
                address_line_1 = $2,
                name = $3,
                mobile = $4,
                address_line_2 = $5,
                country = $6,
                state = $7,
                city = $8,
                pincode = $9,
                label = $10,
                instructions = $11,
                phone = $12,
                modified_by = $13,
                modified_time = NOW()
            WHERE id = $14 AND user_id = $15
            RETURNING ${ADDRESS_FIELDS}
        `;

        const values = [
            country_code,
            address_line_1,
            name,
            mobile,
            address_line_2,
            country,
            state,
            city,
            pincode,
            label,
            instructions,
            phone,
            modified_by,
            id,
            user_id
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

// DELETE ADDRESS
const deleteAddress = async (id, user_id) => {
    try {
        const query = `
            DELETE FROM public.address
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;

        const result = await pool.query(query, [id, user_id]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createAddress,
    getAllAddresses,
    getAddressById,
    getAddressesByUserId,
    updateAddress,
    deleteAddress
};