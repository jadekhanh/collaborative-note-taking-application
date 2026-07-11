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

/**
 * React component = a function that returns UI
 * This is Workspace page
 */
const Workspace = () => {
  // extract workspaceId from params
  // React Router extracts it from url
  const { workspaceId } = useParams();

  // set workspace information { id, name, members }; null at first
  const [workspace, setWorkspace] = useState(null);
  // set workspace pages state; [] at first
  const [pages, setPages] = useState([]);
  // set which page is currently open; null at first
  const [selectedPageId, setSelectedPageId] = useState();
  // set React state for error
  const [error, setError] = useState();
  // set React state for Search modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // set React state for Archived Pages panel
  const [isArchivedPagesOpen, setIsArchivedPagesOpen] = useState(false);

  // useEffect() = run the following code whenever the component loads or when specified dependencies change
  useEffect(() => {
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
   * Optional param: parentPage, else null
   */
  const handleCreatePage = async (parentPage = null) => {
    try {
      // create page by calling POST /api/pages/
      const res = await api.post("/pages", {
        title: "Untitled",
        workspaceId,
        parentPage,
      });

      // set list of pages where the newly created page appear last
      setPages([...pages, res.data.page]);
      // set the page that is currently opened as newly created page
      setSelectedPageId(res.data.page._id);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create page");
    }
  };

  /**
   * Handle restore page
   */
  const handlePageRestored = (restoredPage) => {
    setPages((prevPages) => [...prevPages, restoredPage]);
    setSelectedPageId(restoredPage._id);
  };

  /**
   * Handle archive page
   */
  const handlePageArchived = (pageId) => {
    // list of pages excluding page that is just archived
    const remainingPages = pages.filter((page) => page._id !== pageId);

    // display remaning pages
    setPages(remainingPages);

    // if the archived page is the page that is opened, open the first page in the top of the remaining pages list
    if (selectedPageId === pageId) {
      setSelectedPageId(remainingPages[0]?._id || null);
    }
  };

  /**
   * Handle update a page
   * When a page is updated, the sidebar is updated to push the newly updated page on top
   */
  const handleUpdatePage = async (updatedPage) => {
    // create a new list of page
    const newPages = [];
    // loop over the current list of page
    for (const page of pages) {
      // if this page has the same ID with newly updated page, add it into the list
      // so we do not add the old version, we add the same page but new version
      if (page._id === updatedPage._id) {
        newPages.push(updatedPage);
        // if this page is not the newly updated page, add it into the list
      } else {
        newPages.push(page);
      }
    }
    // set the list of pages as the new list
    setPages(newPages);
  };

  /**
   * Handle delete a page
   * When a page is deleted, the sidebar is updated to remove the deleted page from the list
   */
  const handleDeletePage = async (deletedPage) => {
    // create a new list of page
    const newPages = [];
    // loop over the current list of page
    for (const page of pages) {
      // if this page is not the deleted page
      if (page._id !== deletedPage._id) {
        newPages.push(page);
      }
    }
    // set the list of pages as the new list
    setPages(newPages);

    // if the deleted page is the page that is currently opened
    if (selectedPageId === deletedPage._id) {
      // if the list of pages > 0
      if (newPages.length > 0) {
        // then open the page that is on top of the list
        setSelectedPageId(newPages[0]._id);
      } else {
        // do not open anything
        setSelectedPageId(null);
      }
    }
  };

  // return page UI
  return (
    <div className="workspace-page">
      {/* Search button to start page and block search */}
      <button className="search-button" onClick={() => setIsSearchOpen(true)}>
        Search
      </button>
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(close)}
        onSelectPage={selectedPageId}
      />

      {/* Archive button to archive current page */}
      <button
        className="floating-archive-button"
        onClick={() => setIsArchivedPagesOpen(true)}
      >
        Archived
      </button>

      <ArchivedPagesPanel
        workspaceId={workspaceId}
        isOpen={isArchivedPagesOpen}
        onClose={() => setIsArchivedPagesOpen(false)}
        onPageRestored={handlePageRestored}
      />

      {/* create sidebar */}
      <Sidebar
        // pass workspace
        workspace={workspace}
        // pass pages
        pages={pages}
        // tell sidebar which page is highlighted/selected
        selectedPageId={selectedPageId}
        // callback functions: Sidebar can tell Workspace if it selects or creates a page so Workspace can update its state
        // Sidebar, if you select a page, call this function
        // Sidebar, if you create a page, call this function
        onSelectPage={setSelectedPageId}
        onCreatePage={handleCreatePage}
      />
      <main className="workspace-main">
        {/* show error if it exists */}
        {error && <p className="error">{error}</p>}
        {/* if a page is selected, show editor */}
        {selectedPageId ? (
          <Editor
            pageId={selectedPageId}
            // callback functions: Editor can tell workspace if it updates/deletes a page and workspace can update its state
            onPageUpdated={handleUpdatePage} // Editor, if you update a page, call this function
            onPageDeleted={handleDeletePage} // Editor, if you delete a page, call this function
            onPageArchived={handlePageArchived} // Editor, if you archive a page, call this function
          />
        ) : (
          // if no page is selected, shows empty editor that has a button to create a page
          <div className="empty-editor">
            <h2>No page selected</h2>
            <button onClick={() => handleCreatePage(null)}>
              Create a page
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Workspace;
