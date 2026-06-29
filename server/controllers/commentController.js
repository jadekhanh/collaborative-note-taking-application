const Comment = require("../models/Comment");
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
 * Create a comment
 */
const createComment = async (req, res) => {
  try {
    // get pageId, blockId, content from req body
    const { pageId, blockId, content } = req.body;

    // check if this user has permission to page
    const isPermitted = await checkPageMembership(pageId, req.user._id);
    if (!isPermitted) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Do not have permission to create comment" });
    }

    // create comment
    const comment = await Comment.create({
      page: pageId,
      block: blockId,
      author: req.user._id,
      content: content,
    });

    // replace author with username and email for readiability
    await comment.populate("author", "username email");

    return res
      .status(200)
      .json({ message: "Successfully create comment", comment });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to create comment", error: error.message });
  }
};

/**
 * Get all comments by page
 */
const getCommentsByPage = async (req, res) => {
  try {
    // extract pageId from req params
    const { pageId } = req.params;

    // get all comments by page sorted by createdAt in ascending order
    // replace author with username and email for readiability
    const comments = await Comment.findById({ page: pageId })
      .populate("author", "username email")
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({ comments });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to fetch comments", error: error.message });
  }
};

/**
 * Resolve a comment
 */
const resolveComment = async (req, res) => {
  try {
    // extract commentId from req params
    const { commentId } = req.params;

    // get comment
    const comment = await Comments.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // check if this user has permission to page
    const isPermitted = await checkPageMembership(comment.page, req.user._id);
    if (!isPermitted) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Do not have permission to resolve the comment" });
    }

    comment.isResolved = true;
    await comment.save();

    return res
      .status(200)
      .json({ message: "Successfully resolve comment", comment });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to resolve comment", error: error.message });
  }
};

/**
 * Update a comment
 */
const updateComment = async (req, res) => {
  try {
    // extract commentId from req params
    const { commentId } = req.params;
    // extract content from req body
    const { content } = req.body;

    // get comment
    const comment = await Comments.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // check if this user has permission to page
    const isPermitted = await checkPageMembership(comment.page, req.user._id);
    if (!isPermitted) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Do not have permission to update comment" });
    }

    comment.content = content;
    await comment.save();

    return res
      .status(200)
      .json({ message: "Successfully update comment", comment });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to update comment", error: error.message });
  }
};

/**
 * Delete a comment
 */
const deleteComment = async (req, res) => {
  try {
    // extract commentId from req params
    const { commentId } = req.params;

    // get comment
    const comment = await Comments.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // check if this user has permission to page
    const isPermitted = await checkPageMembership(comment.page, req.user._id);
    if (!isPermitted) {
      // 403 = access denied
      return res
        .status(403)
        .json({ message: "Do not have permission to delete comment" });
    }

    await comment.deleteOne();

    return res
      .status(200)
      .json({ message: "Successfully delete comment", comment });
  } catch (error) {
    // 500 = internal error
    return res
      .status(500)
      .json({ message: "Failed to delete comment", error: error.message });
  }
};

// export functions
module.exports = {
  createComment,
  deleteComment,
  resolveComment,
  updateComment,
  getCommentsByPage,
};
