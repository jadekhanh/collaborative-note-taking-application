const express = require("express");
const {
  createPage,
  updatePage,
  deletePage,
  getPageById,
  getPagesByWorkspace,
  archivePage,
  getArchivedPages,
  restorePage,
  getPagesSharedWithMe,
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

// GET /api/pages/workspaces/:workspaceId
router.get("/workspaces/:workspaceId", getPagesByWorkspace);

// POST /api/pages/:pageId/permissions
router.post("/:pageId/permissions", createPagePermission);

// GET /api/pages/:pageId/permissions
router.get("/:pageId/permissions", getPagePermissionsByPage);

// PUT /api/pages/:pageId/permissions/:permissionId
router.put("/:pageId/permissions/:permissionId", updatePagePermission);

// DELETE /api/pages/:pageId/permissions/:permissionId
router.delete("/:pageId/permissions/:permissionId", deletePagePermission);

// PUT /api/pages/:pageId
router.put("/:pageId", updatePage);

// GET /api/pages/shared-with-me
router.get("/shared-with-me", getPagesSharedWithMe);

// GET /api/pages/:pageId
router.get("/:pageId", getPageById);

// PATCH /api/pages/:pageId/archive
router.patch("/:pageId/archive", archivePage);

// DELETE /api/pages/:pageId
router.delete("/:pageId", deletePage);

// GET /api/pages/workspaces/:workspaceId/archived
router.get("/workspaces/:workspaceId/archived", getArchivedPages);

// PATCH /api/pages/:pageId/restore
router.patch("/:pageId/restore", restorePage);

module.exports = router;
