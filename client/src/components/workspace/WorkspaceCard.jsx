/**
 * Workspace Card UI
 * @params
 * - workspace: workspace that the card belongs to
 * - isOwner: whether current user is owner of workspace
 * - onOpen: a function from Workspace to open workspace
 * - onRename: a function from Workspace to rename workspace
 * - onDelete: a function from Workspace to delete workspace
 * - onManageMembers: function from Workspace to view/manage members
 */
const WorkspaceCard = ({
  workspace,
  isOwner,
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
        type="button"
        className="workspace-card-main"
        onClick={() => onOpen(workspace._id)}
      >
        {/* display workspace name and number of members */}
        <h2>{workspace.name}</h2>
        <p>{workspace.members?.length || 0} member(s)</p>
      </button>

      <div className="workspace-card-actions">
        <button type="button" onClick={() => onManageMembers(workspace)}>
          Members
        </button>

        {isOwner && (
          <>
            <button type="button" onClick={() => onRename(workspace)}>
              Rename
            </button>

            <button type="button" onClick={() => onDelete(workspace._id)}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkspaceCard;
