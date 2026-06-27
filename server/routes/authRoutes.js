const express = require("express");
const { register , login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register); // POST /api/auth/register
router.post("/login", login); // POST /api/auth/login
router.get("/me", protect, getMe); // GET /api/auth/me

module.exports = router;