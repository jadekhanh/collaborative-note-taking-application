const express = require("express");
const {
  createPageVersion,
  getPageVersions,
  restorePageVersion,
} = require("../controllers/versionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/versions/pages/:pageId
router.post("/pages/:pageId", createPageVersion);

// GET /api/versions/pages/:pageId
router.get("/pages/:pageId", getPageVersions);

// POST /api/versions/:versionId/restore
router.post("/:versionId/restore", restorePageVersion);

module.exports = router;
