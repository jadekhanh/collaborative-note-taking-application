const Block = require("../models/Block");
const Page = require("../models/Page");
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
 * Create a block
 */
const createBlock = async (req, res) => {
  try {
    // extract from req.body
    const { pageId, type, content, order } = req.body;
    if (!pageId || !type || content === undefined) {
      return res.status(400).json({
        message: "pageId, type, and content are required",
      });
    }

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

    // create a block
    const block = await Block.create({
      page: pageId,
      type: type,
      content: content,
      order: order,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    return res
      .status(201)
      .json({ message: "Successfully create a block", block });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to create a block", error: error.message });
  }
};

/**
 * Copy a block
 */
const copyBlock = async (req, res) => {
  try {
    // extract id from req param
    const { blockId } = req.params;
    // get original block
    const originalBlock = await Block.findById(blockId);
    if (!originalBlock) {
      return res.status(404).json({ message: "Block not found" });
    }

    // get page
    const page = await Page.findById(originalBlock.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required",
      });
    }

    // increment orders of later blocks
    await Block.updateMany(
      {
        page: originalBlock.page,
        order: { $gt: originalBlock.order },
      },
      {
        $inc: { order: 1 },
      },
    );

    // create duplicated block
    const duplicatedBlock = await Block.create({
      page: originalBlock.page,
      type: originalBlock.type,
      content: originalBlock.content,
      order: originalBlock.order + 1,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    return res
      .status(201)
      .json({ message: "Successfully copy a block", block: duplicatedBlock });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to copy a block", error: error.message });
  }
};

/**
 * Get blocks by page
 */
const getBlocksByPage = async (req, res) => {
  try {
    // extract from req params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user is have access to the page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // get page's blocks in ascending order
    const blocks = await Block.find({ page: pageId }).sort({ order: 1 });

    return res.status(200).json({ blocks });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch page blocks", error: error.message });
  }
};

/**
 * Update block
 */
const updateBlock = async (req, res) => {
  try {
    // extract blockId from req params
    const { blockId } = req.params;
    // extract type, content, order from req body
    const { type, content, order } = req.body;

    // get block
    const block = await Block.findById(blockId);
    if (!block) {
      return res.status(404).json({
        message: "Block not found",
      });
    }

    // get page
    const page = await Page.findById(block.page);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access to this page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required",
      });
    }

    // update block fields
    if (type !== undefined) {
      block.type = type;
    }
    if (content !== undefined) {
      block.content = content;
    }
    if (order !== undefined) {
      block.order = order;
    }
    block.updatedBy = req.user._id;
    await block.save();

    return res
      .status(200)
      .json({ message: "Successfully update block", block });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update block", error: error.message });
  }
};

/**
 * Reorder all blocks inside a page
 */
const reorderBlocks = async (req, res) => {
  try {
    // extract pageId and blocks from req
    const { blocks } = req.body;
    const { pageId } = req.params;

    // make sure blocks is array-formatted
    if (!Array.isArray(blocks)) {
      return res.status(400).json({ message: "Blocks input must be an array" });
    }

    // check if blocks have valid blockId and order
    for (const block of blocks) {
      if (!block.blockId || !Number.isInteger(block.order) || block.order < 0) {
        return res.status(400).json({
          message: "Each block requires a valid blockId and order",
        });
      }
    }

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access to this page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required",
      });
    }

    // update each block's order
    for (const block of blocks) {
      const updatedBlock = await Block.findOneAndUpdate(
        {
          _id: block.blockId,
          page: pageId,
        },
        {
          order: block.order,
          updatedBy: req.user._id,
        },
      );
      if (!updatedBlock) {
        return res.status(400).json({
          message: "One or more blocks do not belong to this page",
        });
      }
    }

    return res.status(200).json({ message: "Successfully reorder blocks" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to reorder blocks", error: error.message });
  }
};

/**
 * Delete a block
 */
const deleteBlock = async (req, res) => {
  try {
    // extract block id from req params
    const { blockId } = req.params;

    // get block
    const block = await Block.findById(blockId);
    if (!block) {
      return res.status(404).json({
        message: "Block not found",
      });
    }

    // get page
    const page = await Page.findById(block.page);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access to this page
    const accessRole = await getPageRole(page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required",
      });
    }

    // delete block
    await block.deleteOne();

    return res.status(200).json({ message: "Successfully delete block" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete block", error: error.message });
  }
};

// export functions
module.exports = {
  createBlock,
  copyBlock,
  getBlocksByPage,
  updateBlock,
  reorderBlocks,
  deleteBlock,
};
