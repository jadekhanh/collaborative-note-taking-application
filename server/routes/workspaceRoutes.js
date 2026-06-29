const express = require("express");
const {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  getMyWorkspaces,
  getWorkspaceById,
} = require("../controllers/workspaceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/workspaces
router.post("/", createWorkspace);

// GET /api/workspaces
router.get("/", getMyWorkspaces);

// GET /api/workspaces/:workspaceId
router.get("/:workspaceId", getWorkspaceById);

// PUT /api/workspaces/:workspaceId
router.put("/:workspaceId", updateWorkspace);

// DELETE /api/workspaces/:workspaceId
router.delete("/:workspaceId", deleteWorkspace);

// POST /api/workspaces/:workspaceId/members
router.post("/:workspaceId/members", addWorkspaceMember);

module.exports = router;
