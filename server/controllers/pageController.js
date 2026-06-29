const Page = require("../models/Page");
const Block = require("../models/Block");
const PagePermission = require("../models/PagePermission");
const Workspace = require("../models/Workspace");

/**
 * Check if current user has access to workspace where page belongs
 */
const checkWorkspaceMembership = async (workspaceId, userId) => {
  // get workspace
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return false;
  }

  // check if current user has access to workspace
  for (const member of workspace.members) {
    if (member.user.toString() === userId.toString()) {
      return true;
    }
  }
  return false;
};

/**
 * Create a page
 */
const createPage = async (req, res) => {
  try {
    // extract vars from frontend req
    // note: these are the only fields that frontend user is allowed to control when they first create a page
    const { title, workspaceId, parentPage, icon } = req.body;

    // check if this user is a member of this workshop
    // frontend does not send userId, this is from protect() middleware
    const isMember = await checkWorkspaceMembership(workspaceId, req.user._id);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "Do not have access to workspace" });
    }

    // create a page
    const page = await Page.create({
      title: title,
      workspace: workspaceId,
      parentPage: parentPage,
      owner: req.user._id,
      icon: icon,
    });

    // create page permission
    await PagePermission.create({
      page: page,
      user: req.user._id,
      role: "OWNER",
      grantedBy: req.user._id,
    });

    // 201 = created
    return res
      .status(201)
      .json({ message: "Successfully created a page:", page });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to create a page:", error: error.message });
  }
};

/**
 * Get all pages by workspace
 */
const getPagesByWorkspace = async (req, res) => {
  try {
    // extract from req params
    // GET /pages/:workspaceId
    const { workspaceId } = req.params;

    // check if this user is member of the workspace
    const isMember = checkWorkspaceMembership(workspaceId);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "Do not have access to workspace" });
    }

    // get non-archived pages by workspace, sorted by order and createdAt in ascending order
    const pages = await Pages.find({
      workspace: workspaceId,
      isArchived: false,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ pages });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get pages of workspace",
      error: error.message,
    });
  }
};

/**
 * Get a page by its ID
 * Also output blocks inside this page
 */
const getPageById = async (req, res) => {
  try {
    // extract from req.params
    // GET /pages/:pageId
    const { pageId } = req.params;

    // get page
    // repace workspace id with its name, replace owner id with its username and email
    const page = await Pages.findById(pageId)
      .populate("workspace", "name")
      .populate("owner", "username email");
    if (!page || page.isArchived) {
      // 404 = cannot find
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has permission to access this page
    const isPermitted = await PagePermission.findOne({
      page: pageId,
      user: req.user._id,
    });
    // check if this user is member of the workspace
    const isMember = checkWorkspaceMembership(workspaceId);
    if (!isMember && !isPermitted) {
      return res
        .status(403)
        .json({ message: "Do not have access to workspace" });
    }

    // get page blocks in ascending order
    const blocks = await Blocks.find({ page: pageId }).sort({ order: 1 });

    return res.status(200).json({ page, blocks });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch page", error: error.message });
  }
};

/**
 * Archive page
 */
const archivePage = async (req, res) => {
  try {
    // extract pageId from req.params
    const { pageId } = req.params;

    // get page
    const page = await Pages.findById(pageId);
    if (!page || page.isArchived) {
      // 404 = cannot find
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user is the owner of this page
    if (req.user._id.toString() !== page.owner.toString()) {
      return res
        .status(403)
        .json({ message: "Only page owner can archive this page" });
    }

    // archive page
    page.isArchived = true;
    await page.save();

    res.status(200).json({ message: "Successfully archive page", page });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to archive page", error: error.message });
  }
};

/**
 * Update page
 * Only editable page settings: title, parent page, icon, cover image url, order
 *
 * Cannot update:
 * owner: need a seperate endpoint with stricter rules: PATCH /api/pages/:pageId/transfer-owner
 * workspace: need a seperate endpoint with stricter rules: PATCH /api/pages/:pageId/move
 */
const updatePage = async (req, res) => {
  try {
    // extract variables from req.body
    const { title, icon, parentPage, coverImageUrl, order } = req.body;

    // get page
    const page = await Pages.findById(req.params.pageId);
    if (!page || page.isArchived) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has permission to access this page
    const isPermitted = await PagePermission.findOne({
      page: pageId,
      user: req.user._id,
    });
    // check if this user is member of the workspace
    const isMember = checkWorkspaceMembership(workspaceId);
    if (!isMember && !isPermitted) {
      return res
        .status(403)
        .json({ message: "Do not have access to workspace" });
    }

    // update page fields
    if (title !== undefined) {
      page.title = title;
    }
    if (icon !== undefined) {
      page.icon = icon;
    }
    if (parentPage !== undefined) {
      page.parentPage = parentPage;
    }
    if (coverImageUrl !== undefined) {
      page.coverImageUrl = coverImageUrl;
    }
    if (order !== undefined) {
      page.order = order;
    }

    await page.save();

    return res.status(200).json({ message: "Successfully update page", page });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update page", error: error.message });
  }
};

/**
 * Delete page
 */
const deletePage = async (req, res) => {
  try {
    // extract from req params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(req.params.pageId);
    if (!page || page.isArchived) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if user is page owner
    if (req.user._id.toString() !== page.owner.toString()) {
      return res
        .status(403)
        .json({ message: "Only page owner can delete this page" });
    }

    // delete blocks belonging to this page
    await Block.deleteMany({ page: pageId });
    // delete page permissions belonging to this page
    await PagePermission.deleteMany({ page: pageId });
    // delete this page
    await page.deleteOne();

    return res.status(200).json({ message: "Successfully delete page" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete page", error: error.message });
  }
};

// export functions
module.exports = {
  createPage,
  updatePage,
  deletePage,
  getPageById,
  getPagesByWorkspace,
  archivePage,
};
