const Version = require("../models/Version");
const Page = require("../models/Page");
const Block = require("../models/Block");

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
    const version = await PageVersion.findById(versionId);
    if (!version) {
      return res.status(404).json({ message: "Page version not found" });
    }

    // get page
    const page = await Page.findById(version.page);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // set page fields
    page.title = version.snapshot.title;
    page.icon = version.snapshot.icon || "";
    page.coverImageUrl = version.snapshot.coverImageUrl || "";
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
