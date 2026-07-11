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
 * - canEdit = boolean check if the current user can edit the page (editor or owner)
 * - remoteCursors = locations of all users' cursors
 * - onDragEnd = a function called after the user finishes dragging a block
 * - onUpdateBlock = a function called to Editor to update a block's content or type
 * - onDeleteBlock = a function called to Editor to delete a block
 * - onCopyBlock = a function called to Editor to copy a block
 * - onComment = a function called to Editor to open Comments Panel for a block
 * - onTypingStarted = a function called to Editor to tell other users this user started typing
 * - onTypingStopped = a function called to Editor to tell other users this user stopped typing
 * - onCursorMoved = a function called to Editor to send this user's cursor position
 */
const BlockList = ({
  blocks,
  canEdit,
  remoteCursors,
  onDragEnd,
  onUpdateBlock,
  onDeleteBlock,
  onCopyBlock,
  onComment,
  onTypingStarted,
  onTypingStopped,
  onCursorMoved,
}) => {
  /**
   * Drag sensors = cursor settings
   * PointerSensor = dragging works using mouse or touch
   * useSensor() allows mutiple sensors combined
   */
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    // DnDContext allows drag and drop for everything inside it
    <DndContext
      sensors={sensors} // tell dnd kit which sensors detect dragging
      collisionDetection={closestCenter} // while dragging, determine which item the dragged block is closest to by comparing the centers of the blocks
      onDragEnd={onDragEnd} // when user releases the mouse, call onDragEnd()
    >
      {/* tell dnd kit the blocks inside can be reordered */}
      <SortableContext
        items={blocks.map((block) => block._id)}
        strategy={verticalListSortingStrategy} // blocks are arranged vertically
      >
        {blocks.map((block) => (
          // render 1 block component
          <Block
            key={block._id}
            block={block}
            canEdit={canEdit}
            remoteCursors={remoteCursors.filter(
              (item) => item.cursor.blockId === block._id,
            )} // pass the cursors that are locating inside this block
            onUpdate={onUpdateBlock}
            onDelete={onDeleteBlock}
            onCopy={onCopyBlock}
            onComment={onComment}
            onTypingStarted={onTypingStarted}
            onTypingStopped={onTypingStopped}
            onCursorMoved={onCursorMoved}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default BlockList;
