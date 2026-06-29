const express = require("express");
const {
  createPage,
  updatePage,
  deletePage,
  getPageById,
  getPagesByWorkspace,
  archivePage,
} = require("../controllers/pageController");
const {
  createPagePermission,
  getPagePermissionsByPage,
  updatePagePermission,
  deletePagePermission,
} = require("../controllers/permissionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/pages
router.post("/", createPage);

// GET /api/workspaces/:workspaceId
router.get("/workspaces/:workspaceId", getPagesByWorkspace);

// PUT /api/pages/permissions/:permissionId
router.put("/permissions/:permissionId", updatePagePermission);

// DELETE /api/pages/permissions/:permissionId
router.delete("/permissions/:permissionId", deletePagePermission);

// POST /api/pages/:pageId/permissions
router.post("/:pageId/permissions", createPagePermission);

// GET /api/pages/:pageId/permissions
router.get("/:pageId/permissions", getPagePermissionsByPage);

// PUT /api/pages/:pageId
router.put("/:pageId", updatePage);

// GET /api/pages/:pageId
router.get("/:pageId", getPageById);

// PATCH /api/pages/:pageId
router.patch("/:pageId/archive", archivePage);

// DELETE /api/pages/:pageId
router.delete("/:pageId", deletePage);

module.exports = router;
