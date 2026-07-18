/**
 * Small text OT helpers for same-block collaborative editing.
 * Supports insert/delete operations with basic transformation for concurrency.
 */

export function applyTextOperation(text, op) {
  if (!op) {
    return text;
  }

  if (op.type === "insert") {
    const position = Math.max(0, Math.min(op.position, text.length));
    return text.slice(0, position) + op.text + text.slice(position);
  }

  if (op.type === "delete") {
    const position = Math.max(0, Math.min(op.position, text.length));
    const length = Math.min(op.length, text.length - position);
    return text.slice(0, position) + text.slice(position + length);
  }

  return text;
}

export function computeTextOperations(prevText, nextText) {
  if (prevText === nextText) {
    return [];
  }

  let prefix = 0;
  while (
    prefix < prevText.length &&
    prefix < nextText.length &&
    prevText[prefix] === nextText[prefix]
  ) {
    prefix += 1;
  }

  let prevSuffix = prevText.length;
  let nextSuffix = nextText.length;
  while (
    prevSuffix > prefix &&
    nextSuffix > prefix &&
    prevText[prevSuffix - 1] === nextText[nextSuffix - 1]
  ) {
    prevSuffix -= 1;
    nextSuffix -= 1;
  }

  const operations = [];
  const deletedLength = prevSuffix - prefix;
  const insertedText = nextText.slice(prefix, nextSuffix);

  if (deletedLength > 0) {
    operations.push({
      type: "delete",
      position: prefix,
      length: deletedLength,
    });
  }

  if (insertedText.length > 0) {
    operations.push({
      type: "insert",
      position: prefix,
      text: insertedText,
    });
  }

  return operations;
}

/**
 * Transform `op` so it can be applied after `against` was already applied elsewhere.
 */
export function transformOperation(op, against, priority = false) {
  if (!op || !against) {
    return op;
  }

  if (against.type === "insert") {
    const insertLength = against.text.length;

    if (op.type === "insert") {
      if (
        op.position > against.position ||
        (op.position === against.position && !priority)
      ) {
        return { ...op, position: op.position + insertLength };
      }

      return op;
    }

    if (op.type === "delete" && op.position >= against.position) {
      return { ...op, position: op.position + insertLength };
    }

    return op;
  }

  if (against.type === "delete") {
    const deleteStart = against.position;
    const deleteEnd = against.position + against.length;

    if (op.type === "insert") {
      if (op.position > deleteStart) {
        if (op.position >= deleteEnd) {
          return { ...op, position: op.position - against.length };
        }

        return { ...op, position: deleteStart };
      }

      return op;
    }

    if (op.type === "delete") {
      const opStart = op.position;
      const opEnd = op.position + op.length;

      if (opEnd <= deleteStart || opStart >= deleteEnd) {
        if (opStart >= deleteEnd) {
          return { ...op, position: opStart - against.length };
        }

        return op;
      }

      if (opStart <= deleteStart && opEnd >= deleteEnd) {
        return { ...op, length: op.length - against.length };
      }

      if (opStart < deleteStart) {
        return {
          type: "delete",
          position: opStart,
          length: deleteStart - opStart,
        };
      }

      if (opEnd > deleteEnd) {
        return {
          type: "delete",
          position: deleteStart,
          length: opEnd - deleteEnd,
        };
      }

      return null;
    }
  }

  return op;
}

export function adjustCursorAfterOperation(cursor, op) {
  if (!op) {
    return cursor;
  }

  if (op.type === "insert") {
    if (cursor >= op.position) {
      return cursor + op.text.length;
    }

    return cursor;
  }

  if (op.type === "delete") {
    if (cursor > op.position + op.length) {
      return cursor - op.length;
    }

    if (cursor > op.position) {
      return op.position;
    }

    return cursor;
  }

  return cursor;
}
