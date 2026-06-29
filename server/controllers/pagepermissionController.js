const PagePermission = require("../models/PagePermission");
const Page = require("../models/Page");

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
    // get userId, role from req body
    const { userId, role } = req.body;

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this person has permission as editor or owner to share the page
    const isPermitted = await PagePermission.findOne({
      page: pageId,
      user: req.user._id,
      role: { $in: ["OWNER", "EDITOR"] },
    });
    if (!isPermitted) {
      return res
        .status(403)
        .json({ message: "Do not have permission to share the page" });
    }

    // create page permission
    // new: return the new updated permission, not the old one
    // upsert: true = if this person has permission to this page -> update. if not -> insert new one
    const permission = await PagePermission.findOneAndUpdate(
      { page: pageId, user: userId },
      {
        page: pageId,
        user: userId,
        role: role,
        grantedBy: req.user._id,
      },
      { new: true, upsert: true },
    );

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

    // check if this person has permission as editor or owner to view all page permissions
    const isPermitted = await PagePermission.findOne({
      page: pageId,
      user: req.user._id,
      role: { $in: ["OWNER", "EDITOR"] },
    });
    if (!isPermitted) {
      return res.status(403).json({
        message:
          "Do not have permission to get all page permissions of requested page",
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
    // extract permissionId from req params
    const { permissionId } = req.params;
    // extract role from req body
    const { role } = req.body;

    // get page permission
    const permission = await PagePermission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({ message: "Page permission not found" });
    }

    // check if this person has permission as editor or owner to update the page permission
    const isPermitted = await PagePermission.findOne({
      page: permission.page,
      user: req.user._id,
      role: { $in: ["OWNER", "EDITOR"] },
    });
    if (!isPermitted) {
      return res
        .status(403)
        .json({ message: "Do not have permission to update page permission" });
    }

    // update permission
    permission.role = role;
    await permission.save();

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
    // extract permissionId from req params
    const { permissionId } = req.params;

    // get page permission
    const permission = await PagePermission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({ message: "Page permission not found" });
    }

    // check if this person has permission as editor or owner to update the page permission
    const isPermitted = await PagePermission.findOne({
      page: permission.page,
      user: req.user._id,
      role: { $in: ["OWNER", "EDITOR"] },
    });
    if (!isPermitted) {
      return res
        .status(403)
        .json({ message: "Do not have permission to delete page permission" });
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
