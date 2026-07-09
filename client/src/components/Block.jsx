import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import useAutosave from "../hooks/useAutosave";

/**
 * Block component
 * @param block - block data from MongoDB
 * @param remoteCursors - cursors of other users inside this block
 * @param onUpdate - function from Editor to update a block
 * @param: onCopy - function from Editor to copy a block
 * @param onDelete - function from Editor to delete a block
 * @param onComment - function from Editor to open comments for this block
 * @param onTypingStarted - function from Editor to show typing indicator
 * @param onTypingStopped - function from Editor to stop typing indicator
 * @param onCursorMoved - function from Editor to broadcast cursor position
 */
const Block = ({
  block,
  remoteCursors = [],
  onUpdate,
  onCopy,
  onDelete,
  onComment,
  onTypingStarted,
  onTypingStopped,
  onCursorMoved,
}) => {
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
  // React state that stores the current typing timeout
  const typingTimeoutRef = useRef(null);

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
   * Handle typing indicator when a user starts typing
   *
   * Updates the local text asap
   * Tell other users this user has started typing
   * Restart the 1s timer
   * If no typing happens for 1s, notify everyone that typing has stopped
   */
  const handleTypingIndicator = (newText) => {
    // update the block's local text asap
    updateText(newText);

    // notify Editor that typing has started
    onTypingStarted();

    // cancel previous timer because user continues typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // start new timer
    typingTimeoutRef.current = setTimeout(() => {
      // onTyperStopped() is called only when the user stops typing for 1s
      if (onTypingStopped) {
        onTypingStopped;
      }
    }, 1000);
  };

  /**
   * Run this effect when this block component is removed
   * Prevents timers from continuing to run after the block has been removed
   */
  useEffect(() => {
    return () => {
      // if typing timer stills exists
      if (typingTimeoutRef.current) {
        // cancel it
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle when the text cursor moves
   *
   * This happens when the user: clicks, types, hightlights text, uses arrow keys
   *
   * Send the latest cursor position to Editor which broadcasts it to other users
   */
  const handleCursorChange = (event) => {
    onCursorMoved({
      // current block
      blockId: block._id,
      // blinking cursor position
      cursorPosition: event.target.selectionStart,
      // end of highlight selection
      selectionEnd: event.target.selectionEnd,
      // current block type
      type: localType,
    });
  };

  /**
   * Cursor events
   */
  const sharedCursorProps = {
    onKeyUp: handleCursorChange, // user types a key
    onClick: handleCursorChange, // user clicks somewhere
    onSelect: handleCursorChange, // user highlights a text
    onFocus: handleCursorChange, // input receives keyboard focus
  };

  /**
   * Handle when user types /heading, /paragraph, convert the block to that type
   */
  const handleSlashCommand = (newText) => {
    // create a map: text -> block type
    const commands = {
      "/heading": "heading",
      "/subheading": "subheading",
      "/bullet": "bullet",
      "/checklist": "checklist",
      "/code": "code",
      "/quote": "quote",
      "/paragraph": "paragraph",
    };

    // if newText.trim() = block type, set block type and content
    if (commands[newText.trim()]) {
      setLocalType(commands[newText.trim()]);
      // keep other block contents, reset text section only
      setLocalContent({
        ...localContent,
        text: "",
      });
      return;
    }

    // else, just run typing indicator
    handleTypingIndicator(newText);
  };

  const renderBlockInput = () => {
    switch (localType) {
      case "heading":
        return (
          <input
            className="block-input block-heading"
            value={text}
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Heading"
            {...sharedCursorProps} // attach all cursor-tracking events
          />
        );

      case "subheading":
        return (
          <input
            className="block-input block-subheading"
            value={text}
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Subheading"
            {...sharedCursorProps} // attach all cursor-tracking events
          />
        );

      case "bullet":
        return (
          <div className="bullet-row">
            <span>•</span>
            <input
              className="block-input"
              value={text}
              onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
              placeholder="Bullet"
              {...sharedCursorProps} // attach all cursor-tracking events
            />
          </div>
        );

      case "checklist":
        return (
          <div className="checklist-row">
            <input
              type="checkbox"
              checked={localContent?.checked || false}
              onChange={(event) =>
                setLocalContent({
                  ...localContent,
                  checked: event.target.checked,
                })
              }
            />

            <input
              className="block-input"
              value={text}
              onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
              placeholder="Checklist item"
              {...sharedCursorProps} // attach all cursor-tracking events
            />
          </div>
        );

      case "code":
        return (
          <textarea
            className="block-input block-code"
            value={text}
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Code"
            {...sharedCursorProps}
          />
        );

      case "quote":
        return (
          <textarea
            className="block-input block-quote"
            value={text}
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Quote"
            {...sharedCursorProps} // attach all cursor-tracking events
          />
        );

      default:
        return (
          <textarea
            className="block-input"
            value={text}
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Write something..."
            {...sharedCursorProps}
          />
        );
    }
  };

  // return UI
  return (
    <div ref={setNodeRef} style={style} className="block">
      {/* display other users' cursor positions inside this block */}
      {remoteCursors.length > 0 && (
        <div className="inline-remote-cursors">
          {remoteCursors.map((remoteCursor) => (
            <span key={remoteCursor.user._id} className="inline-remote-cursor">
              {remoteCursor.user.username} is editing at character{" "}
              {remoteCursor.cursor.cursorPosition}
            </span>
          ))}
        </div>
      )}

      <div className="block-controls">
        <button
          className="drag-handle"
          type="button"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>

        <select
          value={localType}
          onChange={(event) => updateType(event.target.value)}
        >
          <option value="paragraph">Paragraph</option>
          <option value="heading">Heading</option>
          <option value="subheading">Subheading</option>
          <option value="bullet">Bullet</option>
          <option value="checklist">Checklist</option>
          <option value="code">Code</option>
          <option value="quote">Quote</option>
        </select>

        <button onClick={() => onComment(block._id)}>Comment</button>
        <button onClick={() => onCopy(block._id)}>Duplicate</button>
        <button onClick={() => onDelete(block._id)}>Delete</button>

        <span className="block-save-status">
          {blockSaveStatus === "saving" && "Saving..."}
          {blockSaveStatus === "saved" && "Saved"}
          {blockSaveStatus === "error" && "Save failed"}
        </span>
      </div>

      {renderBlockInput()}
    </div>
  );
};

export default Block;
