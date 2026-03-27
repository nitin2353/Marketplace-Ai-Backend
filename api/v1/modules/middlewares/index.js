const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
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

        // ✅ Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // ✅ Attach full user
        req.user = decoded;

        // 🔥 IMPORTANT: Bind creator & modifier globally
        req.audit = {
            created_by: decoded.id,
            modified_by: decoded.id
        };

        next();

    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};