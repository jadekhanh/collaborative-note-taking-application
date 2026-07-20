import { isPageFavorited } from "../../utils/pageSidebarStorage";
import PageTreeItem from "./PageTreeItem";

/**
 * PageTree = a way of displaying pages in parent-child hierarchy
 * Visual: each item is a PageTreeItem and the whole thing is PageTree where every page can have child pages
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
 * - pages: every page inside the workspace as list got from MongoDB
 * - selectedPageId: which page is currently opened in Editor
 * - onSelectPage: function to open a page in Editor
 * - onCreatePage: function to create a child page
 * - canEdit: whether this user is workspace owner or editor
 */
const PageTree = ({
  pages = [],
  selectedPageId,
  currentUserId,
  onSelectPage,
  onCreatePage,
  onToggleFavorite,
  canEdit,
}) => {
  /**
   * Recursively build a tree from a flat pages list
   * Top-level pages have parentPage = null
   * Child pages have parentPage = ID of their parent page
   */
  const buildPageTree = (parentPageId = null) => {
    // create an empty array that will contain all pages under parentPageId
    const pageTree = [];

    // loop over every page in workspace
    for (const page of pages) {
      // get this page's parent ID
      const currentParentId = page.parentPage?._id || page.parentPage || null;

      // true if this page is the top level page with no parent
      const isTopLevelMatch = currentParentId === null && parentPageId === null;

      // true if this page belongs to the parent page we're currently building
      const isChildMatch =
        currentParentId !== null &&
        parentPageId !== null &&
        currentParentId.toString() === parentPageId.toString();

      // if either condition match, add this page
      if (isTopLevelMatch || isChildMatch) {
        pageTree.push(page);
      }
    }

    // sort the pages
    pageTree.sort((firstPage, secondPage) => {
      // if the pages have different order values, smaller order comes first
      if (firstPage.order !== secondPage.order) {
        return firstPage.order - secondPage.order;
      }

      // if they have the same order, older page comes first
      else {
        return new Date(firstPage.createdAt) - new Date(secondPage.createdAt);
      }
    });

    // now recursively build the children for every page we kept
    const completedTree = [];
    for (const page of pageTree) {
      completedTree.push({
        // keep all existing page fields
        ...page,
        // build this page's child pages
        children: buildPageTree(page._id),
      });
    }

    // return the completed tree
    return completedTree;
  };

  // build complete tree
  const pageTree = buildPageTree();

  // if there's no pages, render empty sidebar
  if (pageTree.length === 0) {
    return <p className="sidebar-empty">No pages yet</p>;
  }

  return (
    <div className="page-tree">
      <h3 className="sidebar-section-title">Pages</h3>
      {pageTree.map((page) => (
        <PageTreeItem
          key={page._id}
          page={page} // pass page data
          depth={0} // top-level pages begin with depth = 0
          selectedPageId={selectedPageId} // tell every page which page is currently opened in editor
          currentUserId={currentUserId} // pass the ID of the current user
          isFavorited={isPageFavorited(page, currentUserId)} // pass whether this page is favorited by the current user
          onSelectPage={onSelectPage} // pass the function that opens page
          onCreatePage={onCreatePage} // pass the function that creates child page
          onToggleFavorite={onToggleFavorite} // pass the function that toggles page as a favorite
          canEdit={canEdit} // pass whether this user is workspace owner or editor
        />
      ))}
    </div>
  );
};

export default PageTree;
