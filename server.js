const express = require("express");
const application = express();
const Routers = require("./routes/router.js");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// const corsOptions = {
//     origin: function (origin, callback) {
//         callback(null, origin || "*");
//     },
//     methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
//     credentials: true,
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Methods'],
//     optionsSuccessStatus: 200
// };
application.use(cors());
application.use(express.json());

application.use('/api/v1', Routers);
application.use('/uploads', express.static(path.join(__dirname, 'uploads')));

application.get('/health', (req, res) => {
    res.status(200).send('OK');
});

module.exports = application;
