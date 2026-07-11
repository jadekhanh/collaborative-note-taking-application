/**
 * Workspace Card UI
 * @params
 * - workspace: workspace that the card belongs to
 * - onOpen: a function from Workspace to open workspace
 * - onRename: a function from Workspace to rename workspace
 * - onDelete: a function from Workspace to delete workspace
 * - onManageMembers: function from Workspace to view/manage members
 */
const WorkspaceCard = ({
  workspace,
  onOpen,
  onRename,
  onDelete,
  onManageMembers,
}) => {
  // return UI
  return (
    <div className="workspace-card">
      {/* A button to open workspace */}
      <button
        className="workspace-card-main"
        onClick={() => onOpen(workspace._id)}
      >
        {/* display workspace name and number of members */}
        <h2>{workspace.name}</h2>
        <p>{workspace.members?.length || 0} member(s)</p>
      </button>

      <div className="workspace-card-actions">
        <button onClick={() => onManageMembers(workspace)}>Members</button>
        {/* Rename button */}
        <button onClick={() => onRename(workspace)}>Rename</button>
        {/* Delete button */}
        <button onClick={() => onDelete(workspace._id)}>Delete</button>
      </div>
    </div>
  );
};

export default WorkspaceCard;
