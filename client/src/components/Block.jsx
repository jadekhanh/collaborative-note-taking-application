/**
 * Text block component
 * @param: block - block data
 * @param: onUpdate - function from Editor to update this block
 * @param: onDelete - function from Editor to delete this block
 */
const Block = ({ block, onUpdate, onDelete }) => {
  // get block text; if not exists, use ""
  const text = block.content?.text || "";

  /**
   * Update text to block
   * @param {*} newText
   */
  const updateText = (newText) => {
    // tell Editor to update this block
    onUpdate(block._id, {
      content: {
        // ...block.content = keep old content fields
        ...block.content,
        // add new text
        text: newText,
      },
    });
  };

  /**
   * Change block type
   */
  const updateType = (newType) => {
    onUpdate(block._id, {
      type: newType,
    });
  };

  /**
   * Depends on the block type, decides which input UI to display
   */
  const renderBlockInput = () => {
    switch (block.type) {
      case "heading":
        return (
          <input
            className="block-input block-heading"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Heading"
          />
        );
      case "subheading":
        return (
          <input
            className="block-input block-subheading"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Subheading"
          />
        );

      case "bullet":
        return (
          <div className="bullet-row">
            {/* display a bullet symbol, then an input */}
            <span>•</span>
            <input
              className="block-input"
              value={text}
              onChange={(event) => updateText(event.target.value)}
              placeholder="Bullet"
            />
          </div>
        );

      case "checklist":
        return (
          <div className="checklist-row">
            {/*  display checkbox */}
            <input
              type="checkbox"
              //   if checked does not exist, default to false
              checked={block.content?.checked || false}
              //   when checkbox changes, update checked
              onChange={(event) =>
                onUpdate(block._id, {
                  content: {
                    ...block.content,
                    checked: event.target.checked,
                  },
                })
              }
            />
            <input
              className="block-input"
              value={text}
              onChange={(event) => updateText(event.target.value)}
              placeholder="Checklist item"
            />
          </div>
        );

      case "code":
        return (
          <textarea
            className="block-input block-code"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Code"
          />
        );

      case "quote":
        return (
          <textarea
            className="block-input block-quote"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Quote"
          />
        );

      // if type is unknown, show normal texting area
      default:
        return (
          <textarea
            className="block-input"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder="Write something..."
          />
        );
    }
  };

  // return UI
  return (
    <div className="block">
      <div className="block-controls">
        {/*  dropdown for changing block type */}
        <select
          value={block.type}
          //   when user picks a new type, call updateType
          onChange={(event) => updateType(event.target.value)}
        >
          {/* options in dropdown menu */}
          <option value="paragraph">Paragraph</option>
          <option value="heading">Heading</option>
          <option value="subheading">Subheading</option>
          <option value="bullet">Bullet</option>
          <option value="checklist">Checklist</option>
          <option value="code">Code</option>
          <option value="quote">Quote</option>
        </select>

        {/* button to delete block */}
        <button onClick={() => onDelete(block._id)}>Delete</button>
      </div>

      {/* render the correct input depending on the block type */}
      {renderBlockInput()}
    </div>
  );
};

export default Block;
