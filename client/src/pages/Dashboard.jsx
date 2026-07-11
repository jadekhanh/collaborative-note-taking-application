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
import CreateWorkspaceButton from "../components/workspace/CreateWorkspaceButton";
import UserProfileDropdown from "../components/workspace/UserProfileDropdown";
import WorkspaceCard from "../components/workspace/WorkspaceCard";
import WorkspaceMembersModal from "../components/workspace/WorkspaceMembersModal";
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
  // set selected workspace
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  // set React state for Workspace Members Modal
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

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

    // if workspace name is empty after user typing and deleting, do nothing
    if (!workspaceName.trim()) {
      return;
    }

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

      // clear input workspace name since we're done creating new one
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
   * Handle rename workspace
   */
  const handleRenameWorkspace = async (workspace) => {
    // read new workspace name from window prompt
    const newName = window.prompt("New workspace name", workspace.name);

    // if new name is empty, do nothing
    if (!newName.trim()) {
      return;
    }

    try {
      // PUT /api/workspaces/:workspaceId to change name
      const res = await api.put(`/workspaces/${workspace.id}`, {
        name: newName,
      });

      // update list of workspaces
      setWorkspaces((prevWorkspaces) => {
        // create new list of workspaces
        const newWorkspaces = [];
        for (const current of prevWorkspaces) {
          // if this workspace is the workspace whose name is changed, push the updated one we got from backend
          if (current._id === workspace._id) {
            newWorkspaces.push(res.data.workspace);
          } else {
            newWorkspaces.push(current);
          }
        }

        return newWorkspaces;
      });
    } catch (error) {
      setError(error.res?.data?.message || "Failed to rename workspace");
    }
  };

  /**
   * Handle delete workspace
   */
  const handleDeleteWorkspace = async (workspaceId) => {
    // confirm that user wants to delete workspace from window prompt
    if (
      !window.confirm(
        "Calm downnnnnnn are you sure you want to delete this workspace baby?",
      )
    ) {
      return;
    }
    try {
      // call DELETE api/workspaces/:workspaceId to delete workspace
      await api.delete(`/workspaces/${workspaceId}`);

      // update list of workspaces
      setWorkspaces((prevWorkspaces) => {
        // create new list of workspaces
        const newWorkspaces = [];
        for (const current of prevWorkspaces) {
          // if this workspace isnt' the deleted workspace, push it to the new list
          if (current._id !== workspaceId) {
            newWorkspaces.push(current);
          }
        }

        return newWorkspaces;
      });
    } catch (error) {
      setError(error.res?.data?.message || "Failed to delete workspace");
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

  /**
   * Handle when user opens the Workspace Member Modals
   */
  const handleOpenMembers = (workspace) => {
    // set the current workspace
    setSelectedWorkspace(workspace);
    // opens the modal
    setIsMembersModalOpen(true);
  };

  /**
   * Handle when the members update the workspaces
   */
  const handleWorkspaceUpdated = (updatedWorkspace) => {
    // update the workspaces list
    setWorkspaces((prevWorkspaces) =>
      prevWorkspaces.map((workspace) =>
        // replace the updated workspace with the updated one
        workspace._id === updatedWorkspace._id ? updatedWorkspace : workspace,
      ),
    );

    // set current workspace with the updated workspace
    setSelectedWorkspace(updatedWorkspace);
  };

  // return UI
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Workspaces</h1>
          <p>Welcome, {user?.username}</p>
        </div>

        <UserProfileDropdown user={user} onLogout={handleLogout} />
      </div>

      {error && <p className="error">{error}</p>}

      <CreateWorkspaceButton
        workspaceName={workspaceName}
        onWorkspaceNameChange={setWorkspaceName}
        onCreateWorkspace={handleCreateWorkspace}
      />

      <div className="workspace-grid">
        {workspaces.map((workspace) => (
          <WorkspaceCard
            key={workspace._id}
            workspace={workspace}
            onOpen={(workspaceId) => navigate(`/workspaces/${workspaceId}`)}
            onManageMembers={handleOpenMembers}
            onRename={handleRenameWorkspace}
            onDelete={handleDeleteWorkspace}
          />
        ))}
      </div>
      <WorkspaceMembersModal
        workspaceId={selectedWorkspace?._id}
        isOpen={isMembersModalOpen}
        onClose={() => {
          setIsMembersModalOpen(false);
          setSelectedWorkspace(null);
        }}
        onWorkspaceUpdated={handleWorkspaceUpdated}
      />
    </div>
  );
};

export default Dashboard;
