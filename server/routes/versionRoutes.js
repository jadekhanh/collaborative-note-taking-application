const express = require("express");
const {
  createVersion,
  getVersions,
  restoreVersion,
} = require("../controllers/versionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/versions/pages/:pageId
router.post("/pages/:pageId", createVersion);

// GET /api/versions/pages/:pageId
router.get("/pages/:pageId", getVersions);

// POST /api/versions/:versionId/restore
router.post("/:versionId/restore", restoreVersion);

module.exports = router;
