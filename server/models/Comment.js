const mongoose = require("mongoose");

/**
 * commentSchema = @Entity Comment in Spring Boot = represents comment
 * Following fields: page, author, block, content, isResolved
 * Not include workspace because it can be derived from page
 */
const commentSchema = new mongoose.Schema(
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
        // isResolved check
        isResolved: {
            type: Boolean,
            default: false,
        },
    },
    // automatically creates createdAt and updatedAt
    { timestamps: true }
);

// .index = speed up queries that find comments based on page
commentSchema.index({ page: 1} );
// .index = speed up queries that find comments based on block
commentSchema.index({ block: 1} );

// export model
module.exports = mongoose.model("Comment", commentSchema);