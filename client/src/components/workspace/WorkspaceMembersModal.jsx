import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
/**
 * Workspace Members Modal
 * Supports:
 * Display workspace members
 * Add a member by email
 * Choose VIEWER or EDITOR
 * Show each member's current profile
 *
 * @params
 * - workspaceId = workspace that the modal locates in
 * - isOpen = boolean to check if the modal is opened by user
 * - onClose = function from Dashboard to close the modal
 * - onWorkspaceUpdated = function from Workspace to update the workspace
 */
const WorkspaceMembersModal = ({
  workspaceId,
  isOpen,
  onClose,
  onWorkspaceUpdated,
}) => {
  // get user
  const { user } = useAuth();
  // set React state of workspace
  const [workspace, setWorkspace] = useState(null);
  // set React state of email
  const [email, setEmail] = useState("");
  // set React state of role
  const [role, setRole] = useState("VIEWER");
  // set React state of error message
  const [error, setError] = useState("");

  // check if current user is the owner of the workspace
  const currentUserId = user?._id || user?.id;
  const workspaceOwnerId = workspace?.owner?._id || workspace?.owner;
  const isOwner =
    Boolean(currentUserId && workspaceOwnerId) &&
    currentUserId.toString() === workspaceOwnerId.toString();

  /**
   * Load the latest workspace and members list whenever the modal opens
   */
  useEffect(() => {
    if (!isOpen || !workspaceId) {
      return;
    }

    const loadWorkspace = async () => {
      try {
        setError("");

        // call GET api/workspaces/:workspaceId
        const res = await api.get(`/workspaces/${workspaceId}`);

        // set React state for workspace
        setWorkspace(res.data.workspace);
      } catch (error) {
        setError(
          error.response?.data?.message || "Failed to load workspace members",
        );
      }
    };
    loadWorkspace();
  }, [isOpen, workspaceId]);

  /**
   * Add a registered user to workspace via email
   */
  const addMember = async (event) => {
    // prevent browser to refresh browser after hit submit event
    event.preventDefault();

    // if this user is not workspace owner, do nothing
    if (!isOwner) {
      return;
    }

    // if email input is empty, do nothing
    if (!email.trim()) {
      return;
    }

    try {
      setError("");

      // call POST api/workspaces/:workspaceId/members to add member
      const res = await api.post(`/workspaces/${workspaceId}/members`, {
        email: email.trim(),
        role,
      });

      // set React state of new workspace
      setWorkspace(res.data.workspace);

      // notify Workspace so its workspace state can also reflect the new member count and member list
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(res.data.workspace);
      }

      // reset email and role fields
      setEmail("");
      setRole("VIEWER");
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to add member to workspace",
      );
    }
  };

  /**
   * Update workspace member role
   */
  const updateMemberRole = async (memberId, newRole) => {
    // if this user is not workspace owner, do nothing
    if (!isOwner) {
      return;
    }

    try {
      setError("");

      // call PATCH api/workspaces/:workspaceId/members/:memberId/role
      const res = await api.patch(
        `/workspaces/${workspaceId}/members/${memberId}/role`,
        {
          role: newRole,
        },
      );

      // set current workspace
      setWorkspace(res.data.workspace);

      // call Dashboard that workspace member changes
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(res.data.workspace);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to update workspace member role",
      );
    }
  };

  /**
   * Remove workspace member
   */
  const removeMember = async (memberId) => {
    // if this user is not workspace owner, do nothing
    if (!isOwner) {
      return;
    }

    // confirm if user wants to remove member
    if (!window.confirm("Oooooohhhh remove this member from workspace?")) {
      return;
    }
    try {
      setError("");

      // call DELETE /api/workspaces/:workspaceId/members/:memberId
      const res = await api.delete(
        `/workspaces/${workspaceId}/members/${memberId}`,
      );

      // set current workspace
      setWorkspace(res.data.workspace);

      // call Dashboard that workspace member changes
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(res.data.workspace);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to remove member from workspace",
      );
    }
  };

  // if modal isn't opened, do nothing
  if (!isOpen) {
    return null;
  }

  // return UI
  return (
    <div className="modal-backdrop">
      <div className="modal workspace-members-modal">
        <div className="modal-header">
          <h2>Workspace Members</h2>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {/* Only the workspace owner may invite new members. */}
        {isOwner && (
          <form className="workspace-member-form" onSubmit={addMember}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Member email"
              required
            />

            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>

            <button type="submit">Add Member</button>
          </form>
        )}

        <div className="workspace-member-list">
          {workspace?.members?.map((member) => {
            const memberId = member.user?._id || member.user;

            const isWorkspaceOwner =
              memberId?.toString() ===
              (workspace.owner?._id || workspace.owner)?.toString();

            return (
              <div key={memberId?.toString()} className="workspace-member-card">
                <div>
                  <strong>{member.user?.username || "Unknown user"}</strong>

                  <p>{member.user?.email || ""}</p>
                </div>

                <div className="workspace-member-actions">
                  {isWorkspaceOwner ? (
                    <span className="member-role">OWNER</span>
                  ) : isOwner ? (
                    <>
                      {/* Owner may change non-owner members' roles. */}
                      <select
                        value={member.role}
                        onChange={(event) =>
                          updateMemberRole(memberId, event.target.value)
                        }
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                      </select>

                      {/* Owner may remove non-owner members. */}
                      <button
                        type="button"
                        onClick={() => removeMember(memberId)}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="member-role">{member.role}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceMembersModal;
