const CommentThread = require("../models/CommentThread");
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
 * Create a comment thread
 */
const createCommentThread = async (req, res) => {
  try {
    // get pageId, blockId, content from req body
    const { pageId, blockId, block, content } = req.body;
    const resolvedBlockId = blockId || block;

    // if missing pageId or content
    if (!pageId || !content?.trim()) {
      return res.status(400).json({
        message: "pageId and content are required",
      });
    }

    // get page
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // create a comment thread
    const thread = await CommentThread.create({
      page: pageId,
      block: resolvedBlockId || null,
      author: req.user._id,
      content: content.trim(),
    });

    // save thread
    await thread.save();
    await thread.populate("author", "username email");
    await thread.populate("replies.author", "username email");

    return res
      .status(201)
      .json({ message: "Successfully create comment thread", thread });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create comment thread",
      error: error.message,
    });
  }
};

/**
 * Get comment threads by page
 */
const getCommentThreadsByPage = async (req, res) => {
  try {
    // get pageId from req params
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

    // get comment threads
    const threads = await CommentThread.find({ page: pageId })
      .sort({ createdAt: -1 })
      .populate("author", "username email")
      .populate("replies.author", "username email");

    return res.status(200).json({ threads });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get comment threads by page",
      error: error.message,
    });
  }
};

/**
 * Add reply to comment thread
 */
const addReplyToCommentThread = async (req, res) => {
  try {
    // get threadId from req params
    const { threadId } = req.params;
    // get content from req body
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // get page
    const page = await Page.findById(thread.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // add new reply to thread
    thread.replies.push({
      author: req.user._id,
      content: content.trim(),
    });

    // save thread
    await thread.save();
    await thread.populate("author", "username email");
    await thread.populate("replies.author", "username email");

    return res
      .status(201)
      .json({ message: "Successfully add reply to comment thread", thread });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add reply to comment thread",
      error: error.message,
    });
  }
};

/**
 * Update comment thread
 */
const updateCommentThread = async (req, res) => {
  try {
    // get threadId from req params
    const { threadId } = req.params;
    // get content from req body
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // get page
    const page = await Page.findById(thread.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // check if current user is the author of the comment thread
    if (req.user._id.toString() !== thread.author.toString()) {
      return res
        .status(403)
        .json({ message: "Only author can update comment thread" });
    }

    // update comment thread content
    thread.content = content.trim();

    // save thread
    await thread.save();
    await thread.populate("author", "username email");
    await thread.populate("replies.author", "username email");

    return res
      .status(200)
      .json({ message: "Successfully update comment thread", thread });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update comment thread",
      error: error.message,
    });
  }
};

/**
 * Resolve comment thread
 */
const resolveCommentThread = async (req, res) => {
  try {
    // get threadId from req params
    const { threadId } = req.params;

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // get page
    const page = await Page.findById(thread.page);
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

    // resolve comment thread
    thread.isResolved = true;

    // save thread
    await thread.save();
    await thread.populate("author", "username email");
    await thread.populate("replies.author", "username email");

    return res
      .status(200)
      .json({ message: "Successfully resolve comment thread", thread });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to resolve comment thread",
      error: error.message,
    });
  }
};

/**
 * Delete comment thread
 */
const deleteCommentThread = async (req, res) => {
  try {
    // get threadId from req params
    const { threadId } = req.params;

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // get page
    const page = await Page.findById(thread.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // check if current user is the author of the comment thread
    if (req.user._id.toString() !== thread.author.toString()) {
      return res
        .status(403)
        .json({ message: "Only author can delete comment thread" });
    }

    // delete thread
    await thread.deleteOne();

    return res
      .status(200)
      .json({ message: "Successfully delete comment thread" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete comment thread",
      error: error.message,
    });
  }
};

/**
 * Edit reply inside a comment thread
 * Only author of the reply can edit
 */
const editReply = async (req, res) => {
  try {
    // extract threadId and replyId from req params
    const { threadId, replyId } = req.params;
    // extract content from req body
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // get page
    const page = await Page.findById(thread.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // get reply
    const reply = thread.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    // check if current user is the author of the reply
    if (req.user._id.toString() !== reply.author.toString()) {
      return res
        .status(403)
        .json({ message: "Only author can edit this reply" });
    }

    // update reply content
    reply.content = content.trim();

    // save thread
    await thread.save();
    await thread.populate("author", "username email");
    await thread.populate("replies.author", "username email");

    return res.status(200).json({
      message: "Successfully updated reply",
      thread,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to edit reply",
      error: error.message,
    });
  }
};

/**
 * Delete a reply from a comment thread
 * Only reply author can delete their reply
 */
const deleteReply = async (req, res) => {
  try {
    // extract threadId and replyId from req params
    const { threadId, replyId } = req.params;

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // get page
    const page = await Page.findById(thread.page);
    if (!page) {
      return res.status(404).json({
        message: "Page not found",
      });
    }

    // check if this user has editor access to page
    const accessRole = await getPageRole(page, req.user._id);
    if (!accessRole) {
      return res.status(403).json({
        message: "Do not have access to this page",
      });
    }

    // get reply
    const reply = thread.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    // check if current user is the author of the reply
    if (req.user._id.toString() !== reply.author.toString()) {
      return res
        .status(403)
        .json({ message: "Only author can delete this reply" });
    }

    // delete reply from thread
    thread.replies.pull(replyId);

    // save thread
    await thread.save();
    await thread.populate("author", "username email");
    await thread.populate("replies.author", "username email");

    return res.status(200).json({
      message: "Successfully deleted reply",
      thread,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete reply",
      error: error.message,
    });
  }
};

module.exports = {
  createCommentThread,
  getCommentThreadsByPage,
  addReplyToCommentThread,
  updateCommentThread,
  resolveCommentThread,
  deleteCommentThread,
  editReply,
  deleteReply,
};
