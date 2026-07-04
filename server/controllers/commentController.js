const CommentThread = require("../models/CommentThread");
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
 * Create a comment thread
 */
const createCommentThread = async (req, res) => {
  try {
    // get pageId, blockId, content from req body
    const { pageId, blockId, block, content } = req.body;
    const resolvedBlockId = blockId || block;

    if (!pageId || !resolvedBlockId || !content) {
      return res.status(400).json({
        message: "pageId, blockId, and content are required",
      });
    }

    // check if current user can access this page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      return res.status(403).json({
        message: "Do not have permission to create comment thread on page",
      });
    }

    // create a comment thread
    const thread = await CommentThread.create({
      page: pageId,
      block: resolvedBlockId,
      author: req.user._id,
      content,
    });

    await thread.populate("author", "username email");

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

    // check if current user can access this page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      return res.status(403).json({
        message: "Do not have permission to get comment threads on page",
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

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // check if current user can access this page
    const isPermitted = await checkPageMembership(
      thread.page._id,
      req.user._id,
    );
    if (!isPermitted) {
      return res.status(403).json({
        message:
          "Do not have permission to add reply to comment threads on page",
      });
    }

    // add new reply to thread
    thread.replies.push({ author: req.user._id, content: content });
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

    // get thread
    const thread = await CommentThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Comment thread not found" });
    }

    // check if current user can access this page
    const isPermitted = await checkPageMembership(
      thread.page._id,
      req.user._id,
    );
    if (!isPermitted) {
      return res.status(403).json({
        message: "Do not have permission to update comment threads on page",
      });
    }

    // check if current user is the author of the comment thread
    if (req.user._id.toString() !== thread.author._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only author can update comment thread" });
    }

    // update comment thread content
    thread.content = content;
    await thread.save();

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

    // check if current user can access this page
    const isPermitted = await checkPageMembership(
      thread.page._id,
      req.user._id,
    );
    if (!isPermitted) {
      return res.status(403).json({
        message: "Do not have permission to resolve comment threads on page",
      });
    }

    // resolve comment thread
    thread.isResolved = true;
    await thread.save();

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

    // check if current user can access this page
    const isPermitted = await checkPageMembership(
      thread.page._id,
      req.user._id,
    );
    if (!isPermitted) {
      return res.status(403).json({
        message: "Do not have permission to delete comment threads on page",
      });
    }

    // check if current user is the author of the comment thread
    if (req.user._id.toString() !== thread.author._id.toString()) {
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

module.exports = {
  createCommentThread,
  getCommentThreadsByPage,
  addReplyToCommentThread,
  updateCommentThread,
  resolveCommentThread,
  deleteCommentThread,
};
