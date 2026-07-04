import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Create Version modal to view, create, and restore page versions
 * @params:
 * - isOpen = boolean to indicate if the modal is opened by user
 * - onClose = function to close the modal
 * - pageId = current page id
 * - onRestore = a function provided by Editor; when a version is restored, the function updates the current page and blocks on the screen
 */
const VersionModal = ({ isOpen, onClose, pageId, onRestore }) => {
  // set versions list state
  const [versions, setVersions] = useState([]);

  /**
   * Get all page versions
   */
  const getVersions = async () => {
    // call GET /api/versions/pages/:pageId to get all page versions
    const response = await api.get(`/versions/pages/${pageId}`);
    // set versions list
    setVersions(response.data.versions);
  };

  // call this function whenever the version modal is opened and page is selected
  useEffect(() => {
    if (isOpen && pageId) {
      const getVersions = async () => {
        // call GET /api/versions/pages/:pageId to get page's versions
        const res = await api.get(`/versions/pages/${pageId}`);
        // set versions list
        setVersions(res.data.versions);
      };

      getVersions();
    }
  }, [isOpen, pageId]);

  /**
   * Create a page version
   */
  const createVersion = async () => {
    // call POST /api/versions/pages/:pageId to create a page version
    await api.post(`/versions/pages/${pageId}`);
    // get all page versions
    getVersions();
  };

  /**
   * Restore a page version
   */
  const restoreVersion = async (versionId) => {
    // call POST /api/versions/:versionId/restore
    const res = await api.post(`/versions/${versionId}/restore`);
    // call onRestore to Editor to restore page and blocks
    onRestore(res.data.page, res.data.blocks);
    // close versions modal
    onClose();
  };

  // if versions modal isn't opened, render nothing
  if (!isOpen) {
    return null;
  }

  // return UI
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>Version History</h2>
          {/* close modal button */}
          <button onClick={onClose}>×</button>
        </div>

        {/* save button to save current page version */}
        <button className="save-button" onClick={createVersion}>
          Save
        </button>

        {/* display versions list */}
        <div className="version-list">
          {/* loop over each version */}
          {versions.map((version) => (
            <div key={version._id} className="version-card">
              <p>
                {/* display version's page title */}
                <strong>{version.snapshot.title}</strong>
              </p>
              <p>
                {/* display user who saves this version */}
                Saved by {version.createdBy?.username || "Unknown"} on{" "}
                {/* display the saved date */}
                {new Date(version.createdAt).toLocaleString()}
              </p>
              {/* a button to restore this page version */}
              <button onClick={() => restoreVersion(version._id)}>
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VersionModal;
