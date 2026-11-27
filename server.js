
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

require("dotenv").config();

const application = express();
const Routers = require("./routes/router.js");
const ResponseManager = require("./api/v1/modules/response/index.js");
const pool = require("./config/database");
const chatModel = require("./api/v1/modules/chat/chat.model");

// Existing CORS configuration preserved
const corsOptions = {
    origin: function (origin, callback) {
        callback(null, origin || "*");
    },
    methods: [
        "GET",
        "HEAD",
        "PUT",
        "PATCH",
        "POST",
        "DELETE",
        "OPTIONS"
    ],
    credentials: true,
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "shiprocketToken",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Methods"
    ],
    optionsSuccessStatus: 200
};

// Existing Express middleware
application.use(cors(corsOptions));
application.use(express.json());

// Existing API routes preserved
application.use("/api/v1", Routers);

// Existing uploads preserved
application.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// Existing health check preserved
application.get("/health", (req, res) => {
    ResponseManager.success(res, "Ok");
});

// One HTTP server for Express and Socket.IO
const server = http.createServer(application);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: corsOptions.origin,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Authenticate Socket.IO using the existing JWT secret
io.use(async (socket, next) => {
    try {
        const authToken =
            socket.handshake.auth?.token ||
            socket.handshake.headers.authorization;

        if (!authToken || typeof authToken !== "string") {
            return next(new Error("Authentication required"));
        }

        const token = authToken.startsWith("Bearer ")
            ? authToken.slice(7)
            : authToken;

        if (!token) {
            return next(new Error("Invalid token"));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY
        );

        const userResult = await pool.query(
            "SELECT status FROM public.users WHERE id = $1",
            [decoded.id]
        );

        const user = userResult.rows[0];

        if (!user) {
            return next(new Error("User not found"));
        }

        if (user.status !== "active") {
            return next(new Error("Account is not active"));
        }

        socket.data.user = {
            id: decoded.id
        };

        next();
    } catch (error) {
        next(new Error("Invalid or expired token"));
    }
});

// Authenticated real-time connections
io.on("connection", (socket) => {

    // Join only conversations the authenticated user belongs to
    socket.on("chat:join", async (data, callback) => {
        try {
            const conversationId = data?.conversationId;
            const userId = socket.data.user?.id;

            if (
                typeof conversationId !== "string" ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId)
            ) {
               

                return callback?.({
                    status: false,
                    message: "Invalid conversation ID",
                });
            }

            const conversation =
                await chatModel.getConversationById(conversationId);

            if (!conversation) {
                return callback?.({
                    status: false,
                    message: "Conversation not found",
                });
            }

            const isParticipant =
                String(conversation.customer_id) === String(userId) ||
                String(conversation.seller_id) === String(userId);

            if (!isParticipant) {
                return callback?.({
                    status: false,
                    message: "Access denied",
                });
            }

            const room = `conversation:${conversationId}`;

            await socket.join(room);

            return callback?.({
                status: true,
                message: "Joined conversation",
                conversationId,
            });
        } catch (error) {
            console.error("[Chat] Join error:", error);

            return callback?.({
                status: false,
                message: "Failed to join conversation",
            });
        }
    });

    socket.on("disconnect", (reason) => {
       //
    });
});

// Make Socket.IO accessible from Express controllers
application.server = server;
application.io = io;

// Preserve the existing export
module.exports = application;
