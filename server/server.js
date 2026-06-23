// import built-in module from Node.js called http that allows computer to create web servers
const http = require("http");
// import Server class from Socket.IO package. Socket.IO package allows connections between browswer and server stays open even after server responds
const { Server } = require("socket.io");
// import dotenv to read from .env files
const dotenv = require("dotenv");
// import Express app
const app = require("./app");
// import MongoDB connection function
const connectDB = require("./config/db");
// import Socket Handler that contains all socket events
const socketHandler = require("./sockets/socketHandler");
// load environment variables like PORT, CLIENT_URL, etc. into process.env
dotenv.config();

const PORT = process.env.PORT || 5001;

// connect backend to MongoDB
connectDB();

// create http web server
const server = http.createServer(app);

// create Socket.IO real-time communication server
const io = new Server(server, {
    // CORS: browser security mechanism that allows web server to explicitly allows frontend URL stated in .env to interact with server
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        // allowed methods
        methods: ["GET", "POST", "PUT", "DELETE"],
        // allow cookies/credentials/authentication to be sent between frontend and backend
        credentials: true,
    },
});

// register Socket events
socketHandler(io);

// start listening on port
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})