import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Create Version modal to view, create, and restore page versions
 * @params:
 * - isOpen = boolean to indicate if the modal is opened by user
 * - onClose = function to close the modal
 * - pageId = current page id
 * - currentPage = current page data (used to compare diff version)
 * - currentBlocks = current page blocks data (used to compare diff version)
 * - onRestore = a function provided by Editor; when a version is restored, the function updates the current page and blocks on the screen
 */
const VersionModal = ({
  isOpen,
  onClose,
  pageId,
  currentPage,
  currentBlocks = [],
  onRestore,
}) => {
  // versions list state
  const [versions, setVersions] = useState([]);
  // version currently selected for diff preview
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  // error message
  const [error, setError] = useState("");

  /**
   * Get all page versions
   */
  const getVersions = async () => {
    try {
      // call GET /api/versions/pages/:pageId to get all page versions
      const response = await api.get(`/versions/pages/${pageId}`);
      // set versions list
      setVersions(response.data.versions);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to load all page versions",
      );
    }
  };

  // call this function whenever the version modal is opened and page is selected
  useEffect(() => {
    if (!isOpen || !pageId) {
      return;
    }

    const loadVersions = async () => {
      try {
        // reset error message
        setError("");

        // reset selected version
        setSelectedVersionId(null);

        // call GET /api/versions/pages/:pageId to load versions
        const response = await api.get(`/versions/pages/${pageId}`);

        // load all versions
        setVersions(response.data.versions);
      } catch (error) {
        setError(
          error.response?.data?.message || "Failed to load page versions",
        );
      }
    };

    loadVersions();
  }, [isOpen, pageId]);

  /**
   * Create a page version
   */
  const createVersion = async () => {
    try {
      // call POST /api/versions/pages/:pageId to create a page version
      await api.post(`/versions/pages/${pageId}`);
      // get all page versions
      getVersions();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to create page version",
      );
    }
  };

  /**
   * Restore a page version
   */
  const restoreVersion = async (versionId) => {
    try {
      // call POST /api/versions/:versionId/restore
      const res = await api.post(`/versions/${versionId}/restore`);
      // call onRestore to Editor to restore page and blocks
      onRestore(res.data.page, res.data.blocks);
      // close versions modal
      onClose();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to restore page version",
      );
    }
  };

  /**
   * Compare a saved version again the current page
   * Returns a summary that the modal can display before restoring
   *
   * @return
   * {
   * titleChanged: true/false
   * addBlocks: [...],
   * removedBlocks: [...],
   * editedBlocks: [...],
   * typeChangedBlocks: [...]
   * }
   */
  const compareVersionDiff = (version, currentPage, currentBlocks = []) => {
    // get page snapshot stored in saved version
    const versionPage = version.snapshot || {};

    // get blocks stored in saved version
    const versionBlocks = version.snapshot?.blocks || [];

    // an object that stores every diff
    const diff = {
      // whether the title changed
      titleChanged: versionPage.title !== currentPage?.title,

      // title stored in saved version
      oldTitle: versionPage.title,

      // current title
      newTitle: currentPage?.title,

      // newly added blocks that do not exist in saved version
      addedBlocks: [],

      // removed blocks that only exist in saved version
      removedBlocks: [],

      // blocks that exist in both but edited
      editedBlocks: [],

      // blocks whose type changed
      typeChangedBlocks: [],
    };

    // create a lookup table
    // instead of searching every block repeatedly, we store each block by ID for fast lookups
    const currentBlockById = {};
    const versionBlockById = {};

    // store every current block using its ID
    for (const block of currentBlocks) {
      currentBlockById[block._id] = block;
    }

    // store every version block using its ID
    for (const versionBlock of versionBlocks) {
      versionBlockById[versionBlock.blockId] = versionBlock;
    }

    // compare every block of saved version against current block
    for (const block of currentBlocks) {
      // find the matching block inside the saved version
      const versionBlock = versionBlockById[block._id];

      // if no matching block exists, this block is created after the saved version
      if (!versionBlock) {
        diff.addedBlocks.push(block);
        continue;
      }

      // compare both versions' content
      const oldContent = JSON.stringify(versionBlock.content || {});
      const newContent = JSON.stringify(block.content || {});
      if (oldContent !== newContent) {
        diff.editedBlocks.push({
          blockId: block._id,
          oldContent: versionBlock.content || {},
          newContent: block.content || {},
          oldText: versionBlock.content?.text || "",
          newText: block.content?.text || "",
        });
      }

      // compare both version's block type
      if (versionBlock.type !== block.type) {
        diff.typeChangedBlocks.push({
          // which block changed
          blockId: block._id,

          // previous block type
          oldType: versionBlock.type,

          // new block type,
          newType: block.type,
        });
      }
    }

    // get removed blocks that only exist in saved version
    for (const versionBlock of versionBlocks) {
      if (!currentBlockById[versionBlock.blockId]) {
        diff.removedBlocks.push(versionBlock);
      }
    }

    return diff;
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

        {error && <p className="error">{error}</p>}

        {/* save button to save current page version */}
        <button className="save-button" onClick={createVersion}>
          Save
        </button>

        {/* display versions list */}
        <div className="version-list">
          {/* loop over each version */}
          {versions.map((version) => {
            const isSelected = selectedVersionId === version._id;

            const diff = isSelected
              ? compareVersionDiff(version, currentPage, currentBlocks)
              : null;

            return (
              <div key={version._id} className="version-card">
                <div className="version-card-header">
                  <div>
                    <span>
                      {version.source === "AUTO" ? "Automatic" : "Manual"}
                    </span>
                    <strong>
                      {new Date(version.createdAt).toLocaleString()}
                    </strong>

                    <p>Saved by {version.createdBy?.username || "Unknown"}</p>
                  </div>

                  <div className="version-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVersionId(isSelected ? null : version._id)
                      }
                    >
                      {isSelected ? "Hide Changes" : "View Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={() => restoreVersion(version._id)}
                    >
                      Restore
                    </button>
                  </div>
                </div>

                {isSelected && (
                  <div className="version-diff">
                    {diff.titleChanged && (
                      <div className="version-diff-item">
                        <strong>Title changed</strong>
                        <p>Before: {diff.oldTitle}</p>
                        <p>Current: {diff.newTitle}</p>
                      </div>
                    )}

                    <p>
                      Blocks added since this version: {diff.addedBlocks.length}
                    </p>

                    <p>
                      Blocks removed since this version:{" "}
                      {diff.removedBlocks.length}
                    </p>

                    <p>
                      Blocks edited since this version:{" "}
                      {diff.editedBlocks.length}
                    </p>

                    <p>Block types changed: {diff.typeChangedBlocks.length}</p>

                    {diff.editedBlocks.map((change) => (
                      <div key={change.blockId} className="version-text-change">
                        <strong>Edited block</strong>

                        <p>Before: {change.oldText || "(empty)"}</p>

                        <p>Current: {change.newText || "(empty)"}</p>
                      </div>
                    ))}

                    {!diff.titleChanged &&
                      diff.addedBlocks.length === 0 &&
                      diff.removedBlocks.length === 0 &&
                      diff.editedBlocks.length === 0 &&
                      diff.typeChangedBlocks.length === 0 && (
                        <p>No differences from the current page.</p>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VersionModal;
