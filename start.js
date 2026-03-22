require("dotenv").config();
const expressApp = require("./server");
const http = require("http");

const SERVER_PORT = process.env.SERVER_PORT || 3000;

const server = http.createServer(expressApp);

server.listen(SERVER_PORT, () => {
  console.log(`Your Server is Running on PORT : ${SERVER_PORT}`);
});
