const express = require("express");
const application = express();
const Routers = require("./routes/router.js");
const cors = require("cors");
const path = require("path");

application.use(cors());
application.use(express.json());

application.use('/api/v1', Routers);
application.use('/uploads', express.static(path.join(__dirname, 'uploads')));

module.exports = application;
