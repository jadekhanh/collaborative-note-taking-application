const express = require("express");
const {
  createBlock,
  getBlocksByPage,
  updateBlock,
  reorderBlocks,
  deleteBlock,
} = require("../controllers/blockController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/blocks
router.post("/", createBlock);

// GET /api/blocks/page/:pageId
router.get("/page/:pageId", getBlocksByPage);

// PUT /api/blocks/:blockId
router.put("/:blockId", updateBlock);

// PUT /api/blocks/page/:pageId/reorder
router.put("/page/:pageId/reorder", reorderBlocks);

// DELETE /api/blocks/:blockId
router.delete("/:blockId", deleteBlock);

module.exports = router;
