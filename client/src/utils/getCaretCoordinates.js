const MIRROR_PROPERTIES = [
  // text direction: left-to-right or right-to-left
  "direction",
  // determines whether width includes padding and borders
  "boxSizing",
  // width of the element
  "width",
  // height of the element
  "height",
  // horizontal overflow
  "overflowX",
  // vertical overflow
  "overflowY",
  // border wifths affect where the text begins
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  // padding affects where the text begins
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  // font appearance and dimensions
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  // text alignment and formatting
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  // spacing between characters and words
  "letterSpacing",
  "wordSpacing",
  // tab size affects how far the text is indented
  "tabSize",
];

/**
 * Measure the pixel position of a text caret inside an input or textarea
 * @param {HTMLElement} element - the input or textarea element
 * @param {number} position - the position of the caret
 * @returns {Object} - the coordinates of the caret
 */
export function getCaretCoordinates(element, position) {
  // if the element is not provided, return default coordinates
  if (!element) {
    return { top: 0, left: 0, height: 16 };
  }

  // ensure the position is within the bounds of the element
  // prevents a position beyond the end of the text
  // prevents negative positions
  const safePosition = Math.max(
    0,
    Math.min(position, element.value?.length ?? 0),
  );

  // check if the element is an input or textarea
  const isInput = element.nodeName === "INPUT";

  // create a mirror
  // mirror = a temporary, invisible <div> that copies the input's appearance so the browser can calculate where a caret would be
  // flow: real input -> create invisible mirror with identical styling -> place marker at the calculated position -> measure the marker's pixel position -> draw remote caret there
  const mirror = document.createElement("div");

  // store a direct reference to the mirror's style object
  const mirrorStyle = mirror.style;

  // read the final styles applied to the real input which includes all CSS rules
  const computedStyle = window.getComputedStyle(element);

  // copy all relevant styles from the real input to the mirror to ensure correct font size, line height, padding, text wrapping, letter spacing, etc.
  MIRROR_PROPERTIES.forEach((property) => {
    mirrorStyle[property] = computedStyle[property];
  });

  // remove mirror from normal page layout flow by positioning it off-screen
  mirrorStyle.position = "absolute";

  // hide the mirror from the user while still allowing the browser to measure it
  mirrorStyle.visibility = "hidden";

  // single line inputs (like search bars) use "pre" (no wrapping) for better precision while multi-line inputs (like textareas) use "pre-wrap" (with wrapping) for more realistic measurements
  mirrorStyle.whiteSpace = isInput ? "pre" : "pre-wrap";

  // ensure the mirror can handle long words by wrapping or truncating as needed
  mirrorStyle.wordWrap = isInput ? "normal" : "break-word";

  // prevent content outside the mirror's dimensions from being displayed
  mirrorStyle.overflow = "hidden";

  // match the real element's full rendered width including padding and borders
  mirrorStyle.width = `${element.offsetWidth}px`;

  // read the current text from real input
  const value = element.value ?? "";

  // put every character before the caret into the mirror
  mirror.textContent = value.substring(0, safePosition);

  // handle multi-line inputs by adding a space if the last character is a newline
  if (!isInput && value.endsWith("\n")) {
    mirror.textContent += " ";
  }

  // create a marker element to represent the caret position
  // its offsetTop and offsetLeft will represent the caret's pixel position
  const marker = document.createElement("span");

  // add all text after the caret into the marker
  // if caret is at the end of the text, add a zero-width space ("\u200b") to keep the marker visible
  // zero-width space is a non-printing character that takes up no space but keeps the marker visible
  marker.textContent = value.substring(safePosition) || "\u200b";

  // add the marker to the mirror
  mirror.appendChild(marker);

  // add the mirror to the document body
  document.body.appendChild(mirror);

  // determine the caret's height based on the font size and line height
  const fontSize = parseFloat(computedStyle.fontSize) || 16;
  let height = parseFloat(computedStyle.lineHeight);

  // if the line height is not a number, use the font size * 1.5 as a fallback
  if (Number.isNaN(height)) {
    height = fontSize * 1.5;
  }
  // if the line height is less than 4, use the font size * the line height as the height
  else if (height < 4) {
    height = fontSize * height;
  }

  // measure the marker's location inside the mirror
  const coordinates = {
    top: marker.offsetTop, // vertical position
    left: marker.offsetLeft, // horizontal position
    height, // height of the caret
  };

  // remove the mirror from the document body after measurements are complete
  document.body.removeChild(mirror);

  // return the coordinates of the caret
  return coordinates;
}
