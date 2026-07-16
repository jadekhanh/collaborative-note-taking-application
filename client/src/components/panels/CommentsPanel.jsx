import { useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

/**
 * Comment panel UI
 * @params
 * - pageId: current page
 * - blockId: current block
 * - isOpen: whether the panel is opened
 * - onClose: function from Editor to close the panel
 * - onThreadsChanged = function from Editor to update comment threads
 * - onCommentsUpdated = function from Editor to broadcast updated threads via Socket.IO
 */
const CommentsPanel = ({
  pageId,
  blockId,
  isOpen,
  onClose,
  threads = [],
  onThreadsChanged,
  onCommentsUpdated,
}) => {
  // get current user
  const { user } = useAuth();
  // set state for new comment at the textbox
  const [newComment, setNewComment] = useState("");
  // set state for reply text by thread
  // each reply is attached to a thread's unique ID
  // {threadId1: "Hello", threadId2: "Hi", threadId3: "Bye"}
  const [replyTextByThread, setReplyTextByThread] = useState({});
  // ID of the reply currently being edited
  const [editingReplyId, setEditingReplyId] = useState(null);
  // temporary text while editing a reply
  const [editingReplyText, setEditingReplyText] = useState("");

  /**
   * Update comments panel state
   * Notify Editor so block comment badges get updated
   * Broadcast new thread list to collaborators
   */
  const updateThreads = (updatedThreads) => {
    // notify Editor that comment threads changed so block comment badges get updated
    if (onThreadsChanged) {
      onThreadsChanged(updatedThreads);
    }

    // broadcast the updated threads through Socket.IO
    if (onCommentsUpdated) {
      onCommentsUpdated(updatedThreads);
    }
  };

  /**
   * Create a comment thread
   * event = create comment event
   *
   * In the UI, we write:
   * <form onSubmit={createThread}
   * <input />
   * <button type="submit">Post</button>
   * </form>
   *
   * Therefore, event = { type: "submit", target: <form>, currentTarget: <form>}
   */
  const createThread = async (event) => {
    // prevent browser to reload the page right after user clicks submit
    // need browser to stay where it is
    event.preventDefault();

    // if new comment is an empty string, return
    // note: new comment is not passed in this function but as a global variable that is listened as the user types
    if (!newComment.trim()) {
      return;
    }

    // call POST /api/comments/threads to create a comment thread
    const res = await api.post("/comments/threads", {
      pageId,
      blockId: blockId || null,
      content: newComment.trim(),
    });

    // update threads inside the page
    // new thread appears first
    updateThreads([res.data.thread, ...threads]);

    // reset new comment text box
    setNewComment("");
  };

  /**
   * Delete a comment thread
   */
  const deleteThread = async (threadId) => {
    // call DELETE /api/comments/threads/:threadId
    await api.delete(`/comments/threads/${threadId}`);

    // update threads list
    const updatedThreads = [];
    for (const thread of threads) {
      if (thread._id !== threadId) {
        updatedThreads.push(thread);
      }
    }
    updateThreads(updatedThreads);
  };

  /**
   * Resolve thread
   */
  const resolveThread = async (threadId) => {
    // call PATCH /api/comments/threads/:threadId/resolve to resolve thread
    const res = await api.patch(`/comments/threads/${threadId}/resolve`);

    // update threads list
    const updatedThreads = [];
    for (const thread of threads) {
      if (thread._id !== threadId) {
        updatedThreads.push(thread);
      } else {
        updatedThreads.push(res.data.thread);
      }
    }
    updateThreads(updatedThreads);
  };

  /**
   * Add reply to a comment thread
   * thread id = the thread that now has a new reply
   */
  const addReplyToThread = async (threadId) => {
    // retrieve content of the reply listened from user typing
    const content = replyTextByThread[threadId];

    // if content is empty, do nothing
    if (!content?.trim()) {
      return;
    }

    // call POST /comments/threads/:threadId/replies to update that thread now containing the new reply
    const res = await api.post(`/comments/threads/${threadId}/replies`, {
      content: content.trim(),
    });

    // update threads list
    const updatedThreads = [];
    for (const thread of threads) {
      if (thread._id !== threadId) {
        updatedThreads.push(thread);
      } else {
        updatedThreads.push(res.data.thread);
      }
    }
    updateThreads(updatedThreads);

    // clear textbox for this thread
    // create a copy of the current reply text object
    const newReplyText = {};
    // copy every thread's reply text
    for (const key in replyTextByThread) {
      newReplyText[key] = replyTextByThread[key];
    }
    // clear the reply text for the current thread
    // only the reply box to the thread we just reply to
    // why not clear others: just in case other threads have replies that are still in draft state, do not want to clear them drafts
    newReplyText[threadId] = "";
    // update React state
    setReplyTextByThread(newReplyText);
  };

  /**
   * Enter reply-editing mode
   */
  const startEditingReply = (reply) => {
    // set ID of the editing reply
    setEditingReplyId(reply._id);
    // set the editing reply text
    setEditingReplyText(reply.content);
  };

  /**
   * Cancel reply-editing mode
   */
  const cancelEditingReply = () => {
    // set ID of the editing reply as null
    setEditingReplyId(null);
    // reset the editing reply text
    setEditingReplyText("");
  };

  /**
   * Save an edited reply
   */
  const updateReply = async (threadId, replyId) => {
    // if editing text is empty, do nothing
    if (!editingReplyText.trim()) {
      return;
    }

    // call PATCH /api/comments/threads/:threadId/replies/:replyId to update reply
    const res = await api.patch(
      `/comments/threads/${threadId}/replies/${replyId}`,
      { content: editingReplyText.trim() },
    );

    // replace the old thread with the updated thread that includes edited reply
    const updatedThreads = [];
    for (const thread of threads) {
      if (thread._id === threadId) {
        updatedThreads.push(res.data.thread);
      } else {
        updatedThreads.push(thread);
      }
    }

    // update threads
    updateThreads(updatedThreads);

    // cancel reply-editing mode
    cancelEditingReply();
  };

  /**
   * Delete a reply from thread
   */
  const deleteReply = async (threadId, replyId) => {
    // confirm with user we want to delete
    if (
      !window.confirm(
        "Yoooo yooo yoooo are you sure you wanna delete this reply?",
      )
    ) {
      return;
    }

    // call DELETE /api/comments/threads/:threadId/replies/:replyId
    const res = await api.delete(
      `/comments/threads/${threadId}/replies/${replyId}`,
    );

    // update threads
    const updatedThreads = [];
    for (const thread of threads) {
      if (thread._id === threadId) {
        updatedThreads.push(res.data.thread);
      } else {
        updatedThreads.push(thread);
      }
    }
    updateThreads(updatedThreads);

    // if the editing reply is the reply that is deleted, cancel the editing reply mode
    if (editingReplyId === replyId) {
      cancelEditingReply();
    }
  };

  // If blockId exists, show only threads attached to that block
  // If blockId does not exist, show only page-level threads
  const visibleThreads = [];
  for (const thread of threads) {
    const threadBlockId = thread.block?._id || thread.block || null;
    if (blockId) {
      if (threadBlockId?.toString() === blockId.toString()) {
        visibleThreads.push(thread);
      }
    } else if (!threadBlockId) {
      visibleThreads.push(thread);
    }
  }

  // if the comment panel is not opened, do nothing
  if (!isOpen) {
    return null;
  }

  // return UI
  return (
    <aside className="comments-panel">
      <p className="panel-subtitle">
        {blockId ? "Block discussion" : "Page discussion"}
      </p>
      <div className="panel-header">
        <h2>Comments</h2>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>

      {/* create thread area */}
      <form onSubmit={createThread} className="comment-form">
        {/* text area to create thread */}
        <textarea
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          placeholder="Start a new comment here"
        />
        {/* button to submit comment */}
        <button type="submit">Comment</button>
      </form>

      {/* threads list */}
      <div className="thread-list">
        {/* loop over each thread */}
        {visibleThreads.map((thread) => (
          <div
            key={thread._id}
            className={`thread-card ${thread.isResolved ? "resolved" : ""}`}
          >
            <div className="thread-meta">
              {/* display author of the thread */}
              <strong>{thread.author?.username || "Unknown"}</strong>
              {/* display date of thread */}
              <span>{new Date(thread.createdAt).toLocaleString()}</span>
            </div>

            {/* thread content */}
            <p>{thread.content}</p>
            {/* displays thread's replies */}
            {/* Display every reply inside this discussion thread. */}
            {thread.replies?.map((reply) => {
              const currentUserId = user?._id || user?.id;
              const replyAuthorId = reply.author?._id || reply.author;
              const isReplyAuthor =
                currentUserId?.toString() === replyAuthorId?.toString();
              const isEditing = editingReplyId === reply._id;
              return (
                <div key={reply._id} className="reply-card">
                  <div className="reply-header">
                    <strong>{reply.author?.username || "Unknown"}</strong>

                    <span>{new Date(reply.createdAt).toLocaleString()}</span>
                  </div>
                  {isEditing ? (
                    /*
                     * Replace the reply text with an editable textarea while this reply is in editing mode
                     */
                    <div className="reply-edit-form">
                      <textarea
                        value={editingReplyText}
                        onChange={(event) =>
                          setEditingReplyText(event.target.value)
                        }
                      />

                      <div className="reply-edit-actions">
                        <button
                          type="button"
                          onClick={() => updateReply(thread._id, reply._id)}
                        >
                          Save
                        </button>

                        <button type="button" onClick={cancelEditingReply}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>{reply.content}</p>

                      {/* Only the reply author sees Edit and Delete */}
                      {isReplyAuthor && (
                        <div className="reply-actions">
                          <button
                            type="button"
                            onClick={() => startEditingReply(reply)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteReply(thread._id, reply._id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* area to add reply to thread */}
            <div className="reply-form">
              <input
                value={replyTextByThread[thread._id] || ""}
                onChange={(event) =>
                  setReplyTextByThread({
                    ...replyTextByThread,
                    [thread._id]: event.target.value,
                  })
                }
                placeholder="Reply to this comment"
              />
              {/* submit button to add reply to thread */}
              <button
                type="button"
                onClick={() => addReplyToThread(thread._id)}
              >
                Reply
              </button>
            </div>

            {/* thread actions area */}
            <div className="thread-actions">
              {/* button to resolve thread */}
              {!thread.isResolved && (
                <button onClick={() => resolveThread(thread._id)}>
                  Resolve
                </button>
              )}
              {/* button to delete thread */}
              <button onClick={() => deleteThread(thread._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default CommentsPanel;
