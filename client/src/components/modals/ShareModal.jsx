import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Share modal UI
 *
 * Responsibilities:
 * Invite collaborator
 * Assign VIEWER / EDITOR
 * Update permission
 * Remove access
 *
 * @params
 * - pageId: current open page
 * - isOpen: whether the Share modal is being opened by user
 * - onClose: function from Editor that opens/closes the Share modal
 */
const ShareModal = ({ pageId, isOpen, onClose }) => {
  // React state for permissions in this page
  const [permissions, setPermissions] = useState([]);
  // React state for user email
  const [email, setEmail] = useState("");
  // React state for user role
  const [role, setRole] = useState("");
  // React state for error message
  const [error, setError] = useState("");

  /**
   * Load all permissions whenever the Share modal is opened and we're on a page
   */
  useEffect(() => {
    if (isOpen && pageId) {
      const loadPermissions = async () => {
        try {
          // call GET /api/pages/:pageId/permissions
          const res = await api.get(`/pages/${pageId}/permissions`);

          // display all permissions in this page
          setPermissions(res.data.permissions);
        } catch (error) {
          setError(error.res?.data?.message || "Failed to load permissions");
        }
      };

      loadPermissions();
    }
  }, [isOpen, pageId]);

  /**
   * Create permission to a page / invite user to a page
   */
  const createPermission = async (event) => {
    // prevent browser refresh page automatically when user hits submit button
    event.preventDefault();

    try {
      // call POST /api/pages/:pageId/permissions to create permission
      const res = await api.post(`/pages/${pageId}/permissions`, {
        email,
        role,
      });

      // update all permissions including one just created
      setPermissions([...permissions, res.data.permission]);

      // reset email input box
      setEmail("");
      // reset role text box
      setRole("VIEWER");
    } catch (error) {
      setError(error.res?.data?.message || "Failed to invite user");
    }
  };

  /**
   * Update permission to a page
   */
  const updatePermission = async (permissionId, role) => {
    try {
      // call PUT /api/pages/permissions/:permissionId to update permission
      const res = await api.put(`/pages/permissions/${pageId}`, { role });

      // update all permissions React state
      setPermissions((prevPermissions) => {
        // create new list of permissions
        const newPermissions = [];
        for (const permission of prevPermissions) {
          // if this permission isn't the permission we just update, push it into the list
          if (permission._id !== permissionId) {
            newPermissions.push(permission);
          } else {
            // if it is, push in the new permission we got from backend
            newPermissions.push(res.data.permission);
          }
        }

        return newPermissions;
      });
    } catch (error) {
      setError(error.res?.data?.message || "Failed to update permission");
    }
  };

  /**
   * Remove permission to a page
   */
  const removePermission = async (permissionId) => {
    try {
      // call DELETE /api/pages/permissions/:permissionId to remove permission
      await api.delete(`/pages/permissions/${permissionId}`);

      // update all permissions React state
      setPermissions((prevPermissions) => {
        // create new list of permissions
        const newPermissions = [];
        for (const permission of prevPermissions) {
          // if this permission isn't the permission we just removed, push it into the list
          if (permission._id !== permissionId) {
            newPermissions.push(permission);
          }
        }

        return newPermissions;
      });
    } catch (error) {
      setError(error.res?.data?.message || "Failed to update permission");
    }
  };

  /**
   * If Share modal isn't opened, do nothing
   */
  if (!isOpen) {
    return null;
  }

  // return UI
  return (
    <div className="modal-overlay">
      <div className="share-modal">
        <div className="modal-header">
          <h2>Share Page</h2>
          <button onClick={onClose}>×</button>
        </div>

        {error && <p className="error">{error}</p>}

        {/* Invite user form */}
        <form onSubmit={createPermission} className="share-form">
          <input
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {/* Options to set user role */}
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </select>
          {/* Submit button */}
          <button type="submit">Invite</button>
        </form>
        {/* List of page permissions */}
        <div className="permission-list">
          {permissions.map((permission) => (
            <div key={permission._id} className="permission-card">
              <div>
                <strong>{permission.user.email}</strong>
              </div>
              {/* Option to update user permission */}
              <select
                value={permission.role}
                onChange={(event) =>
                  updatePermission(permission._id, event.target.value)
                }
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
              {/* Remove user permission */}
              <button onClick={() => removePermission(permission._id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
