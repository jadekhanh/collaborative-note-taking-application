const Version = require("../models/Version");
const Page = require("../models/Page");
const Block = require("../models/Block");
const Workspace = require("../models/Workspace");
const PagePermission = require("../models/Permission");

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
 * Create page version
 */
const createVersion = async (req, res) => {
  try {
    // extract pageId from req params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required",
      });
    }

    // get page blocks
    const blocks = await Block.find({
      page: pageId,
    }).sort({ order: 1 });

    // create page version
    const version = await Version.create({
      page: pageId,
      createdBy: req.user._id,
      snapshot: {
        title: page.title,
        icon: page.icon,
        coverImageUrl: page.coverImageUrl,
        blocks: blocks.map((block) => ({
          blockId: block._id,
          type: block.type,
          content: block.content,
          order: block.order,
          createdBy: block.createdBy,
          updatedBy: block.updatedBy,
        })),
      },
      source: req.body.source === "AUTO" ? "AUTO" : "MANUAL",
    });

    return res
      .status(201)
      .json({ message: "Successfully create page version", version });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to create page version", error: error.message });
  }
};

/**
 * Get page versions by page
 */
const getVersions = async (req, res) => {
  try {
    // extract pageId from req params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required",
      });
    }

    // get page version sorted by descending order
    // replace createdBy with username and email for readability
    const versions = await Version.find({
      page: pageId,
    })
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "Successfully fetch page versions", versions });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to fetch page versions", error: error.message });
  }
};

/**
 * Restore page version
 */
const restoreVersion = async (req, res) => {
  try {
    // extract versionId from req params
    const { versionId } = req.params;

    // get version
    const version = await Version.findById(versionId);
    if (!version) {
      return res.status(404).json({ message: "Page version not found" });
    }

    // get page
    const page = await Page.findById(version.page);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required",
      });
    }

    // set page fields
    page.title = version.snapshot.title;
    page.icon = version.snapshot.icon || "";
    page.coverImageUrl = version.snapshot.coverImageUrl || "";
    await page.save();

    // delete page blocks
    await Block.deleteMany({ page: version.page });

    // insert version blocks into page blocks
    const restoredBlocks = await Block.insertMany(
      version.snapshot.blocks.map((block) => ({
        _id: block.blockId,
        page: version.page,
        type: block.type,
        content: block.content,
        order: block.order,
        createdBy: block.createdBy,
        updatedBy: block.updatedBy,
      })),
    );

    return res.status(200).json({
      message: "Successfully restored page version",
      page,
      blocks: restoredBlocks,
    });
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to restore page version",
      error: error.message,
    });
  }
};

module.exports = { createVersion, getVersions, restoreVersion };
