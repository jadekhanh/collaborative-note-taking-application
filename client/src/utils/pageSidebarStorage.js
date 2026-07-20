const RECENT_PAGES_KEY = "recentPages";

// get unique storage key for recently opened page IDs
// this is a unique key for each user and workspace combination
// each workspace has its own recently opened page IDs list
// user + workspace ID is a unique identifier for unique recently opened page IDs list
// key = "recentPages:userId:workspaceId", item = '["pageId1", "pageId2", "pageId3"]' which is a string
const getStorageKey = (userId, workspaceId) =>
  `${RECENT_PAGES_KEY}:${userId}:${workspaceId}`;

/**
 * Read recently opened page IDs for a workspace (most recent first)
 * limit is the number of recently opened page IDs to return
 */
export const getRecentPageIds = (userId, workspaceId, limit = 10) => {
  // if the user ID or workspace ID is not set, return an empty array
  if (!userId || !workspaceId) {
    return [];
  }

  try {
    // get recently opened page IDs from localStorage
    // stored contains '["pageId1", "pageId2", "pageId3"]' which is a string
    const stored = localStorage.getItem(getStorageKey(userId, workspaceId));
    // if there are no stored recently opened page IDs, return an empty array
    if (!stored) {
      return [];
    }

    // parse the stored recently opened page IDs
    // converts stored string into an array of page IDs: ["pageId1", "pageId2", "pageId3"]
    const pageIds = JSON.parse(stored);
    // if the stored recently opened page IDs is not an array, return an empty array
    if (!Array.isArray(pageIds)) {
      return [];
    }

    // return the last 10 recently opened page IDs
    return pageIds.slice(0, limit);
  } catch {
    return [];
  }
};

/**
 * Move a page to the front of the recent list
 * Runs this function when a page is opened
 * pageId is the ID of the page that was opened
 */
export const recordRecentPage = (userId, workspaceId, pageId, limit = 10) => {
  // if the user ID, workspace ID, or page ID is not set, do nothing
  if (!userId || !workspaceId || !pageId) {
    return;
  }

  // get existing recently opened page IDs: ["pageId1", "pageId2", "pageId3"]
  const existing = getRecentPageIds(userId, workspaceId, limit);
  // create a new array with the page ID at the front and the existing page IDs in the back
  const next = [
    pageId.toString(), // add the page ID to the front of the list
    ...existing.filter((id) => id.toString() !== pageId.toString()), // remove the page ID from the existing list
  ].slice(0, limit); // limit the list to the number of recently opened page IDs to return

  // store the new recently opened page IDs in localStorage
  localStorage.setItem(
    getStorageKey(userId, workspaceId), // key = "recentPages:userId:workspaceId"
    JSON.stringify(next), // item = '["pageId1", "pageId2", "pageId3"]' which is a string
  );
};

/**
 * Whether the current user favorited a page
 * returns true if the current user is in the page's favoritedBy list
 */
export const isPageFavorited = (page, userId) => {
  // if the page or user ID is not set, return false
  if (!page?.favoritedBy || !userId) {
    return false;
  }

  // check if the current user is in the page's favoritedBy list
  return page.favoritedBy.some(
    (favoriteUserId) =>
      (favoriteUserId?._id || favoriteUserId)?.toString() === userId.toString(),
  );
};
