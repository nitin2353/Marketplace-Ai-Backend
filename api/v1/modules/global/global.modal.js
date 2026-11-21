
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

const pickupScheduledDate = async (seller_id) => {
    try {
        const result = await pool.query(
            `SELECT *
     FROM public.pickup_requests
     WHERE seller_id = $1
       AND scheduled_date >= NOW()
     ORDER BY scheduled_date ASC`,
            [seller_id]
        );

        return result;

    } catch (error) {
        throw error;
    }
};
module.exports = { getCategories, pickupScheduledDate };