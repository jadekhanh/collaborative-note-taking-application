const mongoose = require("mongoose");

/**
 * pagePermissionSchema = @Entity Page Permission in Spring Boot = represents page permission of a page
 * Following fields: page, user, role, grantedBy
 */
const pagePermissionSchema = new mongoose.Schema(
    {
        // stores MongoDB ID that refers to the Page model, not the whole Page object
        page: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Page",
            required: true,
        },
        // stores MongoDB that refers to the User model, not the whole User object
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // role of the user
        role: {
            type: String,
            enum: ["OWNER", "EDITOR", "VIEWER"],
            default: "VIEWER",
        },
        // user who grants this permission
        grantedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    // automatically creates createdAt and updatedAt
    { timestamps: true }
);

/**
 * Combination index:
 * one person only has 1 type of permission for each page
 * 
 * we don't allow: 
 * pageA, Jade, VIEWER
 * pageA, Jade, EDITOR
 * 
 * thus, (page, user) combination only appears once in the database
 */
pagePermissionSchema.index({ page: 1, user: 1}, { unique: 1 });

// export Page Permission model
module.exports = mongoose.model("PagePermission", pagePermissionSchema);