import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Share modal UI
 *
 * Responsibilities:
 * Invite collaborator by email
 * Assign VIEWER / EDITOR
 * Update existing page permission
 * Remove page access
 *
 * @params
 * - pageId: currently opened page
 * - isOpen: whether the Share modal is open
 * - permissions: permission inside current page
 * - onPermissionsChanged: function from Editor to update permissions to the page
 * - onPermissionsUpdated: function from Editor to broadcast permissions list to other collaborators through Socket.IO
 * - onUserAccessUpdated: function from Editor to broadcast this user's new access role
 * - onClose: function from Editor that closes the Share modal
 */
const ShareModal = ({
  pageId,
  isOpen,
  permissions = [],
  onPermissionsChanged,
  onPermissionsUpdated,
  onUserAccessUpdated,
  onClose,
}) => {
  // email of the user receiving page access
  const [email, setEmail] = useState("");
  // role of the user receiving page access, default to VIEWER
  const [role, setRole] = useState("VIEWER");
  // request error shown inside modal
  const [error, setError] = useState("");

  /**
   * Update Editor's permission state and broadcast local changes
   */
  const updatePermissions = (permissions) => {
    // notify Editor that permissions are changed and update this modal's permission prop
    if (onPermissionsChanged) {
      onPermissionsChanged(permissions);
    }

    // broadcast permissions list to other collaborators through Socket.IO
    if (onPermissionsUpdated) {
      onPermissionsUpdated(permissions);
    }
  };

  /**
   * Load all permissions whenever the Share modal is opened and we're on a page
   */
  useEffect(() => {
    // if Share modal isn't open or page isn't loaded
    if (!isOpen || !pageId) {
      return;
    }

    // load permissions list
    const loadPermissions = async () => {
      try {
        // reset error message
        setError("");

        // call GET /api/pages/:pageId/permissions to load this page's permissions list
        const res = await api.get(`/pages/${pageId}/permissions`);

        // notify Editor that permissions are loaded
        if (onPermissionsChanged) {
          onPermissionsChanged(res.data.permissions);
        }
      } catch (error) {
        setError(error.response?.data?.message || "Failed to load permissions");
      }
    };

    loadPermissions();
  }, [isOpen, pageId, onPermissionsChanged]);

  /**
   * Create permission to a page / invite user to a page
   */
  const createPermission = async (event) => {
    // prevent browser refresh page automatically when user hits submit button
    event.preventDefault();

    // if email input is empty, do nothing
    if (!email.trim()) {
      return;
    }

    try {
      // reset error message
      setError("");

      // call POST /api/pages/:pageId/permissions to create permission
      const res = await api.post(`/pages/${pageId}/permissions`, {
        email,
        role,
      });

      // check if this permission is updated or brand new
      let permissionWasReplaced = false;

      // update all permissions including one just updated/created
      const updatedPermissions = [];
      for (const permission of permissions) {
        if (permission._id === res.data.permission._id) {
          updatedPermissions.push(res.data.permission);
          permissionWasReplaced = true;
        } else {
          updatedPermissions.push(permission);
        }
      }
      // push the new permission if it's brand new
      if (!permissionWasReplaced) {
        updatedPermissions.push(res.data.permission);
      }
      updatePermissions(updatedPermissions);

      // tell the affected collaborator that their access changed so their editor can immediately update its access role
      if (onUserAccessUpdated) {
        onUserAccessUpdated({
          userId: res.data.permission.user._id,
          accessRole: res.data.permission.role,
        });
      }

      // reset email input box
      setEmail("");
      // reset role text box
      setRole("VIEWER");
    } catch (error) {
      setError(error.res?.data?.message || "Failed to invite user");
    }
  };

  /**
   * Update a collaborator's permission to a page (between VIEWER and EDITOR)
   */
  const updatePermission = async (permissionId, role) => {
    try {
      // reset error message
      setError("");

      // call PUT /api/pages/:pageId/permissions/:permissionId to update permission
      const res = await api.put(
        `/pages/${pageId}/permissions/${permissionId}`,
        {
          role,
        },
      );

      // update all permissions list and broadcast the new permissions list
      const updatedPermissions = [];
      for (const permission of permissions) {
        if (permission._id === permissionId) {
          updatedPermissions.push(res.data.permission);
        } else {
          updatedPermissions.push(permission);
        }
      }
      updatePermission(updatedPermissions);

      // immediately update the affected user's open editor role
      if (onUserAccessUpdated) {
        onUserAccessUpdated({
          userId: res.data.permission.user._id,
          accessRole: res.data.permission.role,
        });
      }
    } catch (error) {
      setError(error.res?.data?.message || "Failed to update permission");
    }
  };

  /**
   * Remove permission to a page
   */
  const removePermission = async (permissionId) => {
    // get the permission
    const removedPermission = permissions.find(
      (permission) => permission._id === permissionId,
    );
    if (!removedPermission) {
      return;
    }

    // confirm with user that they want to remove access to this user
    if (
      !window.confirm(
        "I be like holw up wait a minute girl, are you sure you want to remove this user's access to the page?",
      )
    ) {
      return;
    }

    try {
      // reset error message
      setError("");

      // call DELETE /api/pages/:pageId/permissions/:permissionId to remove permission
      await api.delete(`/pages/${pageId}/permissions/${permissionId}`);

      // update permissions list
      const updatedPermissions = [];
      for (const permission of permissions) {
        if (permission._id !== permissionId) {
          updatedPermissions.push(permission);
        }
      }
      updatePermissions(updatedPermissions);

      // update the affected user's access role to their editor
      if (onUserAccessUpdated && removedPermission) {
        onUserAccessUpdated({
          userId: removedPermission.user._id,
          accessRole: null,
        });
      }
    } catch (error) {
      setError(error.res?.data?.message || "Failed to remove permission");
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

          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
          >
            ×
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {/* Invite a registered user by email and assign their role */}
        <form onSubmit={createPermission} className="share-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </select>

          <button type="submit">Invite</button>
        </form>

        {/* Display and manage every page-specific permission */}
        <div className="permission-list">
          {permissions.map((permission) => (
            <div key={permission._id} className="permission-card">
              <div>
                <strong>
                  {permission.user?.username ||
                    permission.user?.email ||
                    "Unknown user"}
                </strong>

                {permission.user?.username && <p>{permission.user?.email}</p>}
              </div>

              {/* Change the collaborator between Viewer and Editor */}
              <select
                value={permission.role}
                onChange={(event) =>
                  updatePermission(permission._id, event.target.value)
                }
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>

              {/* Remove this user's page-specific access */}
              <button
                type="button"
                onClick={() => removePermission(permission._id)}
              >
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
