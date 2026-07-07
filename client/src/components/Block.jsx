import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import useAutosave from "../hooks/useAutosave";

/**
 * Block component
 * @param: block - block data from MongoDB
 * @param: onUpdate - function from Editor to update a block
 * @param: onDelete - function from Editor to delete a block
 * @param: onComment - function from Editor to open comments for this block
 */
const Block = ({ block, onUpdate, onDelete, onComment }) => {
  /**
   * Calls useSortable() hook that returns a draggable large object
   */
  const {
    attributes, // HTML accessibility attributes
    listeners, // event listeners: onMouseDown, onPointerDown, onTouchStart, onKeyDown
    setNodeRef, // tell dnd kit which element is moving
    transform, // while dragging, dnd library calculates how far the block moves
    transition, // allows the blocks to smoothly slides
    isDragging, // boolean to indicate if the user is dragging sth
  } = useSortable({ id: block._id }); // id of draggable item = block id

  /**
   * Creates an object containing CSS style
   */
  const style = {
    // allow browser to knows how to move a block
    transform: CSS.Transform.toString(transform),
    // allow blocks to smoothly slide with ease under certain velocity
    transition,
    // when dragging, 50% transparent, when not dragging 100% visible
    opacity: isDragging ? 0.5 : 1,
  };

  // React states for current block's content and type
  const [localContent, setLocalContent] = useState(block.content || {});
  const [localType, setLocalType] = useState(block.type);

  // get block text; if not exists, use ""
  const text = localContent?.text || "";

  /**
   * Save current block
   */
  const saveBlock = async () => {
    // call Editor to update the block with current type and content
    await onUpdate(block._id, {
      type: localType,
      content: localContent,
    });
  };

  /**
   * Autosave this block
   * Whenever localType or localContent changes, autoSave waits 700ms and then calls saveBlock()
   */
  const blockSaveStatus = useAutosave({
    value: { type: localType, content: localContent },
    onSave: saveBlock,
    delay: 700,
    enabled: Boolean(block?._id), // only save if the block has an ID (prevent saving invalid block)
  });

  /**
   * Update text inside a block
   */
  const updateText = (newText) => {
    // set React state of current block
    setLocalContent({
      ...localContent,
      text: newText, // only updates the text field while keeping the rest of localContent
    });
  };

  /**
   * Update block type
   */
  const updateType = (newType) => {
    // set React state of block type and displays a different input style (e.g, paragprah -> heading)
    setLocalType(newType);
  };

  /**
   * Depends on the block type, decides which input UI to display
   */
  const renderBlockInput = () => {
    switch (localType) {
      case "heading":
        return (
          <input
            className="block-input block-heading"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Heading"
          />
        );

      case "subheading":
        return (
          <input
            className="block-input block-subheading"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Subheading"
          />
        );

      case "bullet":
        return (
          <div className="bullet-row">
            {/* display a bullet symbol, followed by text */}
            <span>•</span>
            <input
              className="block-input"
              value={text}
              onChange={(event) => updateText(event.target.value)}
              placeholder="Bullet"
            />
          </div>
        );

      case "checklist":
        return (
          <div className="checklist-row">
            {/*  display checkbox */}
            {/* display checkbox */}
            <input
              type="checkbox"
              //   if checked does not exist, default to false
              checked={localContent?.checked || false}
              //   when checkbox changes, update checked inside localContent
              onChange={(event) =>
                setLocalContent({
                  ...localContent,
                  checked: event.target.checked, // event.target.checked is a Boolean
                })
              }
            />
            {/* followed by display input text */}
            <input
              className="block-input"
              value={text}
              onChange={(event) => updateText(event.target.value)}
              placeholder="Checklist item"
            />
          </div>
        );

      case "code":
        return (
          <textarea
            className="block-input block-code"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Code"
          />
        );

      case "quote":
        return (
          <textarea
            className="block-input block-quote"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Quote"
          />
        );

      // if type is unknown, show normal texting area
      default:
        return (
          <textarea
            className="block-input"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Write something..."
          />
        );
    }
  };

  // return UI
  return (
    <div ref={setNodeRef} style={style} className="block">
      <div className="block">
        <div className="block-controls">
          {/* Display drag ⋮⋮ handle */}
          <button
            className="drag-handle"
            type="button"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>

          {/*  dropdown for changing block type */}
          <select
            value={localType}
            onChange={(event) => updateType(event.target.value)}
          >
            {/* options in dropdown menu */}
            <option value="paragraph">Paragraph</option>
            <option value="heading">Heading</option>
            <option value="subheading">Subheading</option>
            <option value="bullet">Bullet</option>
            <option value="checklist">Checklist</option>
            <option value="code">Code</option>
            <option value="quote">Quote</option>
          </select>

          {/* button to add comment to block */}
          <button onClick={() => onComment(block._id)}>Comment</button>

          {/* button to delete block */}
          <button onClick={() => onDelete(block._id)}>Delete</button>

          {/* Display block save status */}
          <span className="block-save-status">
            {blockSaveStatus === "saving" && "Saving..."}
            {blockSaveStatus === "saved" && "Saved"}
            {blockSaveStatus === "error" && "Save failed"}
          </span>
        </div>

        {/* render the correct input depending on the block type */}
        {renderBlockInput()}
      </div>
    </div>
  );
};

export default Block;
