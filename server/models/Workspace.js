const mongoose = require("mongoose");

/**
 * Workspace schema = @Entity Workspace in Spring Boot
 * A workspace has:
 * 1. owner: User
 * 2. members: List<WorkspaceMember>
 */
const workspaceSchema = new mongoose.Schema(
    {
        // each workspace has a name
        name: {
            type: String,
            required: [true, "Workspace name is required"],
            trim: true, // remove spaces if workspace name has spaces
            maxLength: 20,
        },
        // each workspace has an owner
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // each workspace has an array of members
        members: [workspaceMemberSchema],
    },
    // automatically creates createdAt and updatedAt
    { timestamps: true },
);

/**
 * Workspace Member schema represents members in the workspace
 * Similar to Cart items in Cart in my marketplace project
 */
const workspaceMemberSchema = new mongoose.Schema(
    {
        // each member has a user field
        // stores MongoDB ID which refers to User model, not whole user object
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // each member has a role
        role: {
            type: String,
            enum: ["OWNER", "EDITOR", "VIEWER"],
            default: "EDITOR",
        },
    },
    // do not create seperate _id for member objects
    {_id: false},
);

// exports Workspace model
// we do not export workspaceMemberSchema since it is not a model but it is a schema to be used inside Workspace model
module.exports = mongoose.model("Workspace", workspaceSchema);