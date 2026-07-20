const Page = require("../models/Page");
const Block = require("../models/Block");
const PagePermission = require("../models/Permission");
const Workspace = require("../models/Workspace");

/**
 * A user can access a page in 3 ways:
 * - own the page
 * - someone shares the page with them
 * - belong to the workspace
 *
 * Example:
 * workspace role = viewer
 * page-specific permission = editor
 * -> the person has editor permission
 */
const ROLE_PRIORITY = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

/**
 * Get the user's role inside the workspace
 */
const getWorkspaceRole = async (workspaceId, userId) => {
  // get workspace
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return null;
  }

  // find the member inside workspace that has matching user id
  const member = workspace.members.find(
    (workspaceMember) => workspaceMember.user.toString() === userId.toString(),
  );

  // return the role of this user
  // null if this user does not belong to the workspace
  return member?.role || null;
};

/**
 * Get the user's role inside the page
 */
const getPageRole = async (page, userId) => {
  // if this person is the page owner
  if (page.owner.toString() === userId.toString()) {
    return "OWNER";
  }

  // get user's page permission
  const pagePermission = await PagePermission.findOne({
    page: page._id,
    user: userId,
  });

  // get user's workspace role
  const workspaceRole = await getWorkspaceRole(page.workspace, userId);

  // get user's final page role
  let finalPageRole = null;

  // if this user has page permission, than it is their final page role
  if (pagePermission?.role) {
    finalPageRole = pagePermission.role;
  }

  // if this user has workspace role
  if (workspaceRole) {
    // if they don't have page role yet,
    if (!finalPageRole) {
      // if this user is the workspace owner, assign them page editor
      if (workspaceRole == "OWNER") {
        finalPageRole = "EDITOR";
      }
      // if this user is workspace viewer or editor, assign them as is
      else {
        finalPageRole = workspaceRole;
      }
    }
    // if they have a page role
    else {
      // if their workspace role is higher than page role
      if (ROLE_PRIORITY[workspaceRole] > ROLE_PRIORITY[finalPageRole]) {
        // if this user is the workspace owner, assign them page editor
        if (workspaceRole == "OWNER") {
          finalPageRole = "EDITOR";
        }
        // if this user is workspace viewer or editor, assign them as is
        else {
          finalPageRole = workspaceRole;
        }
      }
    }
  }

  return finalPageRole;
};

/**
 * Check if user can edit page
 */
const canEditPage = (pageAccessRole) => {
  if (pageAccessRole === "OWNER" || pageAccessRole === "EDITOR") {
    return true;
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

    // check if this user is a member of this workspace and is either OWNER or EDITOR
    const workspaceRole = await getWorkspaceRole(workspaceId, req.user._id);
    if (workspaceRole !== "OWNER" && workspaceRole !== "EDITOR") {
      return res.status(403).json({
        message: "Editor access is required to create a page",
      });
    }

    // create a page
    const page = await Page.create({
      title: title || "Untitled",
      workspace: workspaceId,
      parentPage: parentPage || null,
      owner: req.user._id,
      icon: icon || "",
    });

    // create page permission
    await PagePermission.create({
      page: page._id,
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
 * Get all non-archived pages by workspace
 */
const getPagesByWorkspace = async (req, res) => {
  try {
    // extract from req params
    // GET /pages/:workspaceId
    const { workspaceId } = req.params;

    // check if this user is member of the workspace
    const workspaceRole = await getWorkspaceRole(workspaceId, req.user._id);
    if (!workspaceRole) {
      return res.status(403).json({
        message: "Do not have access to this workspace",
      });
    }

    // get non-archived pages by workspace, sorted by order and createdAt in ascending order
    const pages = await Page.find({
      workspace: workspaceId,
      isArchived: false,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ pages });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get workspace pages",
      error: error.message,
    });
  }
};

/**
 * Get archived pages by workspace
 */
const getArchivedPages = async (req, res) => {
  try {
    // extract from req params
    // GET /pages/:workspaceId
    const { workspaceId } = req.params;

    // check if this user is workspace owner or editor
    const workspaceRole = await getWorkspaceRole(workspaceId, req.user._id);
    if (workspaceRole !== "OWNER" && workspaceRole !== "EDITOR") {
      return res.status(403).json({
        message: "Editor access is required to view archived pages",
      });
    }

    // get archived pages by workspace, sorted by order and createdAt in ascending order
    const pages = await Page.find({
      workspace: workspaceId,
      isArchived: true,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ pages });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get archived pages",
      error: error.message,
    });
  }
};

/**
 * Restore a page from archived to un-archived
 */
const restorePage = async (req, res) => {
  try {
    // extract pageId
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user can edit page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required to restore this page",
      });
    }

    // unarchive page
    page.isArchived = false;
    await page.save();

    return res
      .status(200)
      .json({ message: "Successfully restored page", page });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to restore page",
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
    const page = await Page.findById(pageId);
    if (!page || page.isArchived) {
      // 404 = cannot find
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user can access the page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // get page blocks in ascending order
    const blocks = await Block.find({ page: pageId }).sort({ order: 1 });

    // Populate fields after authorization succeeds
    await page.populate("workspace", "name");
    await page.populate("owner", "username email");

    return res.status(200).json({ page, blocks, accessRole });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch page", error: error.message });
  }
};

/**
 * Archive page
 * Only OWNER can archive page
 */
const archivePage = async (req, res) => {
  try {
    // extract pageId from req.params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page || page.isArchived) {
      // 404 = cannot find
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user is the owner of this page
    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the page owner can archive this page",
      });
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
    // extract pageId from req.params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page || page.isArchived) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access the page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required to update this page",
      });
    }

    /*
     * Prevent a page from becoming its own parent
     */
    if (
      parentPage !== undefined &&
      parentPage !== null &&
      parentPage.toString() === page._id.toString()
    ) {
      return res.status(400).json({
        message: "A page cannot be its own parent",
      });
    }

    /*
     * If moving under another parent, verify the new parent belongs to the same workspace
     */
    if (parentPage) {
      const newParent = await Page.findOne({
        _id: parentPage,
        workspace: page.workspace,
        isArchived: false,
      });
      if (!newParent) {
        return res.status(400).json({
          message: "Parent page does not belong to the same workspace",
        });
      }
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

    return res
      .status(200)
      .json({ message: "Successfully updated page", page, accessRole });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update page", error: error.message });
  }
};

/**
 * Delete page
 * Only OWNER can delete page
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
    if (page.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the page owner can delete this page",
      });
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

/**
 * Get pages shared directly with the current user
 */
const getPagesSharedWithMe = async (req, res) => {
  try {
    // find every direct page permission belonging to the current user
    const permissions = await PagePermission.find({
      user: req.user._id,
      role: { $in: ["VIEWER", "EDITOR"] },
    })
      .populate({
        path: "page",
        match: {
          isArchived: false,
        },
        populate: [
          {
            path: "workspace",
            select: "name",
          },
          {
            path: "owner",
            select: "username email",
          },
        ],
      })
      .sort({ updatedAt: -1 });

    // remove permissions whose page no longer exists or is archived
    const sharedPages = [];

    for (const permission of permissions) {
      if (permission.page) {
        sharedPages.push({
          page: permission.page,
          accessRole: permission.role,
        });
      }
    }

    return res.status(200).json({
      sharedPages,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load shared pages",
      error: error.message,
    });
  }
};

/**
 * Toggle whether the current user favorited a page
 */
const togglePageFavorite = async (req, res) => {
  try {
    // extract pageId from req.params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page || page.isArchived) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has access to the page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // check if this user already favorited the page
    const userId = req.user._id.toString();
    const alreadyFavorited = page.favoritedBy.some(
      (favoriteUserId) => favoriteUserId.toString() === userId,
    );

    // if this user already favorited the page, remove them from the page'sfavoritedBy list
    if (alreadyFavorited) {
      page.favoritedBy = page.favoritedBy.filter(
        (favoriteUserId) => favoriteUserId.toString() !== userId,
      );
    }
    // if this user did not favorited the page, add them to the page's favoritedBy list
    else {
      page.favoritedBy.push(req.user._id);
    }

    // save the page
    await page.save();

    return res.status(200).json({
      page,
      isFavorited: !alreadyFavorited,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to toggle page favorite",
      error: error.message,
    });
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
  getArchivedPages,
  restorePage,
  getPagesSharedWithMe,
  togglePageFavorite,
};
