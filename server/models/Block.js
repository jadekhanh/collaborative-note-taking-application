const mongoose = require("mongoose");

/**
 * block Schema = @Entity Block in Spring Boot = represents a block in a page
 * Following fields: page, type, content, order, createdBy, updatedBy
 */
const blockSchema = new mongoose.Schema(
  {
    // stores MongoDB ID that refers to Page model, not the whole Page object
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },
    // text type
    type: {
      type: String,
      enum: [
        "paragraph",
        "heading",
        "subheading",
        "bullet",
        "numbered",
        "checklist",
        "code",
        "quote",
        "image",
        "file",
      ],
      default: "paragraph",
    },
    // content of a block, which could be an image, code, text, checklist
    content: {
      // allow every type
      type: mongoose.Schema.Types.Mixed,
      // empty object
      default: {},
      trim: true, // removes leading and trailing spaces
    },
    // order of a block inside a page
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    // user who creates the block
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // last user who updates the block
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
  },
  // automatically creates createdAt and updatedAt
  { timestamps: true },
);

// compound index: when query a page, returns the blocks in ascending order
blockSchema.index({ page: 1, order: 1 });

// export block model
module.exports = mongoose.model("Block", blockSchema);
