const express = require("express");
const application = express();
const Routers = require("./routes/router.js");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const corsOptions = {
    origin: function (origin, callback) {
        callback(null, true);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin'],
};
application.use(cors(corsOptions));
application.use(express.json());

application.use('/api/v1', Routers);
application.use('/uploads', express.static(path.join(__dirname, 'uploads')));

module.exports = application;
