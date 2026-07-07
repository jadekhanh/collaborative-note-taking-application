import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import useAutosave from "../hooks/useAutosave";
import Block from "./Block";
import VersionModal from "./modals/VersionModal";
import CommentsPanel from "./panels/CommentsPanel";

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
  // state to store boolean if version modal is opened
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  // state to check if comment panel is opened
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  // state to set block to add comment
  const [selectedCommentBlockId, setSelectedCommentBlockId] = useState(null);

  /**
   * Create sensors into one object
   * Sensor = tells dnd-kit how the user starts dragging = dragging settings
   * PointerSensor = mouse, touchpad, touchscreen
   */
  const sensors = useSensors(
    // create 1 sensor
    useSensor(PointerSensor, {
      // user must move 6 pixels before dragging begins
      // without this, click = immediate drag
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  /**
   * Save new blocks order to MongoDB + Emit to other collaborators through Socket.IO
   * @param: already reorder blocks list
   */
  const saveBlockOrder = async (reorderedBlocks) => {
    // return a list of [{blockId, order},...]
    const blocksToUpdate = reorderedBlocks.map((block, index) => ({
      blockId: block._id,
      order: index,
    }));

    // call PUT /blocks/page/:pageId/reorder to save new blocks list to backend to update MongoDB
    await api.put(`/blocks/page/${pageId}/reorder`, {
      blocks: blocksToUpdate,
    });

    // tell everyone else inside the page that blocks are ordered
    socket.emit("blocks-reordered", {
      pageId,
      // loop over blocks list
      blocks: reorderedBlocks.map((block, index) => ({
        ...block, // copy the block
        order: index, // replace old with new order
      })),
    });
  };

  /**
   * Handle drag ends
   * This function is called when user releases mouse after done dragging
   */
  const handleDragEnd = async (event) => {
    // active = the block being dragged
    // over = the block being dragged over
    // if block A is dragged onto block B position, then active = A, over = B
    // result: A is where B was at, B and other blocks below gets moved down 1 position
    const { active, over } = event;

    // !over = if user drops outside
    // active = over: if user drags block and drops it back onto same position
    if (!over || active.id === over.id) return;

    // find old position
    const oldIndex = blocks.findIndex((block) => block._id === active.id);
    // find new position
    const newIndex = blocks.findIndex((block) => block._id === over.id);

    // arrayMove() = helper function to write swap logic
    // before ABCD, C gets moved up front, returns new list: CABD
    // returns new blocks list
    const reorderedBlocks = arrayMove(blocks, oldIndex, newIndex).map(
      // update every block order field
      (block, index) => ({
        ...block,
        order: index,
      }),
    );

    // update React
    setBlocks(reorderedBlocks);

    try {
      // save new block lists in backend
      await saveBlockOrder(reorderedBlocks);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to reorder blocks");
    }
  };

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

    // when frontend listens for block reordered
    // blocks = list of blocks after reordering
    socket.on("receive-blocks-reordered", ({ blocks }) => {
      // set React state of current list of blocks
      setBlocks(blocks);
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
      socket.off("receive-blocks-reordered");
    };
  }, [socket, pageId, user]);

  /**
   * useAutosave Hook calls this function after user stops typing title for 800ms
   */
  const savePageTitle = async (newTitle) => {
    // call PUT /pages/:pageId to update page title
    const res = await api.put(`/pages/${pageId}`, {
      title: newTitle || "Untitled", // "Untitled" in case the user deleted everything
    });

    // render page with updated page title
    setPage(res.data.page);
    // since Workspace owns the list of pages, when page title changes, Workspace needs to know
    // tell Workspace that this page has a new title, so Workspace can updates the sidebar
    onPageUpdated(res.data.page);
  };

  /**
   * Calls this function when user types in title in text box to change title state
   * This function does not save anything, only changes React state immediately in every char. No backend req
   */
  const handleTitleChange = (newTitle) => {
    // update React title state
    setTitle(newTitle);
  };

  /**
   * Autosave page title
   * Everytime setTitle() changes title, useAutosave() notices, then it waits 800ms then it calls savePageTitle()
   */
  const titleSaveStatus = useAutosave({
    value: title,
    onSave: savePageTitle,
    delay: 800,
    enabled: Boolean(pageId && page),
  });

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
   * Restore a page version
   * @param {*} restoredPage
   * @param {*} restoredBlocks
   */
  const restoreVersion = (restoredPage, restoredBlocks) => {
    // set page as restored page
    setPage(restoredPage);
    // set page title as restored page title
    setTitle(restoredPage.title);
    // set blocks as restored blocks
    setBlocks(restoredBlocks);
    // let Workspace know that restored page just gets updated
    onPageUpdated(restoredPage);
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
        {/* a button to open Version modal */}
        <VersionModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          pageId={pageId}
          onRestore={restoreVersion}
        />
        <button onClick={() => setIsVersionModalOpen(true)}>
          Version History
        </button>
        {/* a button to archive page */}
        <button onClick={archivePage}>Archive Page</button>
        {/* a button to delete page */}
        <button onClick={deletePage}>Delete Page</button>
        {/* a button to add comments to page */}
        <button
          onClick={() => {
            setSelectedCommentBlockId(null);
            setIsCommentsOpen(true);
          }}
        >
          Page Comments
        </button>
        <CommentsPanel
          pageId={pageId}
          blockId={selectedCommentBlockId}
          isOpen={isCommentsOpen}
          onClose={() => {
            setIsCommentsOpen(false);
            setSelectedCommentBlockId(null);
          }}
        />
      </div>

      {/* page title */}
      <input
        className="editor-title"
        value={title}
        onChange={(event) => handleTitleChange(event.target.value)}
        placeholder="Untitled"
      />
      <p className="save-status">
        {titleSaveStatus === "saving" && "Saving title..."}
        {titleSaveStatus === "saved" && "Saved"}
        {titleSaveStatus === "error" && "Failed to save title"}
      </p>

      {/* list of text blocks */}
      {/* DndContext = drag and drop environment */}
      <DndContext
        // sensors = dragging settings
        sensors={sensors}
        // detect blocks that the current block collides over by comaparing the center of the dragged block with the center of every other block
        // this to detect which block is over block
        collisionDetection={closestCenter}
        // when user releases the mouse, call handleDragEnd() function above to save new blocks list to db and sends socket.io update
        onDragEnd={handleDragEnd}
      >
        {/* SortableContext = everything inside here is sortable list */}
        <SortableContext
          // give dnd the current order of the blocks
          items={blocks.map((block) => block._id)}
          // tell dnd how to calculate movement, which is verticle movement
          strategy={verticalListSortingStrategy}
        >
          <div className="block-list">
            {blocks.map((block) => (
              <Block
                key={block._id}
                block={block}
                // call Editor when a block is updated
                onUpdate={updateBlock}
                // call Editor when a block is deleted
                onDelete={deleteBlock}
                // call Editor when a block is commented or has comment section opened
                onComment={(blockId) => {
                  setSelectedCommentBlockId(blockId);
                  setIsCommentsOpen(true);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* a button to create new text block */}
      <button className="add-block-button" onClick={createBlock}>
        + Add text block
      </button>
    </div>
  );
};

export default Editor;
