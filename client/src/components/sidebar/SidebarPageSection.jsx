import { isPageFavorited } from "../../utils/pageSidebarStorage";

/**
 * Flat sidebar section for favorites or recent pages
 */
const SidebarPageSection = ({
  title, // section title either "Favorites" or "Recent"
  pages = [], // list of pages inside workspace
  selectedPageId, // the ID of the currently selected page
  currentUserId, // the ID of the current user
  onSelectPage, // a function that is called when a page is selected
  onToggleFavorite, // a function that is called when a page is toggled as a favorite
}) => {
  // if there are no pages, return null
  if (pages.length === 0) {
    return null;
  }

  return (
    <section className="sidebar-section">
      {/* render the section title either "Favorites" or "Recent" */}
      <h3 className="sidebar-section-title">{title}</h3>

      <div className="sidebar-section-list">
        {/* render the list of pages */}
        {pages.map((page) => {
          const isFavorited = isPageFavorited(page, currentUserId);

          return (
            <div
              key={page._id}
              className={`sidebar-page sidebar-section-page ${
                selectedPageId === page._id ? "active" : ""
              }`}
              // call the onSelectPage function when the page is clicked
              onClick={() => onSelectPage(page._id)}
            >
              <span className="page-tree-icon">{page.icon || "📄"}</span>
              <span className="page-tree-title">
                {page.title || "Untitled"}
              </span>

              {/* render the favorite button */}
              <button
                type="button"
                className={`page-favorite-button ${
                  isFavorited ? "is-favorited" : ""
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(page._id);
                }}
                aria-label={
                  isFavorited ? "Remove from favorites" : "Add to favorites"
                }
              >
                {/* render the favorite icon if page is favorited, otherwise render the non-favorite icon */}
                {isFavorited ? "★" : "☆"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SidebarPageSection;
