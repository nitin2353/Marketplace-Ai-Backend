const express = require("express");
const application = express();
const Routers = require("./routes/router.js");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};
application.use(cors(corsOptions));
application.use(express.json());

application.use('/api/v1', Routers);
application.use('/uploads', express.static(path.join(__dirname, 'uploads')));

module.exports = application;
