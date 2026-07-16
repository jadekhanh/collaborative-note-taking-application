/**
 * Flow:
 * Dashboard
 * User clicks Workspace
 * Url changes
 * Workspace.jsx loads
 * Load workspace info
 * Load pages
 * Show sidebar
 * Show editor
 */

import { useEffect, useState } from "react";
// useNavigate = automatically moves to a new link after login succeeds instead of user clicking the new link to move forward
import { useParams } from "react-router-dom";
import { api } from "../api/axios";
import Editor from "../components/editor/Editor";
import SearchModal from "../components/modals/SearchModal";
import ArchivedPagesPanel from "../components/panels/ArchivedPagesPanel";
import Sidebar from "../components/sidebar/Sidebar";
import { useAuth } from "../context/AuthContext";

/**
 * React component = a function that returns UI
 * This is Workspace page
 */
const Workspace = () => {
  // Current user
  const { user } = useAuth();

  // Extract workspaceId from the URL
  const { workspaceId } = useParams();

  // Current workspace information
  const [workspace, setWorkspace] = useState(null);

  // All non-archived pages inside the workspace
  const [pages, setPages] = useState([]);

  // ID of the page currently opened in Editor
  const [selectedPageId, setSelectedPageId] = useState(null);

  // Error displayed when a request fails
  const [error, setError] = useState("");

  // Controls whether the search modal is open
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Controls whether the archived-pages panel is open
  const [isArchivedPagesOpen, setIsArchivedPagesOpen] = useState(false);

  // Get the current authenticated user's ID
  const currentUserId = user?._id || user?.id;
  // Find the current user's membership inside this workspace
  const currentMember = workspace?.members?.find((member) => {
    const memberUserId = member.user?._id || member.user;
    return memberUserId?.toString() === currentUserId?.toString();
  });
  // Boolean whether this user has editor access (is workspace OWNER or EDITOR)
  const canEditWorkspace =
    currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  // useEffect() = run the following code whenever the component loads or when specified dependencies change
  useEffect(() => {
    // load the workspace and its pages whenever workspaceId changes
    const loadWorkspace = async () => {
      try {
        // get workspace from calling GET /api/workspaces/:workspaceId
        const workspaceResponse = await api.get(`/workspaces/${workspaceId}`);
        // set workspace from res
        setWorkspace(workspaceResponse.data.workspace);

        // get pages from calling GET/api/pages/workspaces/:workspaceId/
        const pagesResponse = await api.get(`/pages/workspaces/${workspaceId}`);

        // set pages from res
        setPages(pagesResponse.data.pages);

        // if there are pages, automatically opens the 1st page
        if (pagesResponse.data.pages.length > 0) {
          setSelectedPageId(pagesResponse.data.pages[0]._id);
        } else {
          setSelectedPageId(null);
        }
      } catch (error) {
        setError(error.response?.data?.message || "Failed to load workspace");
      }
    };

    loadWorkspace();
  }, [workspaceId]);

  /**
   * Handle create a page
   * Create either:
   * - a top-level page when parentPage = null
   * - a nested child page when parentPage is a pageId
   */
  const handleCreatePage = async (parentPage = null) => {
    // if this user is workspace viewer only, do nothing
    if (!canEditWorkspace) {
      return;
    }

    try {
      // reset error message
      setError("");

      // create page by calling POST /api/pages/
      const res = await api.post("/pages", {
        title: "Untitled",
        workspaceId,
        parentPage,
      });

      // set list of pages where the newly created page appear last
      setPages((prevPages) => [...prevPages, res.data.page]);
      // open the newly created page
      setSelectedPageId(res.data.page._id);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create page");
    }
  };

  /**
   * Handle restore page
   */
  const handlePageRestored = (restoredPage) => {
    // set lits of pages inside the workspace
    setPages((prevPages) => {
      // prevent accidentally adding the same page twice
      const alreadyExists = prevPages.some(
        (page) => page._id === restoredPage._id,
      );

      if (alreadyExists) {
        return prevPages;
      }

      return [...prevPages, restoredPage];
    });

    // open the restored page
    setSelectedPageId(restoredPage._id);
  };

  /**
   * Handle archive page
   */
  const handlePageArchived = (pageId) => {
    setPages((prevPages) => {
      // create new pages list
      const remainingPages = [];

      // only push non-archived pages
      for (const page of prevPages) {
        if (page._id !== pageId) {
          remainingPages.push(page);
        }
      }

      // if the archived page is the page that is displayed on editor
      if (selectedPageId === pageId) {
        // display the 1st page in the remaining pages list
        setSelectedPageId(remainingPages[0]?._id || null);
      }

      return remainingPages;
    });
  };

  /**
   * Handle update a page
   * When a page is updated, the sidebar is updated to push the newly updated page on top
   */
  const handleUpdatePage = (updatedPage) => {
    setPages((prevPages) => {
      // create new pages list
      const newPages = [];

      for (const page of prevPages) {
        // replace the old page with the new updated page
        if (page._id === updatedPage._id) {
          newPages.push(updatedPage);
        }
        // push the rest
        else {
          newPages.push(page);
        }
      }

      return newPages;
    });
  };

  /**
   * Handle delete a page
   * When a page is deleted, the sidebar is updated to remove the deleted page from the list
   */
  const handleDeletePage = (deletedPageId) => {
    setPages((prevPages) => {
      // create new pages list
      const newPages = [];

      // only push the pages that is not deleted
      for (const page of prevPages) {
        if (page._id !== deletedPageId) {
          newPages.push(page);
        }
      }

      // if the page deleted is the page being displayed in editor, display the 1st page in the remaining pages list
      if (selectedPageId === deletedPageId) {
        setSelectedPageId(newPages[0]?._id || null);
      }

      return newPages;
    });
  };

  // return page UI
  return (
    <div className="workspace-page">
      {/* SearchModal remains owned by Workspace because selecting a search result changes selectedPageId in Workspace state */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPage={(pageId) => {
          setSelectedPageId(pageId);
        }}
      />

      {/* Open the archived-pages panel, only visible to workspace OWNER and EDITOR */}
      {canEditWorkspace && (
        <button
          type="button"
          className="floating-archive-button"
          onClick={() => setIsArchivedPagesOpen(true)}
        >
          Archived
        </button>
      )}

      {/* Display archived pages and allow restoring them */}
      <ArchivedPagesPanel
        workspaceId={workspaceId}
        isOpen={isArchivedPagesOpen}
        canEdit={canEditWorkspace} // only visible to workspace OWNER and EDITOR
        onClose={() => setIsArchivedPagesOpen(false)}
        onPageRestored={handlePageRestored}
      />

      {/*
       * Sidebar displays workspace information and the nested page tree.
       * The Search button lives inside Sidebar
       */}
      <Sidebar
        workspace={workspace}
        pages={pages}
        selectedPageId={selectedPageId}
        canEdit={canEditWorkspace}
        onSelectPage={setSelectedPageId}
        onCreatePage={handleCreatePage}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <main className="workspace-main">
        {/* Display an API error when one exists. */}
        {error && <p className="error">{error}</p>}

        {selectedPageId ? (
          /*
           * Editor owns page editing behavior, but Workspace owns
           * the page list shown in Sidebar. When a page is edited via Editor, call these callbacks so Workspace are notified
           */
          <Editor
            pageId={selectedPageId}
            onPageUpdated={handleUpdatePage}
            onPageDeleted={handleDeletePage}
            onPageArchive={handlePageArchived}
          />
        ) : (
          /*
           * Display an empty state when the workspace has no pages or when no page is selected
           */
          <div className="empty-editor">
            <h2>No page selected</h2>

            {canEditWorkspace && (
              <button type="button" onClick={() => handleCreatePage(null)}>
                Create a page
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Workspace;
