const jwt = require("jsonwebtoken");
const pool = require("../../../../config/database");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "No token provided" });
        }
        
        const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
            : authHeader;
            
        if (!token) {
            return res.status(401).json({ error: "Invalid token format" });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        
        const userRes = await pool.query("SELECT status FROM users WHERE id = $1", [decoded.id]);
        const user = userRes.rows[0];

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                error: `Account is ${user.status}. Please contact support.`,
                status: user.status
            });
        }

        req.user = { ...decoded, status: user.status };

        req.audit = {
            created_by: decoded.id,
            modified_by: decoded.id
        };

        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = authMiddleware;