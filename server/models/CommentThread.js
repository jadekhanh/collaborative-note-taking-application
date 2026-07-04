const mongoose = require("mongoose");

/**
 * replySchema = @Entity Reply in Spring Boot = represents reply in comment thread
 * Fields: author, content
 */
const replySchema = new mongoose.Schema(
  {
    // stores MongoDB ID tha refers to User model, the user object itself
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // comment content
    content: {
      type: String,
      required: [true, "Reply content is required"],
      maxLength: 2000,
    },
    // automatically create createdAt and updatedAt
  },
  { timestamp: true },
);

/**
 * commentThreadSchema = @Entity Comment Thread in Spring Boot = represents comment
 * Following fields: page, author, block, content, isResolved
 * Not include workspace because it can be derived from page
 */
const commentThreadSchema = new mongoose.Schema(
  {
    // stores MongoDB ID that refers to Page model, not the page object itself
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },
    // stores MongoDB ID that refers to Block model, not the block object itself
    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
      required: true,
    },
    // stores MongoDB that refers to the User model, not the whole User object
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // comment content
    content: {
      type: String,
      required: [true, "Comment content is required"],
      maxLength: 2000,
    },
    // comment thread replies
    replies: [replySchema],
    // isResolved check
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  // automatically creates createdAt and updatedAt
  { timestamps: true },
);

// .index = speed up queries that find comment threads based on page
commentThreadSchema.index({ page: 1 });
// .index = speed up queries that find comment threads based on block
commentThreadSchema.index({ block: 1 });
// .index = speed up queries that find comment threads based on isResolved boolean
commentThreadSchema.index({ isResolved: 1 });

// export model
module.exports = mongoose.model("CommentThread", commentThreadSchema);
