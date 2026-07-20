/**
 * Small text operational transformation (OT) helpers for same-block collaborative editing
 * Allows multiple users to edit the same text block concurrently and resolve conflicts
 * Supports insert/delete operations with basic transformation for concurrency + adjust cursor position after operations
 *
 * @param text - The original text to apply the operation to
 * @param op - The operation to apply to the text
 * @returns - The text after the operation has been applied
 *
 * Insert operation: { type: "insert", position: 0, text: "Hello" }
 * Delete operation: { type: "delete", position: 0, length: 5 }
 *
 */
export function applyTextOperation(text, op) {
  // if not operation is provided, return the original text
  if (!op) {
    return text;
  }

  // handle insert operation
  if (op.type === "insert") {
    // ensure insert position is within bounds
    const position = Math.max(0, Math.min(op.position, text.length));
    // insert the text at the specified position
    return text.slice(0, position) + op.text + text.slice(position);
  }

  // handle delete operation
  if (op.type === "delete") {
    // ensure delete position is within bounds
    const position = Math.max(0, Math.min(op.position, text.length));
    // ensure delete length is within bounds
    const length = Math.min(op.length, text.length - position);
    // delete the text at the specified position and length
    return text.slice(0, position) + text.slice(position + length);
  }

  // if the operation is not a valid insert or delete operation, return the original text
  return text;
}

/**
 *
 * @param prevText - Text before the operation
 * @param nextText - Text after the operation
 * @returns - The operations to apply to the text
 *
 * Example:
 * "Hello" -> "Hello!" -> [{ type: "insert", position: 5, text: "!" }]
 * "Hello" -> "Hell" -> [{ type: "delete", position: 4, length: 1 }]
 */
export function computeTextOperations(prevText, nextText) {
  // if the text is the same, no operations are needed
  if (prevText === nextText) {
    return [];
  }

  // find prefix length of the two texts
  let prefix = 0;
  while (
    prefix < prevText.length &&
    prefix < nextText.length &&
    prevText[prefix] === nextText[prefix]
  ) {
    prefix += 1;
  }

  // find suffix length of the previous text
  let prevSuffix = prevText.length;
  // find suffix length of the next text
  let nextSuffix = nextText.length;
  // find the suffix length that is the same in the previous and next texts
  while (
    prevSuffix > prefix &&
    nextSuffix > prefix &&
    prevText[prevSuffix - 1] === nextText[nextSuffix - 1]
  ) {
    prevSuffix -= 1;
    nextSuffix -= 1;
  }

  // compute the operations to apply to the text
  const operations = [];
  // compute the length of the text that was deleted
  const deletedLength = prevSuffix - prefix;
  // compute the text that was inserted
  const insertedText = nextText.slice(prefix, nextSuffix);

  // if text was deleted, add a delete operation
  if (deletedLength > 0) {
    operations.push({
      type: "delete",
      position: prefix,
      length: deletedLength,
    });
  }

  // if text was inserted, add an insert operation
  if (insertedText.length > 0) {
    operations.push({
      type: "insert",
      position: prefix,
      text: insertedText,
    });
  }

  // return the operations to apply that turn prevText into nextText
  return operations;
}

/**
 * Transform `op` so it can be applied after `against` was already applied elsewhere
 * Example:
 * If both users start with: "Milu"
 * User A inserts "Stupid" at position 0: "Stupid Milu"
 * User B inserts "Hungry" at position 0: "Hungry Milu"
 * Since User A's operation is applied first, User B's operation might need to move after User's A inserted text
 *
 * @param op - The operation to transform
 * @param against - The operation that was already applied / concurrent operation to op
 * @param priority - Whether the operation should be applied before or after the against operation
 * @returns - The transformed operation, unchanged operation, or null when the operation no longer needs to be applied
 */
export function transformOperation(op, against, priority = false) {
  // if no operation or against operation is provided, return the original operation
  if (!op || !against) {
    return op;
  }

  // if the against operation is an insert operation
  if (against.type === "insert") {
    // get the length of the inserted text
    const insertLength = against.text.length;

    // if the op operation is an insert operation
    if (op.type === "insert") {
      // move this operation to the right when: 1/ its position is after the against insertion position or 2/ both insertions are at the same position and this operation does not have priority
      if (
        op.position > against.position ||
        (op.position === against.position && !priority)
      ) {
        return { ...op, position: op.position + insertLength };
      }

      // this operation happens before the against operation, so no transformation is needed
      return op;
    }

    // if the op operation is a delete operation and its position is after the against insertion position, move this operation to the right
    if (op.type === "delete" && op.position >= against.position) {
      return { ...op, position: op.position + insertLength };
    }

    // if the op operation is delete operation and it happens before the insertion, return the original operation because it will be applied after the against operation
    return op;
  }

  // if the against operation is a delete operation
  if (against.type === "delete") {
    // get the start and end positions of the against delete operation
    const deleteStart = against.position;
    const deleteEnd = against.position + against.length;

    // if the op operation is an insert operation
    if (op.type === "insert") {
      // only transfom insertion located after the delete begins
      if (op.position > deleteStart) {
        // if the insertion is after the deleted range, shift if left by the number of deleted characters
        if (op.position >= deleteEnd) {
          return { ...op, position: op.position - against.length };
        }

        // if the insertion is inside the deleted range, move it to the beginning of that deleted range
        return { ...op, position: deleteStart };
      }

      // insertion occurs before the delete begins, so no transformation is needed
      return op;
    }

    // if the op operation is a delete operation
    if (op.type === "delete") {
      // get the start and end positions of the op delete operation
      const opStart = op.position;
      const opEnd = op.position + op.length;

      // if the two deleted ranges do not overlap
      if (opEnd <= deleteStart || opStart >= deleteEnd) {
        // if this delete originally starts after the other deletion, shift position left by the number of deleted characters
        if (opStart >= deleteEnd) {
          return { ...op, position: opStart - against.length };
        }

        // if this delete originally starts before the other deletion, no transformation is needed
        return op;
      }

      // if the two deleted ranges overlap
      if (opStart <= deleteStart && opEnd >= deleteEnd) {
        // if this delete originally covers the other deletion, shorten its length by the number of deleted characters
        return { ...op, length: op.length - against.length };
      }

      // this delete overlaps the beginning of the other deletion, so create a new delete operation that starts at the beginning of the other deletion
      if (opStart < deleteStart) {
        return {
          type: "delete",
          position: opStart,
          length: deleteStart - opStart,
        };
      }

      // this delete overlaps the end of the other deletion, so create a new delete operation that starts at the end of the other deletion
      if (opEnd > deleteEnd) {
        return {
          type: "delete",
          position: deleteStart,
          length: opEnd - deleteEnd,
        };
      }

      // if this delete is entirely inside the other deletion, there's nothing left for this op to delete, so return null
      return null;
    }
  }

  // return unknwon or unaffected operation
  return op;
}

/**
 * Update cursor position after a text is applied
 * @param cursor - The cursor position before the operation
 * @param op - The operation to apply to the text
 * @returns - The cursor position after the operation
 *
 * Example: Teddy's cursor is at position 5, and Ducko inserts 4 characters before it. Teddy's cursor should move to position 9
 */
export function adjustCursorAfterOperation(cursor, op) {
  // if no operation is provided, return the original cursor position
  if (!op) {
    return cursor;
  }

  // if the operation is an insert operation
  if (op.type === "insert") {
    // if the cursor is after or at the insertion position, move it to the right by the length of the inserted text
    if (cursor >= op.position) {
      return cursor + op.text.length;
    }

    // if the cursor is before the insertion position, no transformation is needed
    return cursor;
  }

  // if the operation is a delete operation
  if (op.type === "delete") {
    // if the cursor is after the deleted range, move it to the left by the length of the deleted text
    if (cursor > op.position + op.length) {
      return cursor - op.length;
    }

    // if the cursor is inside the deleted range, move it to the beginning of the deleted range
    if (cursor > op.position) {
      return op.position;
    }

    // if the cursor is before the deleted range, no transformation is needed
    return cursor;
  }

  // if the operation is not a valid insert or delete operation, return the original cursor position
  return cursor;
}
