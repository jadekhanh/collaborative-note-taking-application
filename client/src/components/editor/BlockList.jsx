import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRef } from "react";
import {
  getVisibleBlocks,
  headingHasCollapsibleContent,
} from "../../utils/blockCollapse";
import Block from "./Block";

/**
 * A container for all blocks inside a page
 * Responsibilities:
 * Displays every block inside the current page
 * Enable drag and drop reodering for the whole list
 * Pass block editing functions (delete, typing, cursor movement, etc.) to each block
 *
 * @params
 * - blocks = list of all blocks inside the current page
 * - collapsedHeadingIds = list of heading block IDs that are collapsed
 * - canEdit = boolean check if the current user can edit the page (editor or owner)
 * - commentThreads = comment threads inside the page
 * - remoteCursors = locations of all users' cursors
 * - onDragEnd = a function called after the user finishes dragging a block
 * - onUpdateBlock = a function called to Editor to update a block's content or type
 * - onDeleteBlock = a function called to Editor to delete a block
 * - onCopyBlock = a function called to Editor to copy a block
 * - onCreateBlockAfter = a function called to Editor to create a block after a block
 * - onUpdateIndent = a function called to Editor to update a block's indent level
 * - onComment = a function called to Editor to open Comments Panel for a block
 * - onTypingStarted = a function called to Editor to tell other users this user started typing
 * - onTypingStopped = a function called to Editor to tell other users this user stopped typing
 * - onCursorMoved = a function called to Editor to send this user's cursor position
 * - onContentLive = a function called to Editor to broadcast immediate block metadata updates
 * - onTextOp = a function called to Editor to broadcast OT text operations
 * - onSyncBlock = a function called to Editor to keep block state aligned locally
 * - onRegisterTextOpHandler = a function called to Editor to register OT handlers
 * - onUploadFile = a function called to Editor to upload a file to block
 * - onToggleHeadingCollapse = a function called to Editor to toggle the collapse state of a heading block
 */
const BlockList = ({
  blocks = [],
  collapsedHeadingIds = [],
  canEdit,
  commentThreads = [],
  remoteCursors = [],
  onDragEnd,
  onUpdateBlock,
  onDeleteBlock,
  onCopyBlock,
  onCreateBlockAfter,
  onUpdateIndent,
  onComment,
  onTypingStarted,
  onTypingStopped,
  onCursorMoved,
  onContentLive,
  onTextOp,
  onSyncBlock,
  onRegisterTextOpHandler,
  onUploadFile,
  onToggleHeadingCollapse,
}) => {
  /**
   * Drag sensors = cursor settings
   * PointerSensor = dragging works using mouse or touch
   * useSensor() allows mutiple sensors combined
   */
  const sensors = useSensors(useSensor(PointerSensor));

  /**
   * Stores each block's input element so keyboard shortcuts can move focus between blocks
   * Example:
   * blockInputRefs.current = {
   *      "block1": <textarea>
   *      "block2": <textarea>
   *      "block3": <textarea>
   * }
   */
  const blockInputRefs = useRef({});

  /**
   * Move keyboard focus to a block and place the blinking cursor at the end
   */
  const focusBlock = (blockId) => {
    // wait until React finishes updating the page before trying to focus the input
    requestAnimationFrame(() => {
      // look up this block's input element from ref's object
      const input = blockInputRefs.current[blockId];

      // if input does not exist, do nothing
      if (!input) {
        return;
      }

      // move keyboard focus to this textbox
      input.focus();

      // get number of chars inside textbox
      const textLen = input.value?.length || 0;

      // move the blinking cursor to the end of text
      // E.g.: Drake|
      input.setSelectionRange(textLen, textLen);
    });
  };

  /**
   * Create a new block underneath current block and immediately move keyboard focus into it
   */
  const handleCreateBlockAfter = async (blockId) => {
    // ask Editor to create a new Block
    const newBlock = await onCreateBlockAfter(blockId);

    // move keyboard focus to new block
    if (newBlock) {
      focusBlock(newBlock._id);
    }
  };

  /**
   * Delete an empty block and move focus to the previous block
   */
  const handleDeleteEmptyBlock = async (blockId) => {
    // find block's position inside blocks list
    const currentIndex = blocks.findIndex((block) => block._id === blockId);

    // if block cannot be found, do nothing
    if (currentIndex === -1) {
      return;
    }

    // get the block previous to this one
    const previousBlock = blocks[currentIndex - 1];

    // if current block is the only block, keep it
    // page always has at least 1 block
    if (!previousBlock && blocks.length === 1) {
      return;
    }

    // delete current block
    await onDeleteBlock(blockId);

    // move focus to previous block
    if (previousBlock) {
      focusBlock(previousBlock._id);
    }
  };

  const visibleBlocks = getVisibleBlocks(blocks, collapsedHeadingIds);

  return (
    // DnDContext allows drag and drop for everything inside it
    <DndContext
      sensors={sensors} // tell dnd kit which sensors detect dragging
      collisionDetection={closestCenter} // while dragging, determine which item the dragged block is closest to by comparing the centers of the blocks
      onDragEnd={onDragEnd} // when user releases the mouse, call onDragEnd()
    >
      {/* tell dnd kit the blocks inside can be reordered */}
      <SortableContext
        items={visibleBlocks.map((block) => block._id)}
        strategy={verticalListSortingStrategy} // blocks are arranged vertically
      >
        {visibleBlocks.map((block) => {
          const blockIndex = blocks.findIndex(
            (currentBlock) => currentBlock._id === block._id,
          );
          /**
           * Calculate the number of this block if this block is a numbered block
           */
          let numberedIndex = null;
          if (block.type === "numbered") {
            // only calculate numbers for numbered-list blocks
            numberedIndex = 0;
            for (let index = blockIndex; index >= 0; index--) {
              // starting from current block position within the block list, walk backward through the blocks
              if (blocks[index].type !== "numbered") {
                // stop counting as soon as we reach a block that is not a numbered list
                break;
              }
              numberedIndex++; // increase the number index within the numbered-list blocks
            }
          }
          /**
           * Calculate how many comments this block has
           */
          let blockCommentCount = 0;
          // loop every comment thread
          for (const thread of commentThreads) {
            // get this thread's block id
            let threadBlockId = thread.block?._id || thread.block;
            if (threadBlockId === block._id && !thread.isResolved) {
              blockCommentCount++;
            }
          }
          return (
            <Block
              key={block._id}
              block={block}
              commentCount={blockCommentCount}
              numberedIndex={numberedIndex}
              canEdit={canEdit}
              isHeadingCollapsible={headingHasCollapsibleContent(
                blocks,
                blockIndex,
              )}
              isHeadingCollapsed={collapsedHeadingIds.includes(block._id)}
              onToggleHeadingCollapse={onToggleHeadingCollapse}
              remoteCursors={remoteCursors.filter(
                (item) => item.cursor.blockId === block._id,
              )}
              inputRef={(element) => {
                if (element) {
                  blockInputRefs.current[block._id] = element;
                } else {
                  delete blockInputRefs.current[block._id];
                }
              }}
              onUpdate={onUpdateBlock}
              onDelete={onDeleteBlock}
              onCopy={onCopyBlock}
              onUploadFile={onUploadFile}
              onCreateAfter={handleCreateBlockAfter}
              onDeleteEmpty={handleDeleteEmptyBlock}
              onUpdateIndent={onUpdateIndent}
              onComment={onComment}
              onTypingStarted={onTypingStarted}
              onTypingStopped={onTypingStopped}
              onCursorMoved={onCursorMoved}
              onContentLive={onContentLive}
              onTextOp={onTextOp}
              onSyncBlock={onSyncBlock}
              onRegisterTextOpHandler={onRegisterTextOpHandler}
            />
          );
        })}
      </SortableContext>
    </DndContext>
  );
};

export default BlockList;
