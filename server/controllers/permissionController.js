const PagePermission = require("../models/Permission");
const Page = require("../models/Page");
const User = require("../models/User");

/**
 * Create a page permission / share page
 * Works for 2 scenarios:
 * If person being shared never has permission to this page before, create new one
 * If person being shared already has permission to this page, update it
 */
const createPagePermission = async (req, res) => {
  try {
    // get pageId from req params
    const { pageId } = req.params;
    // get email, role from req body
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

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // only owner can share the page
    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the page owner can manage sharing permissions",
      });
    }

    // get invited user with email
    const invitedUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });
    if (!invitedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (invitedUser._id.toString() === page.owner.toString()) {
      return res.status(400).json({
        message: "The page owner already has owner access",
      });
    }

    // create page permission
    // new: return the new updated permission, not the old one
    // upsert: true = if this person has permission to this page -> update. if not -> insert new one
    const permission = await PagePermission.findOneAndUpdate(
      { page: pageId, user: invitedUser._id },
      {
        page: pageId,
        user: invitedUser._id,
        role: role || "VIEWER",
        grantedBy: req.user._id,
      },
      { new: true, upsert: true },
    )
      .populate("user", "username email")
      .populate("grantedBy", "username email");

    return res
      .status(200)
      .json({ message: "Successfully share page to user", permission });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to share page", error: error.message });
  }
};

/**
 * Get all page permissions of a page
 */
const getPagePermissionsByPage = async (req, res) => {
  try {
    // get pageId from req params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);

    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    // only the actual page owner can view and manage sharing permissions
    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the page owner can view sharing permissions",
      });
    }

    // get all page permissions
    // replace user and grantedBy ID fields as username and email for readability
    const permissions = await PagePermission.find({ page: pageId })
      .populate("user", "username email")
      .populate("grantedBy", "username email");

    return res.status(200).json({ permissions });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to get all page permissions of requested page",
      error: error.message,
    });
  }
};

/**
 * Update a page permission
 */
const updatePagePermission = async (req, res) => {
  try {
    // extract pageId, permissionId from req params
    const { pageId, permissionId } = req.params;
    // extract role from req body
    const { role } = req.body;
    if (role !== "VIEWER" && role !== "EDITOR") {
      return res.status(400).json({
        message: "Role must be VIEWER or EDITOR",
      });
    }

    // get page permission
    const permission = await PagePermission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({
        message: "Page permission not found",
      });
    }
    if (permission.page.toString() !== pageId.toString()) {
      return res.status(400).json({
        message: "Permission does not belong to this page",
      });
    }

    // get the page belonging to this permission
    const page = await Page.findById(permission.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }
    if (permission.user.toString() === page.owner.toString()) {
      return res.status(403).json({
        message: "Cannot change or remove the page owner's permission",
      });
    }

    // only page owner can manage page permission
    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the page owner can manage sharing permissions",
      });
    }

    // update permission
    permission.role = role;
    await permission.save();

    // populate permission
    await permission.populate("user", "username email");

    return res
      .status(200)
      .json({ message: "Successfully update page permission", permission });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to update page permission",
      error: error.message,
    });
  }
};

/**
 * Delete a page permission
 */
const deletePagePermission = async (req, res) => {
  try {
    // extract pageId, permissionId from req params
    const { pageId, permissionId } = req.params;

    // get page permission
    const permission = await PagePermission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({
        message: "Page permission not found",
      });
    }
    if (permission.page.toString() !== pageId.toString()) {
      return res.status(400).json({
        message: "Permission does not belong to this page",
      });
    }

    // get the page belonging to this permission
    const page = await Page.findById(permission.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }
    if (permission.user.toString() === page.owner.toString()) {
      return res.status(403).json({
        message: "Cannot change or remove the page owner's permission",
      });
    }

    // only page owner can manage page permission
    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the page owner can manage sharing permissions",
      });
    }

    // delete permission
    await permission.deleteOne();

    return res
      .status(200)
      .json({ message: "Successfully delete page permission", permission });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to delete page permission",
      error: error.message,
    });
  }
};

// export functions
module.exports = {
  createPagePermission,
  getPagePermissionsByPage,
  updatePagePermission,
  deletePagePermission,
};
