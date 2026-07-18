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
import api from "../api/axios";
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
  // pages shared directly with the current user
  const [sharedPages, setSharedPages] = useState([]);

  /**
   * Get all workspaces request
   */
  const getWorkspaces = async () => {
    try {
      setError("");

      // get workspaces by calling GET /api/workspaces
      const res = await api.get("/workspaces");

      // set workspaces
      setWorkspaces(res.data.workspaces);
    } catch (error) {
      // set error message
      // try to read res, data, message. if any part doesn't exist, ouput "Failed to load workspaces"
      setError(error.response?.data?.message || "Failed to load workspaces");
    }
  };

  /**
   * Get all pages shared directly with current user
   */
  const getSharedPages = async () => {
    try {
      const res = await api.get("/pages/shared-with-me");

      setSharedPages(res.data.sharedPages || []);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load shared pages");
    }
  };

  // useEffect() = run the following code (getWorkspaces()) whenever the component loads or when specified dependencies change
  useEffect(() => {
    const loadDashboard = async () => {
      // inside Dashboard, load all workspaces and pages shared with current user
      await Promise.all([getWorkspaces(), getSharedPages()]);
    };

    loadDashboard();
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
      setError("");

      // create workspace by calling POST /api/workspaces
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
      const res = await api.post("/workspaces", { name: workspaceName });

      // clear input workspace name since we're done creating new one
      setWorkspaceName("");
      // set current list of workspaces in which the latest createst workspace is at the top
      setWorkspaces((prevWorkspaces) => [
        res.data.workspace,
        ...prevWorkspaces,
      ]);
    } catch (error) {
      // set error message
      // try to read res, data, message. if any part doesn't exist, ouput "Failed to create a workspace"
      setError(error.response?.data?.message || "Failed to create a workspace");
    }
  };

  /**
   * Handle rename workspace
   */
  const handleRenameWorkspace = async (workspace) => {
    // read new workspace name from window prompt
    const newName = window.prompt("New workspace name", workspace.name);

    // if new name is empty, do nothing
    if (!newName?.trim()) {
      return;
    }

    try {
      setError("");

      // PUT /api/workspaces/:workspaceId to change name
      const res = await api.put(`/workspaces/${workspace._id}`, {
        name: newName.trim(),
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
      setError(error.response?.data?.message || "Failed to rename workspace");
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
      setError("");

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
      setError(error.response?.data?.message || "Failed to delete workspace");
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

  // seperate owned and shared workspaces
  const currentUserId = user?._id || user?.id;
  const ownedWorkspaces = workspaces.filter((workspace) => {
    const ownerId = workspace.owner?._id || workspace.owner;
    return ownerId?.toString() === currentUserId?.toString();
  });
  const sharedWorkspaces = workspaces.filter((workspace) => {
    const ownerId = workspace.owner?._id || workspace.owner;
    return ownerId?.toString() !== currentUserId?.toString();
  });

  // find user's role inside the workspace
  const getCurrentUserWorkspaceRole = (workspace) => {
    const member = workspace.members?.find((member) => {
      const memberId = member.user?._id || member.user;

      return memberId?.toString() === currentUserId?.toString();
    });

    return member?.role || null;
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

      <section className="dashboard-section">
        <h2>My workspaces</h2>

        {ownedWorkspaces.length === 0 ? (
          <p>You do not own any workspaces yet.</p>
        ) : (
          <div className="workspace-grid">
            {ownedWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace._id}
                workspace={workspace}
                isOwner={true}
                onOpen={(workspaceId) => navigate(`/workspaces/${workspaceId}`)}
                onManageMembers={handleOpenMembers}
                onRename={handleRenameWorkspace}
                onDelete={handleDeleteWorkspace}
              />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Shared workspaces</h2>

        {sharedWorkspaces.length === 0 ? (
          <p>No workspaces have been shared with you.</p>
        ) : (
          <div className="workspace-grid">
            {sharedWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace._id}
                workspace={workspace}
                isOwner={false}
                currentRole={getCurrentUserWorkspaceRole(workspace)}
                onOpen={(workspaceId) => navigate(`/workspaces/${workspaceId}`)}
                onManageMembers={handleOpenMembers}
                onRename={handleRenameWorkspace}
                onDelete={handleDeleteWorkspace}
              />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Shared pages</h2>

        {sharedPages.length === 0 ? (
          <p>No pages have been shared with you.</p>
        ) : (
          <div className="shared-page-grid">
            {sharedPages.map(({ page, accessRole }) => (
              <button
                key={page._id}
                type="button"
                className="shared-page-card"
                onClick={() => navigate(`/pages/${page._id}`)}
              >
                <div>
                  <strong>
                    {page.icon || "📄"} {page.title || "Untitled"}
                  </strong>

                  <p>{page.owner?.username || "Unknown owner"}</p>

                  <p>{page.workspace?.name || "Unknown workspace"}</p>
                </div>

                <span>{accessRole}</span>
              </button>
            ))}
          </div>
        )}
      </section>
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
