const Block = require("../models/Block");
const Page = require("../models/Page");
const PagePermission = require("../models/Permission");
const Workspace = require("../models/Workspace");

/**
 * Escape special regex characters
 * E.g.,: "." becomes "\." so searching "." looks for an actual period instead of matching every character
 */
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Search accessible pages and blocks
 */
const search = async (req, res) => {
  try {
    // read the search query from GET /api/search?q=meeting
    const { q } = req.query;
    if (!q?.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    // remove surrounding spaces
    const trimmedQuery = q.trim();

    // treat special regex characters as normal text
    const escapedQuery = escapeRegex(trimmedQuery);

    /*
     * find every workspace where the current user is a member
     * which includes workspaces where this user is OWNER, EDITOR, and VIEWER because every workspace member may search pages they can access
     */
    const accessibleWorkspaces = await Workspace.find({
      "members.user": req.user._id,
    }).select("_id");

    // extract only the workspace IDs
    const accessibleWorkspaceIds = [];
    for (const workspace of accessibleWorkspaces) {
      accessibleWorkspaceIds.push(workspace._id);
    }

    // find every page shared directly with the current user
    const directPermissions = await PagePermission.find({
      user: req.user._id,
      role: {
        $in: ["OWNER", "EDITOR", "VIEWER"],
      },
    }).select("page");

    // extract only the shared page IDs
    const directlySharedPageIds = [];
    for (const permission of directPermissions) {
      directlySharedPageIds.push(permission.page);
    }

    /*
     * find all accessible, non-archived pages matching the title
     * a page is accessible if:
     * - the current user owns it
     * - its workspace includes the current user
     * - it was shared directly with the current user
     */
    const pages = await Page.find({
      isArchived: false,
      title: {
        $regex: escapedQuery,
        $options: "i",
      },
      $or: [
        {
          owner: req.user._id,
        },
        {
          workspace: {
            $in: accessibleWorkspaceIds,
          },
        },
        {
          _id: {
            $in: directlySharedPageIds,
          },
        },
      ],
    }).sort({
      updatedAt: -1,
    });

    /*
     * find every accessible non-archived page
     * we need all accessible page IDs because a block may match the query even when its page title does not
     */
    const accessiblePages = await Page.find({
      isArchived: false,
      $or: [
        {
          owner: req.user._id,
        },
        {
          workspace: {
            $in: accessibleWorkspaceIds,
          },
        },
        {
          _id: {
            $in: directlySharedPageIds,
          },
        },
      ],
    }).select("_id");
    const accessiblePageIds = [];
    for (const page of accessiblePages) {
      accessiblePageIds.push(page._id);
    }

    // search block text only inside pages the user can access
    const blocks = await Block.find({
      page: {
        $in: accessiblePageIds,
      },
      "content.text": {
        $regex: escapedQuery,
        $options: "i",
      },
    })
      .populate("page", "title icon workspace")
      .sort({
        updatedAt: -1,
      });

    return res.status(200).json({
      query: trimmedQuery,
      pages,
      blocks,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Search failed",
      error: error.message,
    });
  }
};

module.exports = {
  search,
};
