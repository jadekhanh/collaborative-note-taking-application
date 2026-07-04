import { useEffect, useState } from "react";
import api from "../../api/axios";

/**
 * Comment panel UI
 * @params
 * - pageId: current page
 * - blockId: current block
 * - isOpen: whether the panel is opened
 * - onClose = function to close the panel
 */
const CommentPanel = ({ pageId, blockId, isOpen, onClose }) => {
  // set state for threads
  const [threads, setThreads] = useState([]);
  // set state for new comment at the textbox
  const [newComment, setNewComment] = useState("");
  // set state for reply text by thread
  // each reply is attached to a thread's unique ID
  // {threadId1: "Hello", threadId2: "Hi", threadId3: "Bye"}
  const [replyTextByThread, setReplyTextByThread] = useState({});

  // get all threads whenever pageId and isOpen are rendered
  useEffect(() => {
    // if the comment panel is opened and a page is opened, get all comment threads
    if (isOpen && pageId) {
      const getThreads = async () => {
        // call GET /api/threads/pages/:pageId to get all threads inside page
        const res = await api.get(`/comments/page/${pageId}/threads`);

        // set threads
        setThreads(res.data.threads);
      };

      getThreads();
    }
  }, [isOpen, pageId]);

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
    const res = await api.post("comments/threads", {
      pageId: pageId,
      blockId: blockId || null,
      content: newComment,
    });

    // set threads inside the page
    // new thread appears first
    setThreads([res.data.thread, ...threads]);
    // reset new comment text box
    setNewComment("");
  };

  /**
   * Delete a comment thread
   */
  const deleteThread = async (threadId) => {
    // call DELETE /api/comments/threads/:threadId
    await api.delete(`/comments/threads/${threadId}`);

    // update threads list state
    setThreads((prevThreads) => {
      // create new list of threads
      const newThreads = [];

      // loop over each thread
      for (const thread of prevThreads) {
        // if this is not the thread that just got deleted
        if (thread._id !== threadId) {
          // push it into the list
          newThreads.push(thread);
        }
      }

      return newThreads;
    });
  };

  /**
   * Resolve thread
   */
  const resolveThread = async (threadId) => {
    // call PATCH /api/comments/threads/:threadId/resolve to resolve thread
    const res = await api.patch(`/comments/threads/${threadId}/resolve`);

    // update threads list state
    setThreads((prevThreads) => {
      // create new list of threads
      const newThreads = [];

      // loop over each thread
      for (const thread of prevThreads) {
        // if this is the thread that just got resolved
        if (thread._id === threadId) {
          // replace it with the updated thread returned by server
          newThreads.push(res.data.thread);
        } else {
          // keep original thread
          newThreads.push(thread);
        }
      }

      return newThreads;
    });
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
      content,
    });

    // update threads list state
    setThreads((prevThreads) => {
      // create new list of threads
      const newThreads = [];

      // loop over each thread
      for (const thread of prevThreads) {
        // if this is the thread that just get a new reply
        if (thread._id === threadId) {
          // replace it with the updated thread returned by server
          newThreads.push(res.data.thread);
        } else {
          // keep original thread
          newThreads.push(thread);
        }
      }

      return newThreads;
    });

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

  // If blockId exists, show only threads attached to that block
  // If blockId does not exist, show only page-level threads.
  const visibleThreads = [];
  if (blockId) {
    // show only comments attached to that block
    for (const thread of threads) {
      if (
        thread.block === blockId ||
        (thread.block && thread.block._id === blockId)
      ) {
        visibleThreads.push(thread);
      }
    }
  } else {
    // show only comments that have no block param
    for (const thread of threads) {
      if (!thread.block) {
        visibleThreads.push(thread);
      }
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
        <button onClick={onClose}>×</button>
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
            {thread.replies?.map((reply) => (
              <div key={reply._id} className="reply-card">
                {/* display author of reply */}
                <strong>{reply.author?.username || "Unknown"}</strong>
                {/* display reply content */}
                <p>{reply.content}</p>
              </div>
            ))}

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
              <button onClick={() => addReplyToThread(thread._id)}>
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

export default CommentPanel;
