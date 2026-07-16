import PageTree from "./PageTree";
import SearchButton from "./SearchButton";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

/**
 * Sidebar component
 * @param {Object} workspace - The workspace object
 * @param {Object[]} pages - The pages array
 * @param {string} selectedPageId - the page that is currently opened in Editor
 * @param {Boolean} canEdit - whether current user is workspace editor or owner
 * @param {Function} onSelectPage - The function to open a page in Editor
 * @param {Function} onCreatePage - The function to create a page
 *
 * Notes:
 * Sidebar has onSelectPage since user clicks a page inside the Sidebar, then Workspace needs Sidebar to call that callback to update selectedPageId (this is owned by Workspace)
 * Sidebar has onCreatePage since the + button is inside the Sidebar, then Workspace needs Sidebar to call that callback to update pages list
 */
const Sidebar = ({
  workspace = null,
  pages = [],
  selectedPageId = null,
  canEdit = false,
  onSelectPage,
  onCreatePage,
  onOpenSearch,
}) => {
  return (
    <aside className="sidebar">
      <WorkspaceSwitcher workspace={workspace} />

      {/* Search button to search for pages and blocks within workspace */}
      <SearchButton onOpenSearch={onOpenSearch} />

      {/* New Page button, only visible to workspace owner and editor */}
      {canEdit && (
        <button
          type="button"
          className="new-page-button"
          onClick={() => onCreatePage(null)}
        >
          + New Page
        </button>
      )}

      {/* Display page tree */}
      <PageTree
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={onSelectPage}
        onCreatePage={onCreatePage}
        canEdit={canEdit}
      />
    </aside>
  );
};

export default Sidebar;
