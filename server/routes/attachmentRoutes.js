const express = require("express");
const {
  createAttachment,
  getAttachmentsByPage,
  deleteAttachment,
  uploadAttachment,
} = require("../controllers/attachmentController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/attachments
router.post("/", createAttachment);

// GET /api/attachments/page/:pageId
router.get("/page/:pageId", getAttachmentsByPage);

// DELETE /api/attachments/:attachmentId
router.delete("/:attachmentId", deleteAttachment);

// POST /api/attachments/upload
router.post("/upload", upload.single("file"), uploadAttachment);

module.exports = router;
