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
            return Response.badRequest(res, "Missing fields");
        }

        const existing = await authModel.findUserByEmail(email);

        if (existing) {
            return Response.duplicate(res, "User already exists");
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
            { id: result.id, role: role || "customer", email: email, phone: phone },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.created(res, "Your Account Successfully Created", {
            result,
            token
        });

    } catch (err) {
        return Response.serverError(res, "Registration failed", err.message);
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authModel.findUserByEmail(email);

        if (!user) {
            return Response.notFound(res, "User not found");
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return Response.badRequest(res, "Invalid Credentials");
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, fullName: user.first_name, lastName: user.last_name, phone: user.phone },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.success(res, "Login successful", { token, role: user.role });

    } catch (err) {
        return Response.serverError(res, "Login failed", err.message);
    }
};

exports.getProfile = async (req, res) => {
    try {
        const id = req.user?.id;
        if (!id) return Response.unauthorized(res, "Authentication required");

        const user = await authModel.findUserById(id);
        if (!user) return Response.notFound(res, "User not found");

        return Response.success(res, "Profile fetched successfully", { user });
    } catch (err) {
        return Response.serverError(res);
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await authModel.findAllUsers();
        return Response.success(res, "Users fetched successfully", { users });
    } catch (err) {
        return Response.serverError(res);
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await authModel.findUserById(id);
        if (!user) return Response.notFound(res, "User not found");

        return Response.success(res, "User fetched successfully", { user });
    } catch (err) {
        return Response.serverError(res);
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const existingUser = await authModel.findUserById(id);
        if (!existingUser) return Response.notFound(res, "User not found");

        const updatedUser = await authModel.updateUser(id, req.body);
        return Response.success(res, "User updated successfully", { user: updatedUser });
    } catch (err) {
        return Response.serverError(res);
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const existingUser = await authModel.findUserById(id);
        if (!existingUser) return Response.notFound(res, "User not found");

        await authModel.deleteUser(id);
        return Response.success(res, "User deleted successfully");
    } catch (err) {
        return Response.serverError(res);
    }
};

exports.registerSeller = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return Response.badRequest(res, "Name, Email & Password required");
        }

        const existing = await authModel.findUserByEmail(email);
        if (existing) {
            return Response.duplicate(res, "Email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [first_name, ...rest] = name.split(" ");
        const last_name = rest.join(" ") || "";

        const user = await authModel.createUser({
            name,
            email,
            password: hashedPassword,
            phone,
            first_name,
            last_name,
        });

        const seller = await authModel.createSeller(req.body, user.id);
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.created(res, "Seller registered successfully", { seller, token });

    } catch (err) {
        return Response.serverError(res, "Something went wrong", err.message);
    }
};
