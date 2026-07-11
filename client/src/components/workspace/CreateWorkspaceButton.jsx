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
        placeHolder="New workspace name"
        value={workspaceName}
        onChange={(event) => onWorkspaceNameChange(event.target.value)}
      />

      {/* Create workspace button */}
      <button type="submit">Create Workspace</button>
    </form>
  );
};

export default CreateWorkspaceButton;
