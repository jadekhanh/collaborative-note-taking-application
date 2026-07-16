import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Attachment panel
 * receives 3 params from Editor
 * - pageId: page that the attachment belongs to
 * - isOpen: whether the panel is currently opened
 * - onClose: function from Editor. When called, Editor closes the panel
 * - canEdit: whether the user has editor access to the page
 */
const AttachmentsPanel = ({
  pageId,
  canEdit,
  isOpen,
  attachments = [],
  onAttachmentsChanged,
  onAttachmentsUpdated,
  onClose,
}) => {
  // set React state for file that user selects: it stores { name, size, type, lastModified }
  const [selectedFile, setSelectedFile] = useState(null);
  // set React state for error message
  const [error, setError] = useState("");

  /**
   * Notify Editor about attachments change and emit attachments to other collaborators
   */
  const updateAttachments = (attachments) => {
    // notify Editor about attachments change
    if (onAttachmentsChanged) {
      onAttachmentsChanged(attachments);
    }

    // emit attachments to other collaborators
    if (onAttachmentsUpdated) {
      onAttachmentsUpdated(attachments);
    }
  };

  // run the following code whenever pageId or isOpen is rendered
  useEffect(() => {
    // if panel isn't open or page isn't loaded, do nothing
    if (!isOpen || !pageId) {
      return;
    }

    // track whether this effect is still effective
    // if the user closes the panel or switches page before the req finishes, ignore the old res
    let isCancelled = false;

    // load attachments
    const loadAttachments = async () => {
      try {
        // reset error message
        setError("");

        // call GET /api/attachments/page:pageId to load attachments
        const res = await api.get(`/attachments/page/${pageId}`);

        // if the req still belong to the current page and Editor provides callback
        if (!isCancelled && onAttachmentsChanged) {
          // notify Editor about the attachment change
          onAttachmentsChanged(res.data.attachments);
        }
      } catch (error) {
        // only show error if this req isn't cancelled
        if (!isCancelled) {
          setError(
            error.response?.data?.message || "Failed to load attachments",
          );
        }
      }
    };

    loadAttachments();

    // cleanup function
    // run this before this effect runs again or when the component unmounts
    return () => {
      isCancelled = true;
    };
  }, [isOpen, pageId, onAttachmentsChanged]);

  /**
   * Upload an attachment
   * event = event submitted when user uploads an attachment
   */
  const uploadAttachment = async (event) => {
    // prevent the browser to automatically refresh the browser when user hits submit
    event.preventDefault();

    // if there's no selected file or this user is viewer, do nothing
    if (!selectedFile || !canEdit) {
      return;
    }

    try {
      // reset error message
      setError("");

      // create an upload package
      const uploadData = new FormData();
      // add file field to package
      uploadData.append("file", selectedFile);
      // add pageId field to package so backend know which page the attachment belongs to
      uploadData.append("pageId", pageId);

      // call POST /api/attachments/upload to upload file
      const res = await api.post("/attachments/upload", uploadData);

      // load attachments list with new attachment on top of the list
      updateAttachments([res.data.attachment, ...attachments]);

      // reset selected file
      setSelectedFile(null);

      // reset event target
      event.target.reset();
    } catch (error) {
      // display error message
      setError(error.response?.data?.message || "Failed to upload attachment");
    }
  };

  /**
   * Delete an attachment
   */
  const deleteAttachment = async (attachmentId) => {
    // if this user is a viewer, do nothing
    if (!canEdit) {
      return;
    }

    try {
      // reset error message
      setError("");

      // call DELETE /attachments/:attachmentId to delete attachment
      await api.delete(`/attachments/${attachmentId}`);

      // update attachments list
      const newAttachments = [];
      for (const attachment of attachments) {
        // if this attachment isn't the attachment we deleted, add into list
        if (attachment._id !== attachmentId) {
          newAttachments.push(attachment);
        }
      }
      updateAttachments(newAttachments);
    } catch (error) {
      // display error message
      setError(error.response?.data?.message || "Failed to delete attachment");
    }
  };

  /**
   * If the attachment panel isn't opened, do nothing
   */
  if (!isOpen) {
    return null;
  }

  // return UI
  return (
    <aside className="attachments-panel">
      <div className="panel-header">
        <h2>Attachments</h2>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>

      {/* Display error message */}
      {error && <p className="error">{error}</p>}

      {/* A form to upload attachment */}
      {canEdit && (
        <form className="attachment-form" onSubmit={uploadAttachment}>
          <input
            type="file"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] || null)
            }
          />

          {/* Upload Attachment button */}
          <button type="submit">Upload Attachment</button>
        </form>
      )}

      {/* Attachments list */}
      <div className="attachment-list">
        {attachments.map((attachment) => (
          <div key={attachment._id} className="attachment-card">
            <div>
              <strong>{attachment.fileName}</strong>
              <p>{attachment.fileType}</p>
              <p>{Math.round(attachment.fileSize / 1024)} KB</p>
            </div>

            <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
              Open
            </a>

            <a href={attachment.fileUrl} download>
              Download
            </a>

            {/* Button to delete attachment */}
            {canEdit && (
              <button
                type="button"
                onClick={() => deleteAttachment(attachment._id)}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default AttachmentsPanel;
