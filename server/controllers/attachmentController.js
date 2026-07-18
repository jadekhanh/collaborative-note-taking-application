const Attachment = require("../models/Attachment");
const Page = require("../models/Page");
const PagePermission = require("../models/Permission");
const Workspace = require("../models/Workspace");
const Block = require("../models/Block");

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
const getPageRole = async (pageId, userId) => {
  // get the page whose access is being checked
  const page = await Page.findById(pageId);
  if (!page) {
    return null;
  }

  // page owner always has OWNER access
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
 * Check if the user may view the page
 * The user has to be page's OWNER, EDITOR, or VIEWER, and cannot be null (which means they might be a registered user but does not belong to the page)
 */
const canAccessPage = (pageAccessRole) => {
  return Boolean(pageAccessRole);
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
    if (!pageId || !fileUrl || !fileName) {
      return res.status(400).json({
        message: "pageId, fileUrl, and fileName are required",
      });
    }

    // get block
    if (blockId) {
      const block = await Block.findOne({
        _id: blockId,
        page: pageId,
      });
      if (!block) {
        return res.status(400).json({
          message: "Block does not belong to the requested page",
        });
      }
    }

    // check if this user has editor access to the page
    const accessRole = await getPageRole(pageId, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required to create an attachment",
      });
    }

    // create attachment
    const attachment = await Attachment.create({
      page: pageId,
      block: blockId || null,
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

    // check if current user has access to the page
    const accessRole = await getPageRole(pageId, req.user._id);
    if (!canAccessPage(accessRole)) {
      return res.status(403).json({
        message: "Do not have access to this page's attachments",
      });
    }

    const attachments = await Attachment.find({
      page: pageId,
    })
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
    // extract attachmentId from req params
    const { attachmentId } = req.params;

    // get attachment
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // check if this user has editor access to the page
    const accessRole = await getPageRole(attachment.page, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required to delete attachments",
      });
    }

    // delete attachment
    await attachment.deleteOne();

    return res.status(200).json({ message: "Successfully delete attachment" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete attachment", error: error.message });
  }
};

/**
 * Upload an attachment
 */
const uploadAttachment = async (req, res) => {
  try {
    // extract pageId and blockId from req body
    const { pageId, blockId } = req.body;
    if (!pageId) {
      return res.status(400).json({
        message: "pageId is required",
      });
    }

    // if there's no file
    // NOTE: after Multer runs, it adds file property into req which has the following fields: { fieldName, originalName, fileName, destination, path, mimetype, size }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // get block
    if (blockId) {
      const block = await Block.findOne({
        _id: blockId,
        page: pageId,
      });
      if (!block) {
        return res.status(400).json({
          message: "Block does not belong to the requested page",
        });
      }
    }

    // check if this user has editor access to this page
    const accessRole = await getPageRole(pageId, req.user._id);
    if (!canEditPage(accessRole)) {
      return res.status(403).json({
        message: "Editor access is required to upload files",
      });
    }

    // create file url that users can use to access the upload file
    // protocol = http or https
    // host = host that user connects to: localhost:5001
    // filename = unique filename generated by Multer / upload middleware
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // create attachment
    const attachment = await Attachment.create({
      page: pageId,
      block: blockId || null,
      uploadedBy: req.user._id,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      storageProvider: "LOCAL",
    });

    return res
      .status(201)
      .json({ message: "Successfully upload attachment", attachment });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to upload attachment", error: error.message });
  }
};

// export functions
module.exports = {
  createAttachment,
  getAttachmentsByPage,
  deleteAttachment,
  uploadAttachment,
};
