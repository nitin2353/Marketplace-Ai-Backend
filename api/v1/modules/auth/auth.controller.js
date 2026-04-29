const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Response = require("../response");
const authModel = require("./auth.modal");

// ── CUSTOMER REGISTER ────────────────────────────────────────────────────────
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
            return Response.badRequest(res, "Missing required fields");
        }

        const existing = await authModel.findUserByEmail(email);
        if (existing) {
            return Response.duplicate(res, "User with this email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const name = `${first_name} ${last_name || ""}`.trim();

        const user = await authModel.createUser({
            name,
            first_name,
            last_name,
            email,
            password: hashedPassword,
            phone,
            gender,
            role: role || "customer",
            status: "active"
        });

        // Generate Token (Safe Payload)
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.created(res, "Account successfully created", {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });

    } catch (err) {
        console.error("CUSTOMER REGISTER ERROR:", err);
        return Response.serverError(res, "Registration failed", err.message);
    }
};

// ── SELLER REGISTER ──────────────────────────────────────────────────────────
exports.registerSeller = async (req, res) => {
    try {
        const { name, email, password, phone, business_name } = req.body;

        if (!name || !email || !password) {
            return Response.badRequest(res, "Name, Email & Password are required");
        }

        const existing = await authModel.findUserByEmail(email);
        if (existing) {
            return Response.duplicate(res, "Email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const nameParts = name.trim().split(" ");
        const first_name = nameParts[0];
        const last_name = nameParts.slice(1).join(" ") || "";

        // Create unified user/seller record
        const user = await authModel.createUser({
            ...req.body,
            name: name.trim(),
            first_name,
            last_name,
            password: hashedPassword,
            role: "seller",
            status: "active"
        });

        // Generate Token (Safe Payload)
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.created(res, "Seller registered successfully", {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                business_name: user.business_name
            },
            token
        });

    } catch (err) {
        console.error("SELLER REGISTER ERROR:", err);
        return Response.serverError(res, "Seller registration failed", err.message);
    }
};

// ── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authModel.findUserByEmail(email);
        
        if (!user) {
            return Response.notFound(res, "User not found");
        }

        // Account Status Guards
        if (user.status === 'deleted') {
            return Response.forbidden(res, "This account has been deleted. Please contact support.");
        }
        if (user.status === 'inactive') {
            return Response.forbidden(res, "This account is inactive. Please contact support to reactivate.");
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return Response.badRequest(res, "Invalid credentials");
        }

        // Generate Token (Safe Payload - NO PASSWORD)
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role, 
                email: user.email,
                name: user.name,
                business_name: user.business_name
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return Response.success(res, "Login successful", { 
            token, 
            role: user.role,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return Response.serverError(res, "Login failed", err.message);
    }
};

// ── PROFILE & USERS ──────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const id = user_id;
        if (!id) return Response.unauthorized(res, "Authentication required");

        const user = await authModel.findUserById(id);
        if (!user) return Response.notFound(res, "User not found");

        // Remove password before returning
        delete user.password;
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

        delete user.password;
        return Response.success(res, "User fetched successfully", { user });
    } catch (err) {
        return Response.serverError(res);
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;

        // Security: Only the user themselves or an admin can update
        if (requesterId !== id && requesterRole !== 'admin') {
            return Response.forbidden(res, "You are not authorized to update this profile");
        }

        const existingUser = await authModel.findUserById(id);
        if (!existingUser) return Response.notFound(res, "User not found");

        // Validate Email Uniqueness
        if (req.body.email && req.body.email !== existingUser.email) {
            const emailTaken = await authModel.findUserByEmail(req.body.email);
            if (emailTaken) return Response.badRequest(res, "Email already in use by another account");
        }

        // Validate Phone Format (basic)
        if (req.body.phone && !/^[0-9+\s\-]{7,15}$/.test(req.body.phone)) {
            return Response.badRequest(res, "Invalid phone number format");
        }
        
        const updatedUser = await authModel.updateUser(id, req.body);
        if (updatedUser) delete updatedUser.password;
        
        return Response.success(res, "User updated successfully", { user: updatedUser });
    } catch (err) {
        console.error("UPDATE USER ERROR:", err);
        return Response.serverError(res, err.message);
    }
};

// ── PASSWORD MANAGEMENT ──────────────────────────────────────────────────────
exports.updatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user.id;
        const { current_password, new_password } = req.body;

        // Security: Only the user themselves can update their password
        if (requesterId !== id) {
            return Response.forbidden(res, "You are not authorized to update this password");
        }

        if (!current_password || !new_password) {
            return Response.badRequest(res, "Current password and new password are required");
        }

        const existingUser = await authModel.findUserById(id);
        if (!existingUser) return Response.notFound(res, "User not found");

        const isMatch = await bcrypt.compare(current_password, existingUser.password);
        if (!isMatch) return Response.badRequest(res, "Current password does not match");

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await authModel.updatePassword(id, hashedPassword);

        return Response.success(res, "Password updated successfully");
    } catch (err) {
        console.error("UPDATE PASSWORD ERROR:", err);
        return Response.serverError(res, err.message || "Internal Server Error");
    }
};

exports.changePassword = async (req, res) => {
    try {
        const id = req.user.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return Response.badRequest(res, "Current password and new password are required");
        }

        const existingUser = await authModel.findUserById(id);
        if (!existingUser) return Response.notFound(res, "User not found");

        const isMatch = await bcrypt.compare(current_password, existingUser.password);
        if (!isMatch) return Response.badRequest(res, "Current password does not match");

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await authModel.updatePassword(id, hashedPassword);

        return Response.success(res, "Password changed successfully");
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};

// ── ACCOUNT DELETION & DEACTIVATION ──────────────────────────────────────────
exports.deactivateAccount = async (req, res) => {
    try {
        const id = req.user.id;
        await authModel.deactivateUser(id);
        return Response.success(res, "Account deactivated successfully");
    } catch (err) {
        return Response.serverError(res, err.message);
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const id = req.user.id;
        await authModel.deleteUser(id);
        return Response.success(res, "Account marked for deletion");
    } catch (err) {
        return Response.serverError(res, err.message);
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
