const jwt = require("jsonwebtoken");
const pool = require("../../../../config/database");

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            req.user = { role: 'customer', id: null };
            return next();
        }

        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

        if (!token) {
            req.user = { role: 'customer', id: null };
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        
        const userRes = await pool.query("SELECT status FROM users WHERE id = $1", [decoded.id]);
        const user = userRes.rows[0];

        if (!user || user.status !== 'active') {
            req.user = { role: 'customer', id: null };
            return next();
        }

        req.user = { ...decoded, status: user.status };
        next();

    } catch (err) {
        req.user = { role: 'customer', id: null };
        next();
    }
};
