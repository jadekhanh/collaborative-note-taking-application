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
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import useAutosave from "../../hooks/useAutosave";
import ShareModal from "../modals/ShareModal";
import VersionModal from "../modals/VersionModal";
import AttachmentsPanel from "../panels/AttachmentsPanel";
import CommentsPanel from "../panels/CommentsPanel";
import Block from "./Block";

/**
 * Create the Editor component to edit the page content
 * @param {string} pageId - The id of the page to edit
 * @param {Function} onPageUpdated - The function to call when the page is updated
 * @param {Function} onPageDeleted - The function to call when the page is deleted
 * @param {Function} onPageArchive - The function to call when the page is archived
 * @returns {JSX.Element} - The Editor component
 *
 * Notes:
 * Editor has onPageUpdated since editing happens inside the Editor, then Workspace needs Editor calls the callback to update pages state
 * Editor can delete pages so Workspace needs Editor to call the callback to update the pages list
 */
const Editor = ({ pageId, onPageUpdated, onPageArchive, onPageDeleted }) => {
  // get user and socket
  const { user } = useAuth();
  const socket = useSocket();

  // React state to display the page
  const [page, setPage] = useState(null);
  // React state to display the blocks
  const [blocks, setBlocks] = useState([]);
  // React state to display the page title
  const [title, setTitle] = useState("");
  // React state to store active users in current page
  const [activeUsers, setActiveUsers] = useState([]);
  // React state to display the error message
  const [error, setError] = useState("");
  // React state to store boolean if version modal is opened
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  // React state to open comment panel
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  // React state to set block to add comment
  const [selectedCommentBlockId, setSelectedCommentBlockId] = useState(null);
  // React state to open attachment panel
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  // React state to display typing users
  const [typingUsers, setTypingUsers] = useState([]);
  // React state to display cursors
  const [remoteCursors, setRemoteCursors] = useState([]);
  // React state to open Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // React state for user's page access role
  const [accessRole, setAccessRole] = useState("VIEWER");

  /**
   * Boolean check if a user can edit this page
   * Used for restrictive buttons
   */
  const canEdit = accessRole === "OWNER" || accessRole === "EDITOR";
  /**
   * Boolean check if this user is owner of the page
   * Used for restrictive buttons
   */
  const isOwner = accessRole === "OWNER";

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
    // if this user is VIEWER, do nothing
    if (!canEdit) {
      return;
    }

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
        // set acess role
        setAccessRole(res.data.accessRole);
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

    // listen for Socket.IO event sent by backend when a user joins the page
    socket.on("page-users-updated", ({ users }) => {
      // run this function to update React state to display active users
      setActiveUsers(users);
    });

    // listen for Socket.IO event sent by backend when a new block is created
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

    // listen for Socket.IO event sent by backend when a block is updated
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

    // listen for Socket.IO event sent by backend when a block is deleted
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

    // listen for Socket.IO event sent by backend when blocks are reordered
    // blocks = list of blocks after reordering
    socket.on("receive-blocks-reordered", ({ blocks }) => {
      // set React state of current list of blocks
      setBlocks(blocks);
    });

    // listen for Socket.IO event sent by backend when a user starts typing
    socket.on("receive-typing-started", (data) => {
      // extract user from data
      const user = data.user;

      // update typingUsers React state
      setTypingUsers((prevUsers) => {
        // check if this user is not already typing
        let alreadyTyping = false;

        // loop through every current user
        for (const current of prevUsers) {
          // if this user has the same ID as the user being checked, it means they're already in the typing list
          if (current._id === user._id) {
            alreadyTyping = true;
            break;
          }
        }

        // if the user is already in the typing list, just return the existing list
        if (alreadyTyping) {
          return prevUsers;
        }
        // if not, add this user into the typing list
        else {
          return [...prevUsers, user];
        }
      });
    });

    // listen for Socket.IO event sent by backend when a user stops typing
    socket.on("receive-typing-stopped", (data) => {
      // extract user from data
      const user = data.user;

      // update typingUsers React state
      setTypingUsers((prevUsers) => {
        // updated list of typing users
        const newTypingUsers = [];
        for (const current of prevUsers) {
          // push all users that is not the user that stops typing
          if (user._id !== current._id) {
            newTypingUsers.push(current);
          }
        }

        return newTypingUsers;
      });
    });

    // listen for Socket.IO event sent by backend when another user moves thier cursor inside the page
    socket.on("receive-cursor-moved", (data) => {
      // extract user and cursor from data
      const { user, cursor } = data;

      // update the list of all remote cursors positions inside the page
      setRemoteCursors((prevCursors) => {
        // create a new list of every user's latest cursor
        const newCursors = [];
        for (const current of prevCursors) {
          // keep every cursor besides the one belonging to the user who just moved
          if (current.user._id !== user._id) {
            newCursors.push(current);
          }
        }

        // add the user's newest cursor position to the list
        newCursors.push({ user: user, cursor: cursor });

        return newCursors;
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
      socket.off("receive-blocks-reordered");
      socket.off("receive-typing-started");
      socket.off("receive-typing-stopped");
      socket.off("receive-cursor-moved");
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
    enabled: Boolean(pageId && page && canEdit),
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
   * Copy a block
   */
  const copyBlock = async (blockId) => {
    try {
      // call POST /api/blocks/:blockId/copy
      const res = await api.post(`/blocks/${blockId}/copy`);

      // display new list of blocks
      setBlocks((prevBlocks) => [...prevBlocks, res.data.block]);

      // broadcast new block to other collaborators
      socket.emit("block-created", { pageId, block: res.data.block });
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to copy block");
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
      // tell Workspace we archive this page on Editor
      onPageArchive(pageId);
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
    // main editor container
    <div className="editor">
      {/* display error message if something fails */}
      {error && <p className="error">{error}</p>}

      {/* display users currently viewing/editing this page */}
      <div className="presence-bar">
        {activeUsers.map((activeUser) => (
          <span key={activeUser.socketId}>🍥 {activeUser.username}</span>
        ))}
      </div>

      {/* display users who are currently typing */}
      {typingUsers.length > 0 && (
        <p className="typing-indicator">
          {typingUsers.map((item) => item.username).join(", ")} editing...
        </p>
      )}

      {/* page action buttons */}
      <div className="editor-actions">
        {/* version history modal for saving/restoring page snapshots */}
        <VersionModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          pageId={pageId}
          onRestore={restoreVersion}
        />

        {/* open version history modal */}
        <button onClick={() => setIsVersionModalOpen(true)}>
          Version History
        </button>

        <ShareModal
          pageId={pageId}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
        {/* If the user is OWNER or EDITOR, they can see Share button */}
        {canEdit && (
          <button onClick={() => setIsShareModalOpen(true)}>Share</button>
        )}
        {/* If the user is OWNER, they can see Archive Page button */}
        {isOwner && <button onClick={archivePage}>Archive Page</button>}
        {/* If the user is OWNER, they can see Delete Page button */}
        {isOwner && <button onClick={deletePage}>Delete Page</button>}

        {/* open page-level comments, not attached to a specific block */}
        <button
          onClick={() => {
            setSelectedCommentBlockId(null);
            setIsCommentsOpen(true);
          }}
        >
          Page Comments
        </button>

        {/* comments panel supports both page-level and block-level discussions */}
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

      {/* open attachment panel for uploaded files/images */}
      <button onClick={() => setIsAttachmentsOpen(true)}>Attachments</button>

      {/* attachment panel displays uploaded files and supports upload/download */}
      <AttachmentsPanel
        pageId={pageId}
        canEdit={canEdit}
        isOpen={isAttachmentsOpen}
        onClose={() => setIsAttachmentsOpen(false)}
      />

      {/* editable page title; autosaves after user stops typing */}
      <input
        className="editor-title"
        value={title}
        onChange={(event) => canEdit && handleTitleChange(event.target.value)}
        disabled={!canEdit} // only EDITOR and OWNER can edit title
        placeholder="Untitled"
      />

      {/* title autosave status */}
      <p className="save-status">
        {titleSaveStatus === "saving" && "Saving title..."}
        {titleSaveStatus === "saved" && "Saved"}
        {titleSaveStatus === "error" && "Failed to save title"}
      </p>

      {/* drag-and-drop area for reordering blocks */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* sortable list context tells dnd-kit which blocks can be reordered */}
        <SortableContext
          items={blocks.map((block) => block._id)}
          strategy={verticalListSortingStrategy}
        >
          {/* render all blocks in current order */}
          <div className="block-list">
            {blocks.map((block) => (
              <Block
                key={block._id}
                block={block}
                canEdit={canEdit} // only EDITOR and OWNER can edit blocks
                remoteCursors={remoteCursors.filter(
                  (item) => item.cursor.blockId === block._id,
                )}
                onUpdate={updateBlock}
                onCopy={copyBlock}
                onDelete={deleteBlock}
                onComment={(blockId) => {
                  setSelectedCommentBlockId(blockId);
                  setIsCommentsOpen(true);
                }}
                onTypingStarted={() => {
                  socket.emit("typing-started", { pageId, user });
                }}
                onTypingStopped={() => {
                  socket.emit("typing-stopped", { pageId, user });
                }}
                onCursorMoved={(cursor) => {
                  socket.emit("cursor-moved", {
                    pageId,
                    user,
                    cursor,
                  });
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Only OWNER and EDITOR can see Add text block button */}
      {canEdit && (
        <button className="add-block-button" onClick={createBlock}>
          + Add text block
        </button>
      )}
    </div>
  );
};

export default Editor;
