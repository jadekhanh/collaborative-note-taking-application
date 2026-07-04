const Block = require("../models/Block");
const Page = require("../models/Page");
const PagePermission = require("../models/Permission");

/**
 * Check if current user has access to page
 */
const checkPageMembership = async (pageId, userId) => {
  // get page
  const page = await Page.findById(pageId);

  // check if this user is the page's owner
  if (userId === page.owner.toString()) {
    return true;
  }

  // check if this user has permission to this page as owner or editor
  // only viewer cannot modify a page
  const isPermitted = await PagePermission.findOne({
    page: pageId,
    user: userId,
    role: { $in: ["OWNER", "EDITOR"] },
  });
  if (!isPermitted) {
    return false;
  }
  return true;
};

/**
 * Create a block
 */
const createBlock = async (req, res) => {
  try {
    // extract from req.body
    const { pageId, type, content, order } = req.body;

    // check if this user has permission to block's page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      return res
        .status(404)
        .json({ message: "Do not have permission to edit page" });
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
 * Get blocks by page
 */
const getBlocksByPage = async (req, res) => {
  try {
    // extract from req params
    const { pageId } = req.params;

    // check if this user has permission to block's page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      return res
        .status(404)
        .json({ message: "Do not have permission to edit page" });
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
    // extract from req body
    const { blockId, type, content, order } = req.body;

    // get block
    const block = await Block.findById(blockId);

    // check if this user has permission to block's page
    const isPermitted = await checkPageMembership(block.page, req.user._id);
    if (!isPermitted) {
      return res
        .status(404)
        .json({ message: "Do not have permission to edit page" });
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

    // check if this user has permission to block's page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      return res
        .status(404)
        .json({ message: "Do not have permission to edit page" });
    }

    // make sure blocks is array-formatted
    if (!Array.isArray(blocks)) {
      return res.status(400).json({ message: "Blocks input must be an array" });
    }

    // update each block's order
    for (const block of blocks) {
      await Block.findByIdAndUpdate(block.blockId, { order: block.order });
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

    // check if this user has permission to block's page
    const isPermitted = await checkPageMembership(block.page, req.user._id);
    if (!isPermitted) {
      return res
        .status(404)
        .json({ message: "Do not have permission to edit page" });
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
  getBlocksByPage,
  updateBlock,
  reorderBlocks,
  deleteBlock,
};
