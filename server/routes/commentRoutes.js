const express = require("express");
const {
  createCommentThread,
  getCommentThreadsByPage,
  addReplyToCommentThread,
  updateCommentThread,
  resolveCommentThread,
  deleteCommentThread,
} = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/comments/threads
router.post("/threads", createCommentThread);

// GET /api/comments/:pageId/threads
router.get("/page/:pageId/threads", getCommentThreadsByPage);

// POST /api/comments/threads/:threadId/replies
router.post("/threads/:threadId/replies", addReplyToCommentThread);

// PUT /api/comments/threads:commentId
router.put("/threads/:threadId", updateCommentThread);

// PATCH /api/comments/threads/:threadId/resolve
router.patch("/threads/:threadId/resolve", resolveCommentThread);

// DELETE /api/comments/threads/:threadId
router.delete("/threads/:threadId", deleteCommentThread);

module.exports = router;
