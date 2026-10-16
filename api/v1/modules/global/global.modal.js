
const pool = require("../../../../config/database");


const getCategories = async () => {
    try {
        const category_response = await pool.query(
            `SELECT * FROM public.categories;`
        );
        return category_response
    } catch (error) {
        throw error;
    }
}

module.exports = {getCategories};