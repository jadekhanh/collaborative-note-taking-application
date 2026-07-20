// a set of heading block types: heading and subheading
const HEADING_TYPES = new Set(["heading", "subheading"]);

// check if the block type is a heading block: either heading or subheading
export const isHeadingBlock = (type) => HEADING_TYPES.has(type);

// get the heading level of the block: 1 for heading, 2 for subheading, 0 for other block types
export const getHeadingLevel = (type) => {
  if (type === "heading") {
    return 1;
  }

  if (type === "subheading") {
    return 2;
  }

  return 0;
};

/**
 * Get block IDs that are hidden because a parent heading is collapsed
 * @param {Array} blocks - the blocks to check
 * @param {Array} collapsedHeadingIds - the IDs of the collapsed headings
 */
export const getHiddenBlockIds = (blocks, collapsedHeadingIds = []) => {
  // a set of block IDs that are hidden
  const hidden = new Set();
  // a set of collapsed heading IDs
  const collapsedSet = new Set(collapsedHeadingIds);

  // check every block in the blocks array
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    // if the block is not a heading block or is not a collapsed heading, skip it
    if (!isHeadingBlock(block.type) || !collapsedSet.has(block._id)) {
      continue;
    }

    // get the heading level of the collapsed heading block
    const headingLevel = getHeadingLevel(block.type);

    // check every block after the current collapsed heading block
    for (let nextIndex = index + 1; nextIndex < blocks.length; nextIndex += 1) {
      const nextBlock = blocks[nextIndex];

      // if the next block is a heading block and its heading level is less than or equal to the current block's heading level, break the loop
      // Example: suppose the collapsed heading is Drake's Song - level 1, then everything after it belongs to Drake's Song until another level 1 heading appears
      if (
        isHeadingBlock(nextBlock.type) &&
        getHeadingLevel(nextBlock.type) <= headingLevel
      ) {
        break;
      }

      // every block after the collapsed heading is hidden until the stopping condition above is met
      // add the block ID to the hidden set
      hidden.add(nextBlock._id);
    }
  }

  return hidden;
};

/**
 * Get all blocks that are visible
 */
export const getVisibleBlocks = (blocks, collapsedHeadingIds = []) => {
  // get the block IDs that are hidden
  const hidden = getHiddenBlockIds(blocks, collapsedHeadingIds);
  // return all blocks that are not in the hidden set, which are all the visible blocks
  return blocks.filter((block) => !hidden.has(block._id));
};

/**
 * Check if a heading block has any content underneath it that could be collapsed
 * This is to decide whether to show the collapse arrow for the heading block
 * @param {Array} blocks - the blocks to check
 * @param {number} blockIndex - the index of the block to check
 */
export const headingHasCollapsibleContent = (blocks, blockIndex) => {
  // get the block
  const block = blocks[blockIndex];

  // if the block is not a heading block, return false
  if (!isHeadingBlock(block?.type)) {
    return false;
  }

  // get the heading level of the heading block
  const headingLevel = getHeadingLevel(block.type);

  // check the next block
  const nextBlock = blocks[blockIndex + 1];

  // if the next block is a heading block and its heading level is less than or equal to the current block's heading level, return false
  // Example: suppose the collapsed heading is Drake's Song - level 1, then everything after it belongs to Drake's Song until another level 1 heading appears
  if (
    isHeadingBlock(nextBlock.type) &&
    getHeadingLevel(nextBlock.type) <= headingLevel
  ) {
    return false;
  }

  // if the next block is not a same-level or higher-level heading block, return true
  return true;
};
