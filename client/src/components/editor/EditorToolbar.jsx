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
      <button type="button" onClick={onOpenComments}>
        Comments
      </button>

      {/* Anyone with page access may browse attachments */}
      <button type="button" onClick={onOpenAttachments}>
        Attachments
      </button>

      {/* Owners and editors may view version history */}
      {canEdit && (
        <button type="button" onClick={onOpenVersions}>
          History
        </button>
      )}

      {/* Only the page owner may manage sharing permissions */}
      {isOwner && (
        <button type="button" onClick={onOpenShare}>
          Share
        </button>
      )}

      {/* Only the page owner may archive the page */}
      {isOwner && (
        <button type="button" onClick={onArchivePage}>
          Archive
        </button>
      )}

      {/* Only the page owner may delete the page */}
      {isOwner && (
        <button type="button" onClick={onDeletePage}>
          Delete
        </button>
      )}
    </div>
  );
};

export default EditorToolbar;
