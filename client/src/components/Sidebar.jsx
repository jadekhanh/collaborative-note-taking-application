/**
 * Sidebar component
 * @param {Object} workspace - The workspace object
 * @param {Object[]} pages - The pages array
 * @param {string} selectedPageId - The selected page id
 * @param {Function} onSelectPage - The function to handle page selection
 * @param {Function} onCreatePage - The function to handle page creation
 *
 * Notes:
 * Sidebar has onSelectPage since user clicks a page inside the Sidebar, then Workspace needs Sidebar to call that callback to update selectedPageId (this is owned by Workspace)
 * Sidebar has onCreatePage since the + button is inside the Sidebar, then Workspace needs Sidebar to call that callback to update pages list
 * Sidebar does not delete/update pages or has delete button so do not have onDeletePage or onUpdatePage
 */
const Sidebar = ({
  workspace,
  pages,
  selectedPageId,
  onSelectPage,
  onCreatePage,
}) => {
  /**
   * To make a sidebar to look like a tree:
   * Notes
   *  Homework
   *    Math
   * We need to build a tree of pages, so we can display them in a tree structure
   */
  const buildPageTree = (parentPageId = null) => {
    const filteredPages = [];
    // find all pages whose parent is parentPageId
    for (const page of pages) {
      // if the parentPageId is null
      if (parentPageId === null) {
        // if the page's parent is null, add it to the filteredPages array
        if (!page.parentPage) {
          filteredPages.push(page);
        }
        // if the parentPageId is not null
      } else {
        // if the page's parent is the parentPageId, add it to the filteredPages array
        if (page.parentPage === parentPageId) {
          filteredPages.push(page);
        }
      }
    }

    // for each page in the filteredPages array, build the tree
    const tree = [];
    for (const page of filteredPages) {
      tree.push({
        _id: page._id,
        title: page.title,
        workspace: page.workspace,
        parentPage: page.parentPage,
        owner: page.owner,
        icon: page.icon,
        coverImageUrl: page.coverImageUrl,
        isArchived: page.isArchived,
        order: page.order,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        // build the tree for this page's children
        children: buildPageTree(page._id),
      });
    }
    return tree;
  };

  // build the page tree for Sidebar
  const pageTree = buildPageTree();

  /**
   * Render the page tree for Sidebar
   * Take one page object and convert it into UI
   * @param: page - The page object
   * @param: depth - The depth of the page in the tree
   * @returns: The UI for the sidebar
   */
  const renderPage = (page, depth = 0) => {
    return (
      <div key={page._id}>
        {/* create actual clickable row in the sidebar */}
        <div
          className={`sidebar-page ${
            // if the page is selected, add the active class
            selectedPageId === page._id ? "active" : ""
          }`}
          //   add padding to the left of the page based on the depth -> to make child pages indented more
          style={{ paddingLeft: `${12 + depth * 18}px` }}
          // on click, select/open the page
          onClick={() => onSelectPage(page._id)}
        >
          {/* display the page icon, if not provided, use a default icon */}
          <span>{page.icon || "📄"}</span>
          {/* display the page title */}
          <span>{page.title}</span>
          {/* create a button to create a new child page under this page */}
          <button
            onClick={(event) => {
              // prevent the event from bubbling up to the parent elements
              event.stopPropagation();
              // create a new child page under this page
              onCreatePage(page._id);
            }}
          >
            {/* display a plus icon for the button */}+
          </button>
        </div>

        {/* render the children pages */}
        {page.children.map((child) => renderPage(child, depth + 1))}
      </div>
    );
  };

  // return Sidebar UI
  return (
    <aside className="sidebar">
      {/* display the workspace name */}
      <div className="sidebar-header">
        <h2>{workspace?.name || "Workspace"}</h2>
      </div>

      {/* create a button to create a new page */}
      <button className="new-page-button" onClick={() => onCreatePage(null)}>
        + New Page
      </button>

      {/* display the pages */}
      <div className="sidebar-pages">
        {/* if there are pages, render them */}
        {pageTree.length > 0
          ? // render each page in the page tree
            pageTree.map((page) => renderPage(page))
          : // if there are no pages, show nothing
            null}
      </div>
    </aside>
  );
};

export default Sidebar;
