const Workspace = require("../models/Workspace");
const User = require("../models/User");

/**
 * Create a workspace
 */
const createWorkspace = async (req, res) => {
  try {
    // create a workspace
    const workspace = await Workspace.create({
      name: req.body.name,
      owner: req.user._id, // get from currently logged in user via protect() which stores req._id inside req. Note: this is so frontend cannot decide who the owner of the workspace is, only server can
      members: [{ user: req.user._id, role: "OWNER" }], // initially, list of members only contains owner
    });

    // 201 = created
    return res
      .status(201)
      .json({ message: "Successfully created a workspace:", workspace });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to create a workspace", error: error.message });
  }
};

/**
 * Get current's user workspaces
 */
const getMyWorkspaces = async (req, res) => {
  try {
    /// search in every workspace's members list
    // find workspaces where any members.user = me
    // visual: in Workspace A, members: [{user: Jade}, {user: Teddy}, ...]
    // .populate("owner", "username email") = because owner field stores ObjectId, we replaces ObjectId with username and email fields
    // .populate("members.user", "username email") = because members.user stores ObjectId, we replaces it with username email
    // purpose: when we return workspace, it's easier to read. no need to .populate() if we don't need to return workspace
    const workspaces = await Workspace.find({ "members.user": req.user._id })
      .populate("owner", "username email")
      .populate("members.user", "username email");

    // 200 = success
    return res.status(200).json({
      workspaces,
    });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to fetch user's workspaces",
      error: error.message,
    });
  }
};

/**
 * Get a workspace by its ID
 */
const getWorkspaceById = async (req, res) => {
  try {
    // get workspace
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate("owner", "username email")
      .populate("members.user", "username email");

    // if workspace doesn't exist
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // check if this user is member of this workspace
    let isMember = false;
    for (const member of workspace.members) {
      if (member.user._id.toString() == req.user._id.toString()) {
        isMember = true;
        break;
      }
    }
    if (!isMember) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Do not have permission to access this workspace" });
    }

    return res.status(200).json({ workspace });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to fetch workspace", error: error.message });
  }
};

/**
 * Update a workspace's name
 */
const updateWorkspace = async (req, res) => {
  try {
    // get workspace
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // check if this user is the owner of the workspace
    if (workspace.owner.toString() !== req.user._id.toString()) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Only owner can update this workspace" });
    }

    // update workspace's name
    workspace.name = req.body.name;

    // save workspace
    await workspace.save();

    return res
      .status(200)
      .json({ message: "Successfully update workspace", workspace });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to update workspace", error: error.message });
  }
};

/**
 * Delete workspace
 */
const deleteWorkspace = async (req, res) => {
  try {
    // get workspace
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // check if this user is the owner of the workspace
    if (workspace.owner.toString() !== req.user._id.toString()) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Only owner can delete this workspace" });
    }

    await workspace.deleteOne();

    return res.status(200).json({ message: "Successfully delete workspace" });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to delete workspace", error: error.message });
  }
};

/**
 * Add new member into workspace
 */
const addWorkspaceMember = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }
    if (role !== "VIEWER" && role !== "EDITOR") {
      return res.status(400).json({
        message: "Role must be VIEWER or EDITOR",
      });
    }

    // get workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // check if this user is the owner of the workspace
    if (workspace.owner.toString() !== req.user._id.toString()) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Only owner can add members to workspace" });
    }

    // get invited user
    const invitedUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });
    if (!invitedUser) {
      return res.status(404).json({
        message: "User with this email was not found",
      });
    }

    // check if invited user is already a workspace member
    const alreadyMember = workspace.members.some(
      (member) => member.user.toString() === invitedUser._id.toString(),
    );
    if (alreadyMember) {
      return res.status(409).json({
        message: "User is already a workspace member",
      });
    }

    // push user into members list
    workspace.members.push({ user: invitedUser._id, role: role });
    await workspace.save();

    // populate fields
    await workspace.populate("owner", "username email");
    await workspace.populate("members.user", "username email");

    return res.status(200).json({
      message: "Successfully added member to workspace",
      workspace,
    });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to add member to workspace",
      error: error.message,
    });
  }
};

/**
 * Update workspace member role
 * Only workspace owner can call this function
 * Owner cannot change their role via this endpoint
 */
const updateWorkspaceMemberRole = async (req, res) => {
  try {
    // extract workspaceId and memberId from req params
    const { workspaceId, memberId } = req.params;
    // extract role from req body
    const { role } = req.body;
    if (role !== "VIEWER" && role !== "EDITOR") {
      return res.status(400).json({
        message: "Role must be VIEWER or EDITOR",
      });
    }

    // get workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // check if this user is workspace owner
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only workspace owner can update member role" });
    }

    // get member
    const member = workspace.members.find(
      (workspaceMember) =>
        workspaceMember.user.toString() === memberId.toString(),
    );
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // owner cannot change their role
    if (member.user.toString() === workspace.owner.toString()) {
      return res
        .status(403)
        .json({ message: "Workspace owner's role cannot be changed" });
    }

    // update member role
    member.role = role;
    await workspace.save();
    await workspace.populate("members.user", "username email");

    return res
      .status(200)
      .json({ message: "Successfully update member's role", workspace });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to update workspace member role",
      error: error.message,
    });
  }
};

/**
 * Remove workspace member
 */
const removeWorkspaceMember = async (req, res) => {
  try {
    // extract workspaceId and memberId from req params
    const { workspaceId, memberId } = req.params;

    // get workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // check if this user is workspace owner
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only workspace owner can remove member" });
    }

    // get member
    const member = workspace.members.find(
      (workspaceMember) =>
        workspaceMember.user.toString() === memberId.toString(),
    );
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // owner cannot remove themselves
    if (member.user.toString() === workspace.owner.toString()) {
      return res
        .status(403)
        .json({ message: "Workspace owner cannot be removed" });
    }

    // update workspace members list
    const updatedMembers = [];
    for (const mem of workspace.members) {
      if (mem.user.toString() !== memberId.toString()) {
        updatedMembers.push(mem);
      }
    }
    workspace.members = updatedMembers;

    await workspace.save();
    await workspace.populate("members.user", "username email");

    return res.status(200).json({
      message: "Successfully removed member from workspace",
      workspace,
    });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to remove member from workspace",
      error: error.message,
    });
  }
};

// export functions
module.exports = {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
};
