import { useMemo } from "react";
import {
  getRecentPageIds,
  isPageFavorited,
} from "../../utils/pageSidebarStorage";
import PageTree from "./PageTree";
import SearchButton from "./SearchButton";
import SidebarPageSection from "./SidebarPageSection";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

/**
 * Sidebar component
 */
const Sidebar = ({
  workspace = null,
  pages = [],
  selectedPageId = null,
  currentUserId = null,
  canEdit = false,
  onSelectPage,
  onCreatePage,
  onOpenSearch,
  onToggleFavorite,
}) => {
  const workspaceId = workspace?._id;

  /**
   * Get the list of favorite pages
   * useMemo because we want to avoid re-calculating the list of favorite pages on every render
   */
  const favoritePages = useMemo(() => {
    return pages.filter((page) => isPageFavorited(page, currentUserId));
  }, [pages, currentUserId]);

  /**
   * Get the list of non-favorite recent pages
   * useMemo because we want to avoid re-calculating the list of recent pages on every render
   */
  const recentPages = useMemo(() => {
    // get the list of recent page IDs
    const recentIds = getRecentPageIds(currentUserId, workspaceId);
    // get the list of favorite page IDs
    const favoriteIds = new Set(
      favoritePages.map((page) => page._id.toString()),
    );

    // get the list of recent pages that are not favorited
    return recentIds
      .map(
        (pageId) =>
          pages.find((page) => page._id.toString() === pageId.toString()), // find the page by ID
      )
      .filter(Boolean) // filter out any null values because the find() method returns null if the page is not found (deleted page, archived page, etc.)
      .filter((page) => !favoriteIds.has(page._id.toString())); // filter out any pages that are favorited
  }, [currentUserId, workspaceId, pages, favoritePages]);

  return (
    <aside className="sidebar">
      <WorkspaceSwitcher workspace={workspace} />

      <SearchButton onOpenSearch={onOpenSearch} />

      {canEdit && (
        <button
          type="button"
          className="new-page-button"
          onClick={() => onCreatePage(null)}
        >
          + New Page
        </button>
      )}

      <SidebarPageSection
        title="Favorites"
        pages={favoritePages}
        selectedPageId={selectedPageId}
        currentUserId={currentUserId}
        onSelectPage={onSelectPage}
        onToggleFavorite={onToggleFavorite}
      />

      <SidebarPageSection
        title="Recent"
        pages={recentPages}
        selectedPageId={selectedPageId}
        currentUserId={currentUserId}
        onSelectPage={onSelectPage}
        onToggleFavorite={onToggleFavorite}
      />

      <PageTree
        pages={pages}
        selectedPageId={selectedPageId}
        currentUserId={currentUserId}
        onSelectPage={onSelectPage}
        onCreatePage={onCreatePage}
        onToggleFavorite={onToggleFavorite}
        canEdit={canEdit}
      />
    </aside>
  );
};

export default Sidebar;
