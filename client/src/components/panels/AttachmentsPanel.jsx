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
const AttachmentPanel = ({ pageId, isOpen, onClose, canEdit }) => {
  // set React state for list of attachments
  const [attachments, setAttachments] = useState([]);
  // set React state for file that user selects: it stores { name, size, type, lastModified }
  const [selectedFile, setSelectedFile] = useState(null);
  // set React state for error message
  const [error, setError] = useState("");

  // run the following code whenever pageId or isOpen is rendered
  useEffect(() => {
    // only displays attachments when the panel is opened on a page
    if (isOpen && pageId) {
      /**
       * Load all attachments
       */
      const getAttachments = async () => {
        // call GET /attachments/page/:pageId
        const res = await api.get(`/attachments/page/${pageId}`);

        // display all attachments
        setAttachments(res.data.attachments);
      };

      getAttachments();
    }
  }, [isOpen, pageId]);

  /**
   * Upload an attachment
   * event = event submitted when user uploads an attachment
   */
  const uploadAttachment = async (event) => {
    // prevent the browser to automatically refresh the browser when user hits submit
    event.preventDefault();

    // if there's no selected file do nothing
    if (!selectedFile) {
      return;
    }

    try {
      // create an upload package
      const uploadData = new FormData();
      // add file field to package
      uploadData.append("file", selectedFile);
      // add pageId field to package so backend know which page the attachment belongs to
      uploadData.append("pageId", pageId);

      // call POST /api/attachments/upload to upload file
      const res = await api.post("/attachments/upload", uploadData);

      // display attachments
      setAttachments([res.data.attachment, ...attachments]);
      // reset selected file
      setSelectedFile(null);
      // reset event target
      event.target.reset();
    } catch (error) {
      // display error message
      setError(error.res?.data.message || "Failed to upload attachment");
    }
  };

  /**
   * Delete an attachment
   */
  const deleteAttachment = async (attachmentId) => {
    try {
      // call DELETE /attachments/:attachmentId to delete attachment
      await api.delete(`/attachments/${attachmentId}`);

      // get new list of attachments
      const newAttachments = [];
      for (const attachment of attachments) {
        // if this attachment isn't the attachment we deleted, add into list
        if (attachment._id !== attachmentId) {
          newAttachments.push(attachment);
        }
      }

      // display new list of attachments
      setAttachments(newAttachments);
    } catch (error) {
      // display error message
      setError(error.res?.data.message || "Failed to delete attachment");
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
        <button onClick={onClose}>×</button>
      </div>

      {/* Display error message */}
      {error && <p className="error">{error}</p>}

      {/* A form to upload attachment */}
      {canEdit && (
        <form className="attachment-form" onSubmit={uploadAttachment}>
          <input
            type="file"
            onChange={(event) => setSelectedFile(event.target.files[0])}
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
              <button onClick={() => deleteAttachment(attachment._id)}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default AttachmentPanel;
