/**
 * Toolbar displayed at the top of the Editor
 *
 * Contains page-level actions only
 * Block-specific actions remain inside Block.jsx
 */
const EditorToolbar = ({
  isOwner,
  canEdit,
  onOpenComments,
  onOpenAttachments,
  onOpenVersions,
  onOpenShare,
  onArchivePage,
  onDeletePage,
}) => {
  return (
    <div className="editor-toolbar">
      {/* Anyone with page access may view comments */}
      <button onClick={onOpenComments}>Comments</button>

      {/* Anyone may browse attachments */}
      <button onClick={onOpenAttachments}>Attachments</button>

      {/* Only the page owner and editors can view version history */}
      {canEdit && <button onClick={onOpenVersions}>History</button>}

      {/* Only the page owner and editors may share the page */}
      {canEdit && <button onClick={onOpenShare}>Share</button>}

      {/* Only the page owner may archive the page */}
      {isOwner && <button onClick={onArchivePage}>Archive</button>}

      {/* Only the page owner may permanently delete the page */}
      {isOwner && <button onClick={onDeletePage}>Delete</button>}
    </div>
  );
};

export default EditorToolbar;
