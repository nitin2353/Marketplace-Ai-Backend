const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Response = require("../response");
const authModel = require("./auth.modal");

exports.customerRregister = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            phone,
            gender,
            role
        } = req.body;

        if (!email || !password || !first_name) {
            return res.status(400).json({
                success: false,
                error: "Missing fields"
            });
        }

        const existing = await authModel.findUserByEmail(email);

        if (existing) {
            return res.status(400).json({
                success: false,
                error: "User already exists"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        const name = `${first_name} ${last_name || ""}`;

        const result = await authModel.createCustomer({
            name,
            first_name,
            last_name,
            email,
            password: hash,
            phone,
            gender,
            role: role || "customer"
        });

        const token = jwt.sign(
            { id: user.id, role: role, email: email, phone: phone },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.created(res, "Your Account Successfully Created", {
            result,
            token
        });


    } catch (err) {
        return Response.serverError(err)
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await authModel.findUserByEmail(email);

        if (!user) {
            return Response.notFound(res)
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return Response.badRequest(res, "Invalid Credientials");
        }
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, fullName: user.first_name, lastName: user.last_name, phone: user.phone },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        res.json({
            success: true,
            token,
            role: user.role
        });

    } catch (err) {
        return Response.serverError(res);
    }
};


exports.registerSeller = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validation
        if (!name || !email || !password) {
            return Response.badRequest(res, "Name, Email & Password required");
        }

        // Check existing user
        const existing = await authModel.findUserByEmail(email);
        if (existing) {
            return Response.duplicate(res, "Email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Split name
        const [first_name, ...rest] = name.split(" ");
        const last_name = rest.join(" ") || "";

        // Create user
        const user = await authModel.createUser({
            name,
            email,
            password: hashedPassword,
            phone,
            first_name,
            last_name,
        });

        // Create seller
        const seller = await authModel.createSeller(req.body, user.id);

        // Generate token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.created(res, "Seller registered successfully", {
            seller,
            token
        });

    } catch (err) {
        console.error(err);
        return Response.serverError(res, "Something went wrong", err.message);
    }
};