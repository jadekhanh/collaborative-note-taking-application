import { useLayoutEffect, useMemo, useState } from "react";
import { getCaretCoordinates } from "../../utils/getCaretCoordinates";
import { getUserColor, getUserInitial } from "../../utils/userColor";

const getUserId = (user) => user?._id || user?.id || user?.userId;

function measureCaretPosition(inputElement, shellElement, position) {
  if (!inputElement || !shellElement) {
    return null;
  }

  const coordinates = getCaretCoordinates(inputElement, position);
  const inputRect = inputElement.getBoundingClientRect();
  const shellRect = shellElement.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(inputElement);
  const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
  const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;

  return {
    top:
      inputRect.top -
      shellRect.top +
      borderTop +
      coordinates.top -
      inputElement.scrollTop,
    left:
      inputRect.left -
      shellRect.left +
      borderLeft +
      coordinates.left -
      inputElement.scrollLeft,
    height: coordinates.height,
  };
}

function buildCaretPositions(inputElement, shellElement, remoteCursors) {
  if (!inputElement || !shellElement || remoteCursors.length === 0) {
    return [];
  }

  return remoteCursors
    .map((remoteCursor) => {
      const position = measureCaretPosition(
        inputElement,
        shellElement,
        remoteCursor.cursor?.cursorPosition ?? 0,
      );

      if (!position) {
        return null;
      }

      const user = remoteCursor.user;
      const userId = getUserId(user);

      return {
        key: `${userId}-${remoteCursor.cursor?.blockId}`,
        userId,
        username: user?.username,
        color: getUserColor(userId),
        initial: getUserInitial(user?.username),
        ...position,
      };
    })
    .filter(Boolean);
}

/**
 * Renders remote collaborator carets (blinking text cursor + initial bubble).
 * In collaborative editing UIs these are usually called remote carets or collaborative carets.
 */
const RemoteCarets = ({
  shellElement,
  inputElement,
  remoteCursors = [],
  text = "",
}) => {
  const [layoutVersion, setLayoutVersion] = useState(0);

  const caretPositions = useMemo(() => {
    // Re-measure when layout shifts or wrapped text changes.
    void layoutVersion;
    void text;

    return buildCaretPositions(inputElement, shellElement, remoteCursors);
  }, [inputElement, remoteCursors, shellElement, text, layoutVersion]);

  useLayoutEffect(() => {
    if (!inputElement || !shellElement) {
      return undefined;
    }

    const requestLayoutUpdate = () => {
      setLayoutVersion((currentVersion) => currentVersion + 1);
    };

    inputElement.addEventListener("scroll", requestLayoutUpdate);
    window.addEventListener("resize", requestLayoutUpdate);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(requestLayoutUpdate);
      resizeObserver.observe(inputElement);
      resizeObserver.observe(shellElement);
    }

    return () => {
      inputElement.removeEventListener("scroll", requestLayoutUpdate);
      window.removeEventListener("resize", requestLayoutUpdate);
      resizeObserver?.disconnect();
    };
  }, [inputElement, shellElement]);

  return (
    <div className="remote-carets-layer" aria-hidden="true">
      {caretPositions.map((caret) => (
        <div
          key={caret.key}
          className="remote-caret"
          style={{
            top: `${caret.top}px`,
            left: `${caret.left}px`,
            "--remote-caret-color": caret.color,
          }}
        >
          <span
            className="remote-caret-line"
            style={{ height: `${caret.height}px` }}
            title={caret.username}
          />
          <span className="remote-caret-bubble">{caret.initial}</span>
        </div>
      ))}
    </div>
  );
};

export default RemoteCarets;
