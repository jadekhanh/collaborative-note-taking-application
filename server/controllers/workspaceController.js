const Workspace = require("../models/Workspace");

/**
 * Create a workspace
 */
const createWorkspace = async (req, res) => {
    try {
        // create a workspace
        const workspace = await Workspace.create({
            name: req.body.name,
            owner: req.user._id, // get from currently logged in user via protect() which stores req._id inside req. Note: this is so frontend cannot decide who the owner of the workspace is, only server can
            members: [{user: req._id, role: "OWNER"}], // initially, list of members only contains owner
        });

        // 201 = created
        return res.status(201).json({ message: "Successfully created a workspace:", workspace});
    } catch (error) {
        // 500 = internal error
        return res.status(500).json({ message: "Failed to create a workspace", error: error.message });
    }
};

/**
 * Get current's user workspaces
 */
const getMyWorkspaces = async (req, res) => {
    try {
        /// search in every workspace's members list
        // find workspaces where any members.user = me
        // visual: in Workspace A, members: [{user: Jade}, {user: Teddy}, ...]
        // .populate("owner", "username email") = because owner field stores ObjectId, we replaces ObjectId with username and email fields
        // .populate("members.user", "username email") = because members.user stores ObjectId, we replaces it with username email
        // purpose: when we return workspace, it's easier to read. no need to .populate() if we don't need to return workspace
        const workspaces = await Workspace.find({ "members.user": req.user._id }).populate("owner", "username email").populate("members.user", "username email");

        // 200 = success
        return res.status(200).json(workspaces);
    } catch (error) {
        // 500 = internal error
        return res.status(500).json({ message: "Failed to fetch user's workspaces", error: error.message });
    }
};

/**
 * Get a workspace by its ID
 */
const getWorkspaceById = async (req, res) => {
    try {
        // get workspace
        const workspace = await Workspace.findById(req.params.workspaceId).populate("owner", "username email").populate("members.user", "username email");

        // if workspace doesn't exist
        if (!workspace) {
            return res.status(401).json({ message: "Workspace not found"});
        }

        // check if this user is member of this workspace
        let isMember = false;
        for (const member of workspace.members) {
            if (member.user._id.toString == req.user._id.toString()) {
                isMember = true;
                break;
            }
        }
        if (!isMember) {
            // 403 = access denied
            return res.status(403).json({ message: "Do not have permission to access this workspace"});
        }

        return res.status(200).json({ workspace });

    } catch (error) {
        // 500 = internal error
        return res.status(500).json({ message: "Failed to fetch workspace", error: error.message });
    }
};

/**
 * Update a workspace's name
 */
const updateWorkspace = async (req, res) => {
    try {
        // get workspace
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(401).json({ message: "Workspace not found"});
        }

        // check if this user is the owner of the workspace
        if (workspace.owner.toString() !== req.body.user._id.toString()) {
            // 403 = access denied
            return res.status(403).json({ message: "Do not have permission to update this workspace"});
        }

        // update workspace's name 
        workspace.name = req.body.name;

        // save workspace
        await workspace.save();

        return res.status(200).json({ message: "Successfully update workspace", workspace});

    } catch (error) {
        // 500 = internal error
        return res.status(500).json({ message: "Failed to update workspace", error: error.message });
    }
};

/**
 * Delete workspace
 */
const deleteWorkspace = async (req, res) => {
    try {
        // get workspace
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(401).json({ message: "Workspace not found"});
        }

        // check if this user is the owner of the workspace
        if (workspace.owner.toString() !== req.body.user._id.toString()) {
            // 403 = access denied
            return res.status(403).json({ message: "Do not have permission to delete this workspace"});
        }

        await workspace.deleteOne();

        return res.status(200).json({message: "Successfully delete workspace"});

    } catch (error) {
        // 500 = internal error
        return res.status(500).json({ message: "Failed to delete workspace", error: error.message });
    }
};

/**
 * Add new member into workspace
 */
const addWorkspaceMember = async (req, res) => {
    try {
        // get workspace
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(401).json({ message: "Workspace not found"});
        }

        // check if this user is the owner of the workspace
        if (workspace.owner.toString() !== req.user._id.toString()) {
            // 403 = access denied
            return res.status(403).json({ message: "Do not have permission to modify this workspace"});
        }

        // check if this user is already a member in workspace
        let isMember = false;
        for (const member of workspace.members) {
            if (member.user._id.toString() == req.body.userId.toString()) {
                isMember = true;
                break;
            }
        }
        if (isMember) {
            return res.status(409).json({ message: "User is already a member of workspace"});
        }

        // push user into members list
        workspace.members.push({ user: req.body.userId, role: req.body.role });

        return res.status(200).json({message: "Successfully add member to workspace"});

    } catch (error) {
        // 500 = internal error
        return res.status(500).json({ message: "Failed to add member to workspace", error: error.message });
    }
};

// export functions
module.exports = { createWorkspace, updateWorkspace, deleteWorkspace, addWorkspaceMember, getMyWorkspaces, getWorkspaceById };