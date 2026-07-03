import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Block from "./Block";

/**
 * Create the Editor component to edit the page content
 * @param {string} pageId - The id of the page to edit
 * @param {Function} onPageUpdated - The function to call when the page is updated
 * @param {Function} onPageDeleted - The function to call when the page is deleted
 * @returns {JSX.Element} - The Editor component
 *
 * Notes:
 * Editor has onPageUpdated since editing happens inside the Editor, then Workspace needs Editor calls the callback to update pages state
 * Editor can delete pages so Workspace needs Editor to call the callback to update the pages list
 */
const Editor = ({ pageId, onPageUpdated, onPageDeleted }) => {
  // get user and socket
  const { user } = useAuth();
  const socket = useSocket();

  // state to store the page data
  const [page, setPage] = useState(null);
  // state to store the blocks data
  const [blocks, setBlocks] = useState([]);
  // state to store the page title
  const [title, setTitle] = useState("");
  // state to store active users in current page
  const [activeUsers, setActiveUsers] = useState([]);
  // state to store the error message
  const [error, setError] = useState("");

  /**
   * Set page and title and blocks whenever pageId is rendered
   */
  useEffect(() => {
    const loadPage = async () => {
      try {
        // call GET /api/pages/:pageId
        const res = await api.get(`/pages/${pageId}`);

        // set page
        setPage(res.data.page);
        // set title
        setTitle(res.data.page.title);
        // set blocks
        setBlocks(res.data.blocks);
      } catch (error) {
        // set error message
        setError(error.response?.data?.message || "Failed to load page");
      }
    };

    loadPage();
  }, [pageId]);

  /**
   * Run this code whenever socket, pageId, and user is rendered
   * This runs real-time collaboration update
   * Flow:
   * Workspace opens
   * Join socket room
   * Listen for events: user joins, block created, block updated, block deleted
   * User leaves page
   * User leaves room
   * Remove listeners
   */
  useEffect(() => {
    // if socket does not exist, pageId does not exist, user isn't logged in
    if (!socket || !pageId || !user) {
      // stop immediately do nothing
      return;
    }

    // when frontend emits a message to backend that a user joins pageId
    socket.emit("join-page", { pageId, user });

    // when frontend listens for list of update active users
    socket.on("page-users-updated", ({ users }) => {
      // run this function to update React state to display active users
      setActiveUsers(users);
    });

    // when frontend listens for a new block creation
    // block = new block
    socket.on("receive-block-created", ({ block }) => {
      // set current list of blocks
      setBlocks((prevBlocks) => {
        let exist = false;

        // check if this block already exists
        for (const prevBlock of prevBlocks) {
          if (prevBlock._id === block._id) {
            exist = true;
            break;
          }
        }

        // if this block already in the list, return the list
        if (exist) {
          return prevBlocks;
        }

        // create new blocks list
        const newBlocks = [];
        for (const prevBlock of prevBlocks) {
          newBlocks.push(prevBlock);
        }
        newBlocks.push(block);
        return newBlocks;
      });
    });

    // when frontend listens for newly updated block
    // block = newly updated block
    socket.on("receive-block-updated", ({ block }) => {
      // set current list of blocks
      setBlocks((blocks) => {
        // create new blocks list
        const newBlocks = [];
        for (const current of blocks) {
          // if this is the same block we updated, replace with updated version
          if (current._id === block._id) {
            newBlocks.push(block);
          } else {
            newBlocks.push(current);
          }
        }

        return newBlocks;
      });
    });

    // when frontend listens for deleted block
    // blockId = deleted block
    socket.on("receive-block-deleted", ({ blockId }) => {
      // set current list of blocks
      setBlocks((prevBlocks) => {
        // create new blocks list
        const newBlocks = [];
        for (const block of prevBlocks) {
          // add this block to new list if it's not the block deleted
          if (block._id !== blockId) {
            newBlocks.push(block);
          }
        }
        return newBlocks;
      });
    });

    // run these to clean up
    return () => {
      // frontend sends message that they leave the page
      socket.emit("leave-page", { pageId });
      // remove listeners
      socket.off("page-users-updated");
      socket.off("receive-block-created");
      socket.off("receive-block-updated");
      socket.off("receive-block-deleted");
    };
  }, [socket, pageId, user]);

  /**
   * Update page title
   */
  const updatePageTitle = async (newTitle) => {
    // set new title
    setTitle(newTitle);

    try {
      // call PUT/api/pages/:pageId to update page title
      const res = await api.put(`/pages/${pageId}`, {
        title: newTitle || "Untitled",
      });

      // set page
      setPage(res.data.page);
      // tell Workspace that this page is updated
      onPageUpdated(res.data.page);
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to update page title");
    }
  };

  /**
   * Create a page block
   */
  const createBlock = async () => {
    try {
      // call POST /api/blocks to create new page block
      const res = await api.post("/blocks", {
        pageId,
        type: "paragraph",
        content: { text: "" },
        order: blocks.length, // new block is placed last in order
      });

      // set the list of blocks with the new block is placed last
      setBlocks([...blocks, res.data.block]);

      // frontend sends message to everyone that a block is created
      socket.emit("block-created", { pageId, block: res.data.block });
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to create page block");
    }
  };

  /**
   * Update a page block
   */
  const updateBlock = async (blockId, updates) => {
    try {
      // call PUT /api/blocks/:blockId to update block
      const res = await api.put(`/blocks/${blockId}`, updates);

      // set list of blocks
      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          // if this blocks is the block that we just update, update the block from res
          block._id === blockId ? res.data.block : block,
        ),
      );

      // frontend sends message to everyone that a block is updated
      socket.emit("block-updated", { pageId, block: res.data.block });
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to update block");
    }
  };

  /**
   * Delete a block
   */
  const deleteBlock = async (blockId) => {
    try {
      // call DELETE /api/blocks/:blockId to delete a block
      await api.delete(`/blocks/${blockId}`);

      // set the list of blocks
      setBlocks((prevBlocks) =>
        // filter block that is not the block we just delete
        prevBlocks.filter((block) => block._id !== blockId),
      );

      // frontend sends message to everyone that a block is deleted
      socket.emit("block-deleted", { pageId, blockId });
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to delete block");
    }
  };

  /**
   * Archive a page
   */
  const archivePage = async () => {
    try {
      // call PATCH /api/pages/:pageId/archieve to archieve a page
      await api.patch(`/pages/${pageId}/archive`);
      // tell Workspace we delete this page on Editor
      onPageDeleted(pageId);
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to archive page");
    }
  };

  /**
   * Delete a page
   */
  const deletePage = async () => {
    // confirm user that they want to delete page
    if (
      !window.confirm(
        "Broooooo, are you sure you want to permanently delete this page?",
      )
    ) {
      return;
    }
    try {
      // call DELETE /api/pages/:pageId to delete page
      await api.delete(`/pages/${pageId}`);

      // tell Workspace we delete this page on Editor
      onPageDeleted(pageId);
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to delete page");
    }
  };

  /**
   * While a page is loading, display loading message
   */
  if (!page) {
    return <div>Loading page...</div>;
  }

  // return UI
  return (
    // create Editor
    <div className="editor">
      {/* display error message if any */}
      {error && <p className="error">{error}</p>}

      {/* presence bar to display curently active users in the page*/}
      <div className="presence-bar">
        {activeUsers.map((activeUser) => {
          // displays active user: 🍥 username
          <span key={activeUser.socketId}> 🍥 {activeUser.username}</span>;
        })}
      </div>

      {/* page action bar */}
      <div className="editor-actions">
        {/* a button to archive page */}
        <button onClick={archivePage}>Archive Page</button>
        {/* a button to delete page */}
        <button onClick={deletePage}>Delete Page</button>
      </div>

      {/* page title */}
      <input
        className="editor-title"
        value={title}
        // listen to event where page title is updated
        onChange={(event) => updatePageTitle(event.target.value)}
        // fainted hint text saying "Untitled"
        placeholder="Untitled"
      />

      {/* list of text blocks */}
      <div className="block-list">
        {/* display one block at a time */}
        {blocks.map((block) => (
          <Block
            key={block._id}
            block={block}
            // pass callbacks for blocks
            onUpdate={updateBlock}
            onDelete={deleteBlock}
          />
        ))}
      </div>

      {/* a button to create new text block */}
      <button className="add-block-button" onClick={createBlock}>
        + Add text block
      </button>
    </div>
  );
};

export default Editor;
