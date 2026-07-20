import { useLayoutEffect, useMemo, useState } from "react";
import { getCaretCoordinates } from "../../utils/getCaretCoordinates";
import { getUserColor, getUserInitial } from "../../utils/userColor";

// get the user id from the user object
// user ID can be stored as _id or .id or userId
// ._id: MongoDb user object, .id: authenticated/frontend user object, .userId: presence user object
const getUserId = (user) => user?._id || user?.id || user?.userId;

/**
 * Calculate where a remote collaborator's text cursor should be displayed relative to the block it is in
 * @param {HTMLElement} inputElement - the actual input of textarea containing the text
 * @param {HTMLElement} shellElement - the outer block container where remote carets are rendered
 * @param {number} position - character position of the remote cursor in the text
 * @returns {Object} - caret's top position, left position and height
 */
function measureCaretPosition(inputElement, shellElement, position) {
  // if the input or shell element is not provided, return null
  if (!inputElement || !shellElement) {
    return null;
  }

  // get pixel coordinates of the given character position inside textarea
  const coordinates = getCaretCoordinates(inputElement, position); // getCaretCoordinates() returns { top: number, left: number, height: number } of the character
  // get the input's position relative to the browser viewport
  const inputRect = inputElement.getBoundingClientRect();
  // get the shell's position relative to the browser viewport
  const shellRect = shellElement.getBoundingClientRect();
  // get the input's final browser-computed CSS styles
  const computedStyle = window.getComputedStyle(inputElement);
  // get the top border width of the input
  const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
  // get the left border width of the input
  const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;

  return {
    // calculate the top position of the caret relative to the shell
    top:
      inputRect.top -
      shellRect.top +
      borderTop +
      coordinates.top -
      inputElement.scrollTop,
    // calculate the left position of the caret relative to the shell
    left:
      inputRect.left -
      shellRect.left +
      borderLeft +
      coordinates.left -
      inputElement.scrollLeft,
    // the height of the caret is the height of the character at the given position: same height as the character
    height: coordinates.height,
  };
}

/**
 * Convert the list of remote cursors data into a list of caret objects
 * @param {*} inputElement
 * @param {*} shellElement
 * @param {*} remoteCursors
 * @returns
 * Each return object contains: pixel position of the caret, user ID, username, color, user initial, and unique React key for the caret element
 */
function buildCaretPositions(inputElement, shellElement, remoteCursors) {
  // if the input or shell element is not provided, or there are no remote cursors, return an empty array
  if (!inputElement || !shellElement || remoteCursors.length === 0) {
    return [];
  }

  return (
    remoteCursors
      .map((remoteCursor) => {
        // calculate the position of the caret relative to the shell
        // if cursorPosition is not provided, use 0
        const position = measureCaretPosition(
          inputElement,
          shellElement,
          remoteCursor.cursor?.cursorPosition ?? 0,
        );

        // skip the caret if the position cannot be calculated
        if (!position) {
          return null;
        }

        // get the user object from the remote cursor
        const user = remoteCursor.user;
        // get the user ID from the user object
        const userId = getUserId(user);

        return {
          // create a React key for user's caret inside the block
          key: `${userId}-${remoteCursor.cursor?.blockId}`,
          userId,
          username: user?.username,
          // assign a color to the user based on their user ID
          color: getUserColor(userId),
          // get the user's initial from their username
          initial: getUserInitial(user?.username),
          // return the position of the caret
          ...position,
        };
      })
      // filter out any null entries when a cursor position cannot be calculated
      .filter(Boolean)
  );
}

/**
 * Renders remote collaborator carets (blinking text cursor + initial bubble)
 * @param {HTMLElement} shellElement - the outer block container where remote carets are rendered
 * @param {HTMLElement} inputElement - the actual input of textarea containing the text
 * @param {Array} remoteCursors - the list of Socket.io remote cursors data
 * @param {string} text - the text of the textarea
 * @returns {React.ReactNode} - the remote carets layer
 */
const RemoteCarets = ({
  shellElement,
  inputElement,
  remoteCursors = [],
  text = "",
}) => {
  // state to track the layout version of the remote carets
  // changing layoutVersion triggers a re-render of the remote carets even though the caret positions may not have changed but the following changes: browser becomes narrow, textwraps to another line, etc.
  const [layoutVersion, setLayoutVersion] = useState(0);

  // calculate all remote caret positions
  // useMemo prevents unnecessary re-renders when the input or shell element is not changed
  const caretPositions = useMemo(() => {
    // re-measure when layout shifts or wrapped text changes
    void layoutVersion;
    void text;

    return buildCaretPositions(inputElement, shellElement, remoteCursors);
  }, [inputElement, remoteCursors, shellElement, text, layoutVersion]);

  // listen for layout shifts or wrapped text changes that may affect the remote caret positions
  // useLayoutEffect calculates new remote caret positions before the browser has a chance to paint the changes
  useLayoutEffect(() => {
    // if the input or shell element is not provided, return undefined
    if (!inputElement || !shellElement) {
      return undefined;
    }

    // function to request a layout update
    // increment the layout version to trigger a re-render of the remote carets
    const requestLayoutUpdate = () => {
      setLayoutVersion((currentVersion) => currentVersion + 1);
    };

    // recalculate the remote caret positions when user scrolls inside the input
    inputElement.addEventListener("scroll", requestLayoutUpdate);
    // recalculate the remote caret positions when user resizes the window
    window.addEventListener("resize", requestLayoutUpdate);

    // create a resize observer to recalculate the remote caret positions when the input or shell element is resized
    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(requestLayoutUpdate);
      // observe the input element for resize events
      resizeObserver.observe(inputElement);
      // observe the shell element for resize events
      resizeObserver.observe(shellElement);
    }

    // cleanup function to remove the event listeners and disconnect the resize observer
    // prevents memory leaks and duplicate event listeners
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
            // position the caret at the measure text character location
            top: `${caret.top}px`,
            left: `${caret.left}px`,
            "--remote-caret-color": caret.color,
          }}
        >
          {/* vertical blinking line */}
          <span
            className="remote-caret-line"
            style={{ height: `${caret.height}px` }}
            title={caret.username}
          />
          {/* colored label with user's initial */}
          <span className="remote-caret-bubble">{caret.initial}</span>
        </div>
      ))}
    </div>
  );
};

export default RemoteCarets;
