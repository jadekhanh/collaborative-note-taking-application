const PageVersion = require("../models/Version");
const Page = require("../models/Page");
const Block = require("../models/Block");

/**
 * Create page version
 */
const createPageVersion = async (req, res) => {
  try {
    // extract pageId from req params
    const { pageId } = req.params;

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // get page blocks
    const blocks = await Block.find({ page: pageId, createdBy: req.user._id });

    // create page version
    const version = await PageVersion.create({
      page: pageId,
      createdBy: req.user._id,
      snapshot: {
        title: page.title,
        blocks: blocks.map((block) => ({
          type: block.type,
          content: block.content,
          order: block.order,
          createdBy: block.createdBy,
          updatedBy: block.updatedBy,
        })),
      },
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
const getPageVersions = async (req, res) => {
  try {
    // extract pageId from req params
    const { pageId } = req.params;

    // get page version sorted by descending order
    // replace createdBy with username and email for readability
    const versions = await PageVersion.find({
      page: pageId,
      createdBy: req.user._id,
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
const restorePageVersion = async (req, res) => {
  try {
    // extract pageId, versionId from req params
    const { pageId, versionId } = req.params;

    // get page
    const page = await Page.find({ page: pageId, user: req.user._id });
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // get version
    const version = await PageVersion.findById(versionId);
    if (!version) {
      return res.status(404).json({ message: "Page version not found" });
    }

    // set page title as version title
    page.title = version.title;
    await page.save();

    // delete page blocks
    await Block.deleteMany({ page: pageId });

    // insert version blocks into page blocks
    const restoredBlocks = await Block.insertMany(
      version.snapshot.blocks.map((block) => ({
        page: pageId,
        type: block.type,
        content: block.content,
        order: block.order,
        createdBy: block.createdBy,
        updatedBy: block.updatedBy,
      })),
    );

    return res
      .status(200)
      .json(
        { message: "Successfully restore page version" },
        page,
        restoredBlocks,
      );
  } catch (error) {
    // 500 = internal error
    return res.status(500).json({
      message: "Failed to restore page version",
      error: error.message,
    });
  }
};

module.exports = { createPageVersion, getPageVersions, restorePageVersion };
