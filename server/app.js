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
// import block endpoints
const blockRoutes = require("./routes/blockRoutes");
// import comment endpoints
const commentRoutes = require("./routes/commentRoutes");
// import attachment endpoints
const attachmentRoutes = require("./routes/attachmentRoutes");
// import version endpoints
const versionRoutes = require("./routes/versionRoutes");
// import search endpoints
const searchRoutes = require("./routes/searchRoutes");

// create Express app
const app = express();

// register CORS middleware
app.use(
  cors({
    // allow requests from React frontend from this url
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    // allow cookies and JWT
    credentials: true,
  }),
);

// allows the app to understands JSON
app.use(express.json());

// health check route: when user visits http://localhost:5001, this route will execute
app.get("/", (req, res) => {
  res.json({
    message: "Collaborative Note-Taking API is thriving and amazing!",
  });
});

// mount authentication routes
app.use("/api/auth", authRoutes);
// mount workspace routes
app.use("/api/workspaces", workspaceRoutes);
// mount page routes
app.use("/api/pages", pageRoutes);
// mount block routes
app.use("/api/blocks", blockRoutes);
// mount comment routes
app.use("/api/comments", commentRoutes);
// mount attachment routes
app.use("/api/attachments", attachmentRoutes);
// mount version routes
app.use("/api/versions", versionRoutes);
// mount search routes
app.use("/api/search", searchRoutes);

// export app so other files can import this Express app
module.exports = app;
