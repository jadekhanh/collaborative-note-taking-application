/**
 * Search button located at Sidebar that opens Search Modal
 */
const SearchButton = ({ onOpenSearch }) => {
  return (
    <button
      type="button"
      className="sidebar-search-button"
      onClick={onOpenSearch}
    >
      🔍 Search pages and blocks
    </button>
  );
};

export default SearchButton;
