const express = require("express");
const {
  createAttachment,
  getAttachmentsByPage,
  deleteAttachment,
} = require("../controllers/attachmentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/attachments
router.post("/", createAttachment);

// GET /api/attachments/page/:pageId
router.get("/page/:pageId", getAttachmentsByPage);

// DELETE /api/attachments/:attachmentId
router.delete("/:attachmentId", deleteAttachment);

module.exports = router;
