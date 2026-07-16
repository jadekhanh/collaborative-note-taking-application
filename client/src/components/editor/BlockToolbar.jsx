import { useEffect, useRef, useState } from "react";

/**
 * Dropdown menu within each block containing block actions
 * @params
 * - blockId = current block where the toolbar locates
 * - blockType = type of current block
 * - canEdit = whether current user has editor access (editor or owner)
 * - onTypeChange = function from Editor that changes block type
 * - onComment = function from Editor that open comments panel for the block
 * - onCopy = function from Editor that makes a copy of current block
 * - onDelete = function from Editor that deletes current block
 */
const BlockToolbar = ({
  blockId,
  blockType,
  canEdit,
  onTypeChange,
  onComment,
  onCopy,
  onDelete,
}) => {
  // react State to open/close dropdown menu
  const [isOpen, setIsOpen] = useState(false); // default = false = close
  // stores a reference to toolbar's real HTML element
  const toolbarRef = useRef(null);

  /**
   * Close the toolbar when user clicks outside of it
   */
  useEffect(() => {
    // handle when user clicks outisde the toolbar
    const handleOutsideClick = (event) => {
      // if the event.target = the mouse click = not inside the toolbar
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        // close the toolbar
        setIsOpen(false);
      }
    };
    // add mouse listener to entire webpage
    // when user presses the mouse, calls handleOutsideClick()
    document.addEventListener("mousedown", handleOutsideClick);

    // after the toolbar is removed from the screen, remove the listener so it does not keep running after the toolbar no longer opens
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // return UI
  return (
    <div className="block-toolbar" ref={toolbarRef}>
      {/* Open or close this block's action menu. */}
      <button
        type="button"
        className="block-toolbar-trigger"
        onClick={() => setIsOpen((currentValue) => !currentValue)} // click on the button to close -> open, open to close the dropdown menu
        aria-label="Open block actions"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="block-toolbar-menu">
          {/* Viewers may still open block-level discussions */}
          <button
            type="button"
            onClick={() => {
              onComment(blockId); // button to open the comments panel
              setIsOpen(false); // once the panel opens, close the dropdown menu
            }}
          >
            Comment
          </button>

          {/* Only editors and owners may modify the block */}
          {canEdit && (
            <>
              <label
                htmlFor={`block-type-${blockId}`}
                className="block-toolbar-label"
              >
                Block type
              </label>

              <select
                id={`block-type-${blockId}`}
                value={blockType}
                onChange={(event) => {
                  onTypeChange(event.target.value);
                  setIsOpen(false); // close the block toolbar after selecting a new block type
                }}
              >
                <option value="paragraph">Paragraph</option>
                <option value="heading">Heading</option>
                <option value="subheading">Subheading</option>
                <option value="bullet">Bullet</option>
                <option value="numbered">Numbered list</option>
                <option value="checklist">Checklist</option>
                <option value="code">Code</option>
                <option value="quote">Quote</option>
                <option value="image">Image</option>
                <option value="file">File</option>
              </select>

              {/* Copy button */}
              <button
                type="button"
                onClick={() => {
                  onCopy(blockId);
                  setIsOpen(false);
                }}
              >
                Copy
              </button>

              {/* Delete button */}
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  onDelete(blockId);
                  setIsOpen(false); // once clicks delete block, close the toolbar's dropdown menu
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockToolbar;
