/**
 * Create Workspace Button at Sidebar
 */
const CreateWorkspaceButton = ({
  workspaceName,
  onWorkspaceNameChange,
  onCreateWorkspace,
}) => {
  // return UI
  return (
    <form className="workspace-form" onSubmit={onCreateWorkspace}>
      {/* Input box to type workspace name */}
      <input
        type="text"
        placeholder="New workspace name"
        value={workspaceName}
        onChange={(event) => onWorkspaceNameChange(event.target.value)}
        required
      />

      {/* Create workspace button */}
      <button type="submit">Create Workspace</button>
    </form>
  );
};

export default CreateWorkspaceButton;
