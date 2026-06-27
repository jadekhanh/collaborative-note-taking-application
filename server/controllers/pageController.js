const Page = require("../models/Page");

/**
 * Check if current user has access to workspace where page belongs
 */
const checkWorkspaceMembership = async (req, res) => {
    
};

/**
 * Create a page
 */
const createPage = async (req, res) => {
    try {
        // create a page
        const page = await Page.create({
            title: req.body.title,
            workspace: req.body.workspace,
            parentPage: req.body.parentPage,
            owner: req.body.owner,
            icon: req.body.icon,
            coverImageUrl: req.body.coverImageUrl,
            isArchived: false,
            order: 0,
        });

        // 201 = created
        return res.status(201).json({ message: "Successfully created a page:", page});

    } catch (error) {
        // 500 = internal error
        return res.status(500).json({ message: "Failed to create a page", error: error.message });
    }
};

// export functions
module.exports = { createPage };