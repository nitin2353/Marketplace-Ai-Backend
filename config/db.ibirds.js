const Pool = require('pg').Pool;
const config = require('./db.config');

// This connection is for License table that is Stored in Ibirds Server Database.
const developerDB = new Pool({
    host: config.ibirdsDbConfig.HOST,
    user: config.ibirdsDbConfig.USER,
    password: config.ibirdsDbConfig.PASSWORD,
    database: config.ibirdsDbConfig.NAME,
    port: config.ibirdsDbConfig.PORT
});

module.exports = developerDB