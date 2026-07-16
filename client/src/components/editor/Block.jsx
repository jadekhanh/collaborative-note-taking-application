import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import useAutosave from "../../hooks/useAutosave";
import BlockToolbar from "./BlockToolbar";

/**
 * Block component
 * @param block - block data from MongoDB
 * @param remoteCursors - cursors locations of other users inside a block
 * @param inputRef - input element of a block
 * @param numberedIndex - the number index of the block if this block is a numbered block (1. block, 2. block)
 * @param onUpdate - function from Editor to update a block
 * @param: onCopy - function from Editor to copy a block
 * @param onDelete - function from Editor to delete a block
 * @param onCreateAfter - function from Editor to create a block after a block
 * @param onDeleteEmpty - function from Editor to delete empty block
 * @param onUpdateIndent - function from Editor to update indentation of a block
 * @param onComment - function from Editor to open comments for a block
 * @param onTypingStarted - function from Editor to show typing indicator
 * @param onTypingStopped - function from Editor to stop typing indicator
 * @param onCursorMoved - function from Editor to broadcast cursor position
 * @param onUploadFile - function from Editor to upload a file
 * @param: canEdit - boolean if user can edit block (VIEWER cannot)
 * @param: commentCount = 0 = number of comments this block has
 */
const Block = ({
  block,
  remoteCursors = [],
  inputRef,
  numberedIndex,
  onUpdate,
  onCopy,
  onDelete,
  onCreateAfter,
  onDeleteEmpty,
  onUpdateIndent,
  onComment,
  onTypingStarted,
  onTypingStopped,
  onCursorMoved,
  onUploadFile,
  canEdit = true,
  commentCount = 0,
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
  } = useSortable({
    id: block._id,
    disabled: !canEdit,
  }); // id of draggable item = block id, disabled = only VIEWER cannot drag items

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
  // React state that stores indentation level of current block
  const indentLevel = localContent?.indentLevel || 0;

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
    enabled: Boolean(block?._id && canEdit), // only save if the block has an ID (prevent saving invalid block)
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
        onTypingStopped();
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
   * Handle when user types /heading, /paragraph, convert the block to that type
   */
  const handleSlashCommand = (newText) => {
    // create a map: text -> block type
    const commands = {
      "/heading": "heading",
      "/subheading": "subheading",
      "/bullet": "bullet",
      "/numbered": "numbered",
      "/checklist": "checklist",
      "/code": "code",
      "/quote": "quote",
      "/paragraph": "paragraph",
      "/image": "image",
      "/file": "file",
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

  /**
   * Handle keyboard shortcuts while editing a block
   *
   * Enter: create a new block below current block
   * Backspace: delete the current block if it's empty
   * Tab: increases indentation level of current block
   * Shift + Tab: decreases indentation level of current block
   */
  const handleKeyboardShortcuts = async (event) => {
    // if this user is viewer, do nothing
    if (!canEdit) {
      return;
    }

    // if event key is Enter (not combined with Shift), create a new block directly below current block
    if (event.key === "Enter" && !event.shiftKey) {
      // prevent browser from inserting new line inside current block
      event.preventDefault();

      // create a new block below current block
      await onCreateAfter(block._id);

      // return to stop checking other shortcuts
      return;
    }

    // if event key is Backspace and current block is empty, delete it
    if (event.key === "Backspace" && text.length === 0) {
      event.preventDefault();

      // delete empty block
      await onDeleteEmpty(block._id);

      // return to stop checking other shortcuts
      return;
    }

    // if event key is Tab, increases indentation level of current block
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();

      // update the block content's indent level
      setLocalContent({
        ...localContent,

        // increase indent level of the block
        indentLevel: indentLevel + 1,
      });

      // save new indent level to backend
      await onUpdateIndent(block._id, indentLevel + 1);

      return;
    }

    // if event key is Tab + Shift, decrease indentation level of current block
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();

      // update the block content's indent level
      setLocalContent({
        ...localContent,

        // decrease indent level of the block
        indentLevel: Math.max(indentLevel - 1, 0), // cannot go below 0
      });

      // save new indent level to backend
      await onUpdateIndent(block._id, indentLevel - 1);

      return;
    }
  };

  /**
   * Handle when user uploads a file
   */
  const handleBlockFileUpload = async (event) => {
    // get file from event
    const file = event.target.files?.[0];

    // if file does not exist or user is viewer, do nothing
    if (!file || !canEdit) {
      return;
    }

    // upload file to backend
    const uploadedFile = await onUploadFile(block._id, file);

    // if fails, do nothing
    if (!uploadedFile) {
      return;
    }

    // update React to display uploaded file
    setLocalContent({
      // copy previous content
      ...localContent,
      // add uploaded file
      url: uploadedFile.fileUrl,
      fileName: uploadedFile.fileName,
      fileSize: uploadedFile.fileSize,
      fileType: uploadedFile.fileType,
    });
  };

  /**
   * Handle user input events
   */
  const sharedInputProps = {
    ref: inputRef, // direct pointer to the actual HTML element so that BlockList have access to Block's <textarea> so BlockList can call .focus() as we move keyboard focus when creating/deleting blocks
    onKeyDown: handleKeyboardShortcuts, // user types a keyboard shortcuts (Enter, Tab, Shift + Tab, Backspace)
    onKeyUp: handleCursorChange, // user types a key
    onClick: handleCursorChange, // user clicks somewhere
    onSelect: handleCursorChange, // user highlights a text
    onFocus: handleCursorChange, // input receives keyboard focus
  };

  const renderBlockInput = () => {
    switch (localType) {
      case "heading":
        return (
          <input
            className="block-input block-heading"
            value={text}
            disabled={!canEdit} // disable input for VIEWERS
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Heading"
            {...sharedInputProps} // handle all user keyboard/cursor events
          />
        );

      case "subheading":
        return (
          <input
            className="block-input block-subheading"
            value={text}
            disabled={!canEdit} // disable input for VIEWERS
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Subheading"
            {...sharedInputProps} // handle all user keyboard/cursor events
          />
        );

      case "paragraph":
        return (
          <textarea
            className="block-input"
            value={text}
            disabled={!canEdit}
            onChange={(event) => handleSlashCommand(event.target.value)}
            placeholder="Write something..."
            {...sharedInputProps}
          />
        );

      case "bullet":
        return (
          <div className="bullet-row">
            <span>•</span>
            <input
              className="block-input"
              value={text}
              disabled={!canEdit} // disable input for VIEWERS
              onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
              placeholder="Bullet"
              {...sharedInputProps} // handle all user keyboard/cursor events
            />
          </div>
        );

      case "checklist":
        return (
          <div className="checklist-row">
            <input
              type="checkbox"
              disabled={!canEdit} // disable input for VIEWERS
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
              disabled={!canEdit} // disable input for VIEWERS
              onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
              placeholder="Checklist item"
              {...sharedInputProps} // handle all user keyboard/cursor events
            />
          </div>
        );

      case "code":
        return (
          <textarea
            className="block-input block-code"
            value={text}
            disabled={!canEdit} // disable input for VIEWERS
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Code"
            {...sharedInputProps} // handle all user keyboard/cursor events
          />
        );

      case "quote":
        return (
          <textarea
            className="block-input block-quote"
            value={text}
            disabled={!canEdit} // disable input for VIEWERS
            onChange={(event) => handleSlashCommand(event.target.value)} // when user types something, run handleSlashCommand()
            placeholder="Quote"
            {...sharedInputProps} // handle all user keyboard/cursor events
          />
        );

      case "image":
        return (
          <div className="image-block">
            {/* check if this block has an uploaded image url */}
            {localContent?.url ? (
              <>
                {/* display the uploaded image */}
                <img
                  src={localContent.url} // image url
                  alt={
                    localContent.alt ||
                    localContent.fileName ||
                    "Uploaded image"
                  }
                />

                {canEdit && (
                  <input
                    type="text" // text input
                    value={localContent.alt || ""} // image description
                    onChange={(event) =>
                      // update text whenever user types
                      setLocalContent({
                        ...localContent, // keep other fields: url, filename, etc.
                        alt: event.target.value, // replace only text
                      })
                    }
                    placeholder="Image description" // hint text
                  />
                )}
              </>
            ) : (
              <p>No image uploaded</p> // if no image exists, display this
            )}

            {canEdit && (
              <input
                type="file"
                accept="image/*"
                onChange={handleBlockFileUpload}
              />
            )}
          </div>
        );

      case "file":
        return (
          <div className="file-block">
            {localContent?.url ? ( // check if this block contains file url
              <a
                href={localContent.url} // file url
                target="_blank" // open the file in new browser tab
                rel="noreferrer"
                download // tell browser this should be downloaded instead of navigated to
              >
                {/* display clip icon + filename */}
                📎 {localContent.fileName || "Download file"}
              </a>
            ) : (
              <p>No file uploaded</p> // if no file exists
            )}
            {canEdit && <input type="file" onChange={handleBlockFileUpload} />}
          </div>
        );

      case "numbered":
        return (
          <div className="numbered-row">
            <span className="numbered-marker">{numberedIndex}.</span>

            <input
              className="block-input"
              value={text}
              disabled={!canEdit}
              onChange={(event) => handleSlashCommand(event.target.value)}
              placeholder="Numbered item"
              {...sharedInputProps}
            />
          </div>
        );

      // prevents mispelled block type from making the entire block disappear
      default:
        return (
          <textarea
            className="block-input"
            value={text}
            disabled={!canEdit}
            onChange={(event) => handleSlashCommand(event.target.value)}
            placeholder="Write something..."
            {...sharedInputProps}
          />
        );
    }
  };

  // return UI
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        marginLeft: `${indentLevel * 24}px`, // add indentation to outer block
      }}
      className="block"
    >
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
        {/* Only editors and owners may drag blocks */}
        {canEdit && (
          <button
            className="drag-handle"
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Move block"
          >
            ⋮⋮
          </button>
        )}

        {/* Block-level menu for type, comments, copy, and delete */}
        <BlockToolbar
          blockId={block._id}
          blockType={localType}
          canEdit={canEdit}
          onTypeChange={updateType}
          onComment={onComment}
          onCopy={onCopy}
          onDelete={onDelete}
        />

        {/* Block comment badge */}
        {commentCount > 0 && (
          <button
            type="button"
            className="block-comment-badge"
            onClick={() => onComment(block._id)}
            aria-label={`${commentCount} unresolved comments`} // display number of unresolved comments
          >
            💬 {commentCount}
          </button>
        )}

        {/* Only editors and owners need to see autosave state */}
        {canEdit && (
          <span className="block-save-status">
            {blockSaveStatus === "saving" && "Saving..."}
            {blockSaveStatus === "saved" && "Saved"}
            {blockSaveStatus === "error" && "Save failed"}
          </span>
        )}
      </div>

      {renderBlockInput()}
    </div>
  );
};

export default Block;
