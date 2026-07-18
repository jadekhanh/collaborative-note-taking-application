/**
 * Workspace Card UI
 * @params
 * - workspace: workspace that the card belongs to
 * - isOwner: whether current user is owner of workspace
 * - currentRole: role of user inside the workspace (OWNER, EDITOR, VIEWER)
 * - onOpen: a function from Workspace to open workspace
 * - onRename: a function from Workspace to rename workspace
 * - onDelete: a function from Workspace to delete workspace
 * - onManageMembers: function from Workspace to view/manage members
 */
const WorkspaceCard = ({
  workspace,
  isOwner,
  currentRole,
  onOpen,
  onRename,
  onDelete,
  onManageMembers,
}) => {
  return (
    <div className="workspace-card">
      <button
        type="button"
        className="workspace-card-main"
        onClick={() => onOpen(workspace._id)}
      >
        <h2>{workspace.name}</h2>

        <p>{workspace.members?.length || 0} member(s)</p>

        {!isOwner && <span className="workspace-role">{currentRole}</span>}
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
