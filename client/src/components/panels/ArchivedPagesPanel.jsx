import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Archived pages panel
 * Usage: load archive pages, restore archive page
 * @param: workspaceId - current workspace
 * @param: canEdit - boolean whether this user is Workspace EDITOR or OWNER
 * @param: isOpen - boolean whether the panel is currently opened by user
 * @param: onClose - function from Workspace that closes/opens the panel
 * @param: onPageRestored - function from Workspace to restore an archived page
 */
const ArchivedPagesPanel = ({
  workspaceId,
  canEdit,
  isOpen,
  onClose,
  onPageRestored,
}) => {
  // set React states for all archived pages
  const [archivedPages, setArchivedPages] = useState([]);
  // set React state for error message
  const [error, setError] = useState("");

  /**
   * Load all archived pages whenever the panel is opened and workspace is rerendered
   */
  useEffect(() => {
    // if panel is close or workspace isn't load, do nothing
    if (!isOpen || !workspaceId) {
      return;
    }

    const getArchivedPages = async () => {
      try {
        // reset error message
        setError("");

        // call GET /api/pages/workspaces/:workspaceId/archived
        const res = await api.get(`/pages/workspaces/${workspaceId}/archived`);

        // display archived pages
        setArchivedPages(res.data.pages);
      } catch (error) {
        setError(
          error.response?.data?.message || "Failed to load archived pages",
        );
      }
    };
    getArchivedPages();
  }, [isOpen, workspaceId]);

  /**
   * Restore an archived page
   */
  const restorePage = async (pageId) => {
    // if this user is not workspace editor or owner, do nothing
    if (!canEdit) {
      return;
    }

    try {
      // reset error message
      setError("");

      // call PATCH /api/pages/:pageId/restore
      const res = await api.patch(`/pages/${pageId}/restore`);

      // update the archived pages React state
      setArchivedPages((prevPages) => {
        const newPages = [];
        for (const page of prevPages) {
          // if this page is not the page we just restored, add to the list
          if (page._id !== pageId) {
            newPages.push(page);
          }
        }
        return newPages;
      });

      // call Workspace to restore page
      onPageRestored(res.data.page);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to restore page");
    }
  };

  /**
   * If panel isn't opened or this user isn't workspace owner or editor, do nothing
   */
  if (!isOpen || !canEdit) {
    return null;
  }

  // return UI
  return (
    <aside className="archived-pages-panel">
      <div className="panel-header">
        <h2>Archived Pages</h2>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {archivedPages.length === 0 ? (
        <p>No archived pages</p>
      ) : (
        <div className="archived-pages-list">
          {archivedPages.map((page) => (
            <div key={page._id} className="archived-page-card">
              <div>
                <strong>{page.title}</strong>
                <p>{new Date(page.updatedAt).toLocaleString()}</p>
              </div>

              <button type="button" onClick={() => restorePage(page._id)}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};

export default ArchivedPagesPanel;
