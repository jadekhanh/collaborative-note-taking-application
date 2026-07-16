import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Create Search Modal component to search for pages and blocks
 * @params:
 * - isOpen = boolean to indicate if the Search Model is opened by user
 * - onClose = function to close the modal
 * - onSelectPage = function called when user clicks search result
 */
const SearchModal = ({ isOpen, onClose, onSelectPage }) => {
  // set state for search query = word query when user types
  const [query, setQuery] = useState("");
  // set state for page search result
  const [pages, setPages] = useState([]);
  // set state for block search result
  const [blocks, setBlocks] = useState([]);
  // set state for error message
  const [error, setError] = useState("");

  // run the following code whenever query changes
  // Note: the following code is a manual debounce
  useEffect(() => {
    // if query is empty, do nothing
    if (!query.trim()) {
      return;
    }

    // boolean if req is cancelled because user switches modal or switches outside
    let isCancelled = false;

    // search function
    const search = async () => {
      try {
        // reset error message
        setError("");

        // call GET api/search?q=query to perform search
        const res = await api.get(`/search?q=${query.trim()}`);

        // if req is cancelled, do nothing
        if (isCancelled) {
          return;
        }

        setPages(res.data.pages || []); // set pages list result
        setBlocks(res.data.blocks || []); // set blocks list result
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setError(error.response?.data?.message || "Failed to search");
      }
    };

    // set timeout so that the app waits 420ms after the user finishes typing before calling search()
    const timeoutId = setTimeout(search, 420);
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  /**
   * Reset everything when closes the Search modal
   */
  const closeSearchModal = () => {
    // reset all fields
    setQuery("");
    setPages([]);
    setBlocks([]);
    setError("");
    // close the modal
    onClose();
  };

  // if the search modal isn't opened, do nothing
  if (!isOpen) {
    return null;
  }

  // return UI
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          {/* search modal header */}
          <h2>Search</h2>

          {/* close search modal button */}
          <button type="button" onClick={closeSearchModal}>
            ×
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {/* search box input */}
        <input
          className="modal-input"
          value={query}
          // listening change on query
          onChange={(event) => {
            const newQuery = event.target.value;
            setQuery(newQuery);
            if (!newQuery.trim()) {
              setPages([]);
              setBlocks([]);
              setError("");
            }
          }}
          // a faded hint word in the text box
          placeholder="Start typing to search for pages and blocks"
          autoFocus
        />

        {/* output for page lists result */}
        <h3>Pages</h3>
        {/* loop through every page result */}
        {pages.map((page) => {
          return (
            <button
              key={page._id}
              type="button"
              className="search-result"
              onClick={() => {
                onSelectPage(page._id);
                closeSearchModal();
              }}
            >
              {page.title}
            </button>
          );
        })}

        {/* output for blocks list result */}
        <h3>Blocks</h3>
        {/* loop through every block result */}
        {blocks.map((block) => {
          return (
            // 1 button per block
            <button
              type="button"
              key={block._id}
              className="search-result"
              onClick={() => {
                // tell parent which page is selected / app opens the page containing the block
                onSelectPage(block.page._id);
                // close search modal
                closeSearchModal();
              }}
            >
              {/* show page title */}
              <strong>{block.page?.title}</strong>
              {/* show content of the block */}
              <span>{block.content?.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SearchModal;
