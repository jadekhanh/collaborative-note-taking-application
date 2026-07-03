/**
 * Flow:
 * User types email and password
 * React stores what they type
 * User clicks login button
 * Axios POST /auth/login
 * Express
 * MongoDB
 * JWT + User returned
 * AuthContext saves user
 * React navigate to Dashboard
 * Dashboard UI is rendered
 */

import { useEffect, useState } from "react";
// useNavigate = automatically moves to a new link after login succeeds instead of user clicking the new link to move forward
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";

/**
 * React component = a function that returns UI
 * This is Dashboard page
 */
const Dashboard = () => {
  // create a navigation that later changes page after login
  const navigate = useNavigate();

  // get user and logout from AuthContext
  const { user, logout } = useAuth();

  // set list of workspaces
  // [] at first
  const [workspaces, setWorkspaces] = useState([]);
  // set workspace name
  // "" at first
  const [workspaceName, setWorkspaceName] = useState("");
  // set error
  // "" at first
  const [error, setError] = useState("");

  /**
   * Get all workspaces request
   */
  const getWorkspaces = async () => {
    try {
      // get workspaces by calling GET /api/auth/workspaces
      const res = await api.get("/auth/workspaces");

      // set workspaces
      setWorkspaces(res.data.workspaces);
    } catch (error) {
      // set error message
      // try to read res, data, message. if any part doesn't exist, ouput "Failed to load workspaces"
      setError(error.res?.data?.message || "Failed to load workspaces");
    }
  };

  // useEffect() = run the following code (getWorkspaces()) whenever the component loads or when specified dependencies change
  useEffect(() => {
    const loadWorkspaces = async () => {
      await getWorkspaces();
    };

    loadWorkspaces();
  }, []);

  /**
   * Handle create a workspace request
   */
  const handleCreateWorkspace = async (event) => {
    // prevent HTML forms to reload the page automatically
    event.preventDefault();

    try {
      // create workspace by calling POST /api/auth/workspaces
      // workspaceName is passed from onChange={(event) => setWorkspaceName(event.target.value)}
      /**
       * Flow:
       * User type <input>
       * onChange fires
       * event.target.value
       * setWorkspacName(...)
       * React State updates
       * workspaceName variable changes
       * User clicks Create
       * handleCreateWorkspace() is called
       * Reads workspaceName
       * POST /workspaces
       */
      const res = await api.post("/auth/workspaces", { name: workspaceName });

      // clear input workspace name since we're done create new one
      setWorkspaceName("");
      // set current list of workspaces in which the latest createst workspace is at the top
      setWorkspaces([res.data.workspace, ...workspaces]);
    } catch (error) {
      // set error message
      // try to read res, data, message. if any part doesn't exist, ouput "Failed to create a workspace"
      setError(error.res?.data?.message || "Failed to create a workspace");
    }
  };

  /**
   * Handle logout request
   */
  const handleLogout = () => {
    // call logout from AuthContext
    logout();

    // navigate to login page once logout succeeds
    navigate("/login");
  };

  // return UI
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          {/* heading 1: Workspaces */}
          <h1>Workspaces</h1>
          {/* Welcome heading */}
          <p> Welcome, {user.username} </p>
        </div>
        {/* Logout button */}
        <button onClick={handleLogout}>Logout</button>
      </div>
      {error && <p className="error">{error}</p>}
      {/* Create Workspace form */}
      <form className="workspace-form" onSubmit={handleCreateWorkspace}>
        <input
          type="text"
          placeHolder="New workspace name" // faint hint text displayed inside the box before user types in
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
        />
        {/* Create Workspace button */}
        <button type="submit">Create Workspace</button>
      </form>
      <div className="workspace-grid">
        {/* output the list of workspaces
        each workspace displays a button that navigates to the workspace page, the h2 header with workspace name and how many members inside the workspace */}
        {workspaces.map((workspace) => (
          <button
            key={workspace._id}
            className="workspace-card"
            // on click on button with workspace id navigates to the page of that workspace
            onClick={() => navigate(`/workspaces/${workspace._id}`)}
          >
            <h2>{workspace.name}</h2>
            <p>{workspace.members?.length || 0} member(s)</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
