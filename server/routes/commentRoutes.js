const express = require("express");
const {
  createComment,
  deleteComment,
  resolveComment,
  updateComment,
  getCommentsByPage,
} = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/comments
router.post("/", createComment);

// GET /api/comments/page/:pageId
router.get("/page/:pageId", getCommentsByPage);

// PUT /api/comments/:commentId
router.put("/:commentId", updateComment);

// PUT /api/comments/:commentId/resolve
router.put("/:commentId/resolve", resolveComment);

// DELETE /api/comments/:commentId
router.delete("/:commentId", deleteComment);

module.exports = router;
