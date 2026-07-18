const MIRROR_PROPERTIES = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
];

/**
 * Measure the pixel position of a text caret inside an input or textarea.
 */
export function getCaretCoordinates(element, position) {
  if (!element) {
    return { top: 0, left: 0, height: 16 };
  }

  const safePosition = Math.max(
    0,
    Math.min(position, element.value?.length ?? 0),
  );
  const isInput = element.nodeName === "INPUT";
  const mirror = document.createElement("div");
  const mirrorStyle = mirror.style;
  const computedStyle = window.getComputedStyle(element);

  MIRROR_PROPERTIES.forEach((property) => {
    mirrorStyle[property] = computedStyle[property];
  });

  mirrorStyle.position = "absolute";
  mirrorStyle.visibility = "hidden";
  mirrorStyle.whiteSpace = isInput ? "pre" : "pre-wrap";
  mirrorStyle.wordWrap = isInput ? "normal" : "break-word";
  mirrorStyle.overflow = "hidden";
  mirrorStyle.width = `${element.offsetWidth}px`;

  const value = element.value ?? "";
  mirror.textContent = value.substring(0, safePosition);

  if (!isInput && value.endsWith("\n")) {
    mirror.textContent += " ";
  }

  const marker = document.createElement("span");
  marker.textContent = value.substring(safePosition) || "\u200b";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const fontSize = parseFloat(computedStyle.fontSize) || 16;
  let height = parseFloat(computedStyle.lineHeight);

  if (Number.isNaN(height)) {
    height = fontSize * 1.5;
  } else if (height < 4) {
    height = fontSize * height;
  }

  const coordinates = {
    top: marker.offsetTop,
    left: marker.offsetLeft,
    height,
  };

  document.body.removeChild(mirror);
  return coordinates;
}
