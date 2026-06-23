// import Express
const express = require("express");
// import CORS to allow frontend from different host to talk to server
const cors = require("cors");
// import auth routes
const authRoutes = require("./routes/authRoutes");
// import workspace routes
const workspaceRoutes = require("./routes/workspaceRoutes");
// import page endpoints
const pageRoutes = require("./routes/pageRoutes");

// create Express app
const app = express();

// register CORS middleware
app.use(
    cors({
        // allow requests from React frontend from this url
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        // allow cookies and JWT
        credentials: true,
    })
);

// allows the app to understands JSON
app.use(express.json());

// health check route: when user visits http://localhost:5001, this route will execute
app.get("/", (req, res) => {
    res.json({ message: "Collaborative Note-Taking App is thriving!"})
});

// mount authentication routes
app.use("/api/auth", authRoutes);
// mount workspace routes
app.use("/api/workspaces", workspaceRoutes);
// mount page routes
app.use("/api/pages", pageRoutes);

// export app so other files can import this Express app
module.exports = app;