import { useState } from "react";
import { isPageFavorited } from "../../utils/pageSidebarStorage";
/**
 * PageTreeItem = represents a page inside the sidebar
 * If the page as child pages, it also renders those children underneath itself
 * Visual: each item is a PageTreeItem
 * Projects                 +
 *      Marketplace App     +
 *          Backend         +
 *          Frontend        +
 *      Note-taking App     +
 * Meeting Notes            +
 *
 * PageTree: take all pages from MongoDB (which comes as flat list) and organize them into a tree
 * PageTreeItem: draws every page
 *
 * @params
 * - page: the page being displayed
 * - depth: how deeply nested the page is: 0 = top-level page, 1 = child page, 2 = grandchild page
 * - selectedPageId: ID of page currently opened in editor
 * - onSelectPage: function from Workspace that opens a page in Editor
 * - onCreatePage: function from Workspace to create a child page
 */
const PageTreeItem = ({
  page,
  depth,
  selectedPageId,
  currentUserId,
  isFavorited = false,
  onSelectPage,
  onCreatePage,
  onToggleFavorite,
  canEdit,
}) => {
  // a state that rememebers if this page's children are visible/expanded
  const [isExpanded, setIsExpanded] = useState(true); // child pages are shown by default
  // bool check if this page item has page children
  const hasChildren = page.children?.length > 0;

  /**
   * Expand or collapse the current page to view child pages
   */
  const toggleExpanded = (event) => {
    // since the arrow button sits inside the clickable row onClick={() => onSelectPage(pageId)}
    // click the arrow would expand/collapse the children + open the page
    // we only want to expand or collapse
    event.stopPropagation();

    // if this tree item has children pages
    // a page without children pages does not need to expand or collapse
    if (hasChildren) {
      // reverse the current state
      // if current value = true, then make it false to collapse
      // if current value = false, then make it true to expand
      setIsExpanded((currentValue) => {
        if (currentValue === true) {
          return false;
        } else {
          return true;
        }
      });
    }
  };

  // return UI
  return (
    <div className="page-tree-item">
      <div
        className={`sidebar-page ${
          selectedPageId === page._id ? "active" : "" // creates a clickable row for the page. if the page is selected, it gets "active", when not selected, ""
        }`}
        style={{
          paddingLeft: `${8 + depth * 18}px`, // adds left padding based on nesting level: the deeper the page, the further right it appears
        }}
        onClick={() => onSelectPage(page._id)} // when clicks on the row, call Editor to open the page
      >
        {/* Expand/collapse child pages. */}
        <button
          type="button"
          className="page-tree-toggle"
          onClick={toggleExpanded} // when clicked, call toggleExpanded()
          disabled={!hasChildren} // disable the button if page has no children
          aria-label={
            isExpanded ? "Collapse child pages" : "Expand child pages" // if children are visible, the button is described as "collapse child pages", if hidden, other one
          }
        >
          {/* if has children and is expanded, arrow down
            if has children and not expanded, arrow right
            if no children, no arrow
             */}
          {hasChildren ? (isExpanded ? "▾" : "▸") : " "}
        </button>

        {/* Page icon and title */}
        <span className="page-tree-icon">{page.icon || "📄"}</span>

        <span className="page-tree-title">{page.title || "Untitled"}</span>

        <button
          type="button"
          className={`page-favorite-button ${isFavorited ? "is-favorited" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.(page._id);
          }}
          aria-label={
            isFavorited ? "Remove from favorites" : "Add to favorites" // if page is favorited, the button is described as "remove from favorites", if not, other one
          }
        >
          {/* if page is favorited, render the favorite icon, if not, render the non-favorite icon */}
          {isFavorited ? "★" : "☆"}
        </button>

        {/* Create a child page under this page, only visible to workspace editor or owner */}
        {canEdit && (
          <button
            type="button"
            className="page-tree-add"
            onClick={(event) => {
              event.stopPropagation(); // prevents the click from also opening the current page
              onCreatePage(page._id); // param = parentPage = current page is parent page
              setIsExpanded(true); // make sure the parent page is expanded after creating the child
            }}
            aria-label={`Create child page under ${page.title}`}
          >
            +
          </button>
        )}
      </div>

      {/* Recursively render child pages while expanded */}
      {hasChildren &&
        isExpanded && ( // only render if this page has children pages and is expanded
          <div className="page-tree-children">
            {page.children.map((childPage) => (
              // recursively render the children
              <PageTreeItem
                key={childPage._id}
                page={childPage}
                depth={depth + 1}
                selectedPageId={selectedPageId}
                currentUserId={currentUserId}
                isFavorited={isPageFavorited(childPage, currentUserId)}
                onSelectPage={onSelectPage}
                onCreatePage={onCreatePage}
                onToggleFavorite={onToggleFavorite}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
    </div>
  );
};

export default PageTreeItem;
