
require("dotenv").config();

const expressApp = require("./server");

// Use the HTTP server created in server.js.
// Do not create another HTTP server here.
const server = expressApp.server;

const SERVER_PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

server.listen(SERVER_PORT, () => {
    console.log(`Your Server is Running on PORT: ${SERVER_PORT}`);
});
