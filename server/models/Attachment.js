const mongoose = require("mongoose");

/**
 * attachment schema = @Entity Attachment in Spring Boot = represents attachment
 * Following fields: page, block, uploadedBy, fileUrl, fileName, fileType, fileSize, storageProvider
 */
const attachmentSchema = new mongoose.Schema(
  {
    // stores MongoDB ID that refers to the Page model, not the whole Page object
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },
    // stores MongoDB ID that refers to the Block model, not the whole Block object
    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
      default: null,
    },
    // stores MongoDB ID that refers to the User model, not the whole User object
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // file url
    fileUrl: {
      type: String,
      required: true,
    },
    // file name
    fileName: {
      type: String,
      required: true,
    },
    // file type
    fileType: {
      type: String,
      required: true,
    },
    // file size
    fileSize: {
      type: Number,
      required: true,
    },
    // storage provider
    storageProvider: {
      type: String,
      enum: ["LOCAL", "CLOUDINARY", "S3"],
      default: "LOCAL",
    },
  },
  // automatically creates createdAt and updatedAt
  { timestamps: true },
);

// query attachment by page
attachmentSchema.index({ page: 1 });
// query attachment by block
attachmentSchema.index({ block: 1 });
// query attachment by uploadedBy
attachmentSchema.index({ uploadedBy: 1 });

// export model
module.exports = mongoose.model("Attachment", attachmentSchema);
