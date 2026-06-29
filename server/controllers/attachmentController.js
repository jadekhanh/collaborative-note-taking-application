const Attachment = require("../models/Attachment");
const Page = require("../models/Page");
const PagePermission = require("../models/PagePermission");

/**
 * Check if this user has permission to page
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
 * Create an attachment
 */
const createAttachment = async (req, res) => {
  try {
    // extract pageId, blockId, fileUrl, fileName, fileType, fileSize, storageProvider from req body
    const {
      pageId,
      blockId,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      storageProvider,
    } = req.body;

    // check if this user has permission to create attachment in requested page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      return res.status(403).json({
        message: "Do not have permission to the page",
      });
    }

    // create attachment
    const attachment = await Attachment.create({
      page: pageId,
      block: blockId,
      uploadedBy: req.user._id,
      fileUrl: fileUrl,
      fileName: fileName,
      fileType: fileType,
      fileSize: fileSize,
      storageProvider: storageProvider,
    });

    return res.status(201).json({ attachment });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to create attachment", error: error.message });
  }
};

/**
 * Get all attachments by page
 */
const getAttachmentsByPage = async (req, res) => {
  try {
    // extract pageId from req.params
    const { pageId } = req.params;

    const attachments = Attachment.find({ page: pageId })
      .populate("uploadedBy", "username email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ attachments });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch attachments", error: error.message });
  }
};

/**
 * Delete an attachment
 */
const deleteAttachment = async (req, res) => {
  try {
    // extract attachmentId from req body
    const { attachmentId } = req.body;

    // get attachment
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // check if this user has permission to modify attachment in requested page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      return res.status(403).json({
        message: "Do not have permission to delete attachment",
      });
    }

    // delete attachment
    await attachment.deleteOne();

    return res.status(201).json({ message: "Successfully delete attachment" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete attachment", error: error.message });
  }
};

// export functions
module.exports = { createAttachment, getAttachmentsByPage, deleteAttachment };
