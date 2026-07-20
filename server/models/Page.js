const mongoose = require("mongoose");

/**
 * pageSchema = @Entity Page in Spring Boot = represents document page
 * Following fields: title, workspace, parentPage, owner, icon, coverImageUrl, isArchived, order
 */
const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Page title is required"],
      default: "Untitled",
      trim: true, // remove leading and trailing spaces
    },
    // stores MongoDB ID that refers to Workspace model, not the whole Workspace object
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    // stores MongoDB ID that refers to the Page model, not the whole Page object
    parentPage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      default: null,
    },
    // stores MongoDB that refers to the User model, not the whole User object
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // page icon
    icon: {
      type: String, // emojis are Unicode text
      default: "",
    },
    // cover image url
    coverImageUrl: {
      type: String,
      default: "",
    },
    // boolean if page is archived
    isArchived: {
      type: Boolean,
      default: false,
    },
    // page order = where page appears in the sidebar
    order: {
      type: Number,
      default: 0,
    },
    // users who starred this page as a favorite
    favoritedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  // automatically creates createdAt and updatedAt
  { timestamps: true },
);

// .index speeds up queries that find pages by workspace, parent page, owner
// 1 = sorts in ascending order
pageSchema.index({ workspace: 1 });
pageSchema.index({ parentPage: 1 });
pageSchema.index({ owner: 1 });

// export Page model
module.exports = mongoose.model("Page", pageSchema);
