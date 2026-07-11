import { useNavigate } from "react-router-dom";

/**
 * Workspace Switcher = a small panel at the top of the app the tells which workspace we're currently in and lets us switch to another one
 * Clicking "Switch" take us back to Dashboard where we can choose another workspace
 */
const WorkspaceSwitcher = ({ workspace }) => {
  // React Router's Navigation hook allows the component to move to another page without reloading the website
  const navigate = useNavigate();

  // return UI
  return (
    <div className="workspace-switcher">
      <div>
        <strong>{workspace?.name || "Workspace"}</strong>
        <p>{workspace?.members?.length || 0} member(s)</p>
      </div>

      {/* Click on Switch button to go back to Dashboard */}
      <button type="button" onClick={() => navigate("/dashboard")}>
        Switch
      </button>
    </div>
  );
};

export default WorkspaceSwitcher;
