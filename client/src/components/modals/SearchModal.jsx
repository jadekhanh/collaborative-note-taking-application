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

  // run the following code whenever query changes
  // Note: the following code is a manual debounce
  useEffect(() => {
    // search function
    const search = async () => {
      // if query is empty after trimmed of spaces, set pages and blocks result lists to null and stop the search
      if (!query.trim()) {
        setPages([]);
        setBlocks([]);
        return;
      }

      // call GET api/search?q=query to perform search
      const res = await api.get(`/search?q=${query}`);
      setPages(res.data.pages); // set pages list result
      setBlocks(res.data.blocks); // set blocks list result
    };

    // set timeout so that the app waits 420ms after the user finishes typing before calling search()
    const timeoutId = setTimeout(search, 420);
    return () => clearTimeout(timeoutId);
  }, [query]);

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
          <button onClick={onClose}>×</button>
        </div>

        {/* search box input */}
        <input
          className="modal-input"
          value={query}
          // listening change on query
          onChange={(event) => setQuery(event.target.value)}
          // a faded hint word in the text box
          placeholder="Start typing to search for pages and blocks"
          autoFocus
        />

        {/* output for page lists result */}
        <h3>Pages</h3>
        {/* loop through every page result */}
        {pages.map((page) => {
          // 1 button per page
          <button
            key={page._id}
            className="search-result"
            onClick={() => {
              // tell parent which page is selected / app opens the page
              onSelectPage(page._id);
              //   close search modal
              onClose();
            }}
          >
            {/* display page title */}
            {page.title}
          </button>;
        })}

        {/* output for blocks list result */}
        <h3>Blocks</h3>
        {/* loop through every block result */}
        {blocks.map((block) => {
          // 1 button per block
          <button
            key={block._id}
            className="search-result"
            onClick={() => {
              // tell parent which page is selected / app opens the page containing the block
              onSelectPage(block.page._id);
              //   close search modal
              onClose();
            }}
          >
            {/* show page title */}
            <strong>{block.page?.title}</strong>
            {/* show content of the block */}
            <span>{block.content?.text}</span>
          </button>;
        })}
      </div>
    </div>
  );
};

export default SearchModal;
