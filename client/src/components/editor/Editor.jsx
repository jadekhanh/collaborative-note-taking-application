import { arrayMove } from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import useAutosave from "../../hooks/useAutosave";
import ShareModal from "../modals/ShareModal";
import VersionModal from "../modals/VersionModal";
import AttachmentsPanel from "../panels/AttachmentsPanel";
import CommentsPanel from "../panels/CommentsPanel";
import PresencePanel from "../panels/PresencePanel";
import BlockList from "./BlockList";
import EditorToolbar from "./EditorToolbar";

/**
 * Main page editor
 *
 * Editor owns:
 * - page and block state
 * - Socket.IO collaboration
 * - page-level actions
 * - comments, attachments, sharing, and version panels
 *
 * @param {string} pageId - ID of page currently opens
 * @param {Function} onPageUpdated - Notify Workspace when page data changes
 * @param {Function} onPageDeleted - Notify Workspace when page is deleted
 * @param {Function} onPageArchive - Notify Workspace when page is archived
 *
 * Notes:
 * Editor has onPageUpdated since editing happens inside the Editor, then Workspace needs Editor calls the callback to update pages state
 * Editor can delete pages so Workspace needs Editor to call the callback to update the pages list
 */
const Editor = ({ pageId, onPageUpdated, onPageArchive, onPageDeleted }) => {
  // get current user and shared Socket.IO connection
  const { user } = useAuth();
  const socket = useSocket();

  // Current page data
  const [page, setPage] = useState(null);
  // Ordered list of blocks belonging to the current page
  const [blocks, setBlocks] = useState([]);
  // Current page title
  const [title, setTitle] = useState("");
  // Users currently connected to this page's Socket.IO room
  const [activeUsers, setActiveUsers] = useState([]);
  // Request or application error displayed inside the editor
  const [error, setError] = useState("");
  // Current comments attached to a specific block (null = page-level comments)
  const [selectedCommentBlockId, setSelectedCommentBlockId] = useState(null);
  // Users who are currently typing
  const [typingUsers, setTypingUsers] = useState([]);
  // Latest cursor position for every remote collaborator
  const [remoteCursors, setRemoteCursors] = useState([]);
  // Current user's permission for this page
  const [accessRole, setAccessRole] = useState("VIEWER");
  // Modal and panel visibility state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // OWNER and EDITOR may change page content
  const canEdit = accessRole === "OWNER" || accessRole === "EDITOR";
  // Only the actual page owner may share, archive, or delete the page
  const isOwner = accessRole === "OWNER";
  // All comment threads inside page inside Comments Panel and blocks
  const [commentThreads, setCommentThreads] = useState([]);
  // All attachments inside the page displayed inside Attachments Panel
  const [attachments, setAttachments] = useState([]);
  // All permissions for the page displayed inside Share modal
  const [permissions, setPermissions] = useState([]);
  // Timer used to automatically create a page version
  // note: useRef since changing the timer should not cause the Editor to re-render
  const autoVersionTimeoutRef = useRef(null);
  // Prevents an automatic version from being created immediately after the page first loads
  const hasPageLoadedRef = useRef(false);
  // boolean check if current page loads
  const isPageLoaded = Boolean(page);

  /**
   * Load page, title, ordered blocks, comment threads whenever pageId is rendered
   */
  useEffect(() => {
    // do nothing if no page is selected
    if (!pageId) {
      return;
    }

    // a flag to prevent an old req from updating state after the user has already switched to another page
    let isCancelled = false;

    // reset the automatic-version first-load check
    hasPageLoadedRef.current = false;

    const loadPage = async () => {
      try {
        // call GET /api/pages/:pageId to load page
        const pageResponse = await api.get(`/pages/${pageId}`);

        // call GET /api/comments/page/:pageId/threads
        const commentsResponse = await api.get(
          `/comments/page/${pageId}/threads`,
        );

        // if the user switch pages while the reqs were running, do not apply those results
        if (isCancelled) {
          return;
        }

        // load page and comment data to editor
        setPage(pageResponse.data.page);
        setTitle(pageResponse.data.page.title);
        setBlocks(pageResponse.data.blocks);
        setAccessRole(pageResponse.data.accessRole);
        setCommentThreads(commentsResponse.data.threads);

        // clear old data from previous page
        setRemoteCursors([]);
        setTypingUsers([]);
        setError("");
        setAttachments([]);
        setPermissions([]);
        setActiveUsers([]);
        setSelectedCommentBlockId(null);
        setIsCommentsOpen(false);
        setIsAttachmentsOpen(false);
        setIsShareModalOpen(false);
        setIsVersionModalOpen(false);
      } catch (error) {
        // do not update state if this req is no longer relevant
        if (isCancelled) {
          return;
        }

        setError(error.response?.data?.message || "Failed to load page");
      }
    };

    loadPage();

    // React runs this when the user switches pages or when Editor is removed
    return () => {
      isCancelled = true;
    };
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

    // frontend emits a message to backend that a user joins pageId
    socket.emit("join-page", { pageId, user });

    // listen for Socket.IO event sent by backend when a user joins the page
    socket.on("page-users-updated", ({ users }) => {
      // run this function to update React state to display active users
      setActiveUsers(users);
    });

    // listen for Socket.IO event sent by backend when a page is updated
    socket.on("receive-page-updated", ({ page: updatedPage }) => {
      // load updated page
      setPage(updatedPage);

      // load updated title
      setTitle(updatedPage.title);

      // notify Workspace that the page is updated
      onPageUpdated(updatedPage);
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

        // sort the blocks in correct order
        newBlocks.sort(
          (firstBlock, secondBlock) => firstBlock.order - secondBlock.order,
        );

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

    // listen for Socket.IO event sent by backend when comment threads are updated
    socket.on("receive-comments-updated", ({ threads }) => {
      // load updated threads
      setCommentThreads(threads);
    });

    // listen for Socket.IO event sent by backend when attachments are updated
    socket.on("receive-attachments-updated", ({ attachments }) => {
      // load updated attachments
      setAttachments(attachments);
    });

    // listen for Socket.IO event sent by backend when permissions are updated
    socket.on("receive-permissions-updated", ({ permissions }) => {
      // load updated permissions
      setPermissions(permissions);
    });

    // Update this user's editor permissions immediately when the page owner changes or removes their access
    socket.on("receive-user-page-access-updated", ({ userId, accessRole }) => {
      // get current user ID
      const currentUserId = user?._id || user?.id;

      // ignore role changes intended for another collaborator
      if (currentUserId?.toString() !== userId?.toString()) {
        return;
      }

      // set access role
      // if it's null, default to VIEWER
      setAccessRole(accessRole || "VIEWER");
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

    // listen for Socket.IO event sent by backend when another user moves their cursor inside the page
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
      socket.off("receive-page-updated");
      socket.off("receive-block-created");
      socket.off("receive-block-updated");
      socket.off("receive-block-deleted");
      socket.off("receive-blocks-reordered");
      socket.off("receive-comments-updated");
      socket.off("receive-attachments-updated");
      socket.off("receive-permissions-updated");
      socket.off("receive-user-page-access-updated");
      socket.off("receive-typing-started");
      socket.off("receive-typing-stopped");
      socket.off("receive-cursor-moved");
    };
  }, [socket, pageId, user, onPageUpdated]);

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

    // tell everyone else inside the page that blocks are reordered
    socket.emit("blocks-reordered", {
      pageId,
      blocks: reorderedBlocks,
    });
  };

  /**
   * Handle drag ends
   * This function is called when user releases mouse after done dragging
   *
   * dnd kit passes 1 event object containing:
   * active = the block being dragged
   * over = the block being dragged over
   * if block A is dragged onto block B position, then active = A, over = B
   * result: A is where B was at, B and other blocks below gets moved down 1 position
   */
  const handleDragEnd = async ({ active, over }) => {
    // if this user is VIEWER, do nothing
    if (!canEdit || !over || active.id === over.id) {
      return;
    }

    // find old position
    const oldIndex = blocks.findIndex((block) => block._id === active.id);
    // find new position
    const newIndex = blocks.findIndex((block) => block._id === over.id);

    // stop if either sortable ID cannot be found
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // get previous blocks
    const previousBlocks = blocks;

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
      // restore old ordering if saving fails
      setBlocks(previousBlocks);

      // display error message
      setError(error.response?.data?.message || "Failed to reorder blocks");
    }
  };

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

    // render updated title
    setTitle(res.data.page.title);

    // since Workspace owns the list of pages, when page title changes, Workspace needs to know
    // tell Workspace that this page has a new title, so Workspace can updates the sidebar
    onPageUpdated(res.data.page);

    // update every other collaborators's editor and sidebar
    socket.emit("page-updated", { pageId, page: res.data.page });
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
   * Viewers cannot trigger title autosave
   */
  const titleSaveStatus = useAutosave({
    value: title,
    onSave: savePageTitle,
    delay: 800,
    enabled: Boolean(pageId && page && canEdit),
  });

  /**
   * Create a page block
   * Default block = paragraph
   */
  const createBlock = async () => {
    // if this person is viewer, do nothing
    if (!canEdit) {
      return;
    }

    try {
      // call POST /api/blocks to create new page block
      const res = await api.post("/blocks", {
        pageId,
        type: "paragraph",
        content: { text: "" },
        order: blocks.length, // new block is placed last in order
      });

      // set the list of blocks with the new block is placed last
      setBlocks((prevBlocks) => [...prevBlocks, res.data.block]);

      // frontend sends message to everyone that a block is created
      socket.emit("block-created", { pageId, block: res.data.block });
    } catch (error) {
      // set error message
      setError(error.response?.data?.message || "Failed to create block");
    }
  };

  /**
   * Update a page block
   */
  const updateBlock = async (blockId, updates) => {
    // if this user is viewer, do nothing
    if (!canEdit) {
      return;
    }

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

      // throw error again so Block's useAutosave hoook can display its' "Save failed" status
      throw error;
    }
  };

  /**
   * Copy a block
   */
  const copyBlock = async (blockId) => {
    // if this user is viewer, do nothing
    if (!canEdit) {
      return;
    }

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
    // if this user is viewer, do nothing
    if (!canEdit) {
      return;
    }

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
    // if this user is not owner, do nothing
    if (!isOwner) {
      return;
    }

    try {
      // call PATCH /api/pages/:pageId/archieve to archive a page
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
    // if this user is not owner, do nothing
    if (!isOwner) {
      return;
    }

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
   * Open page-level comments
   */
  const openPageComments = () => {
    setSelectedCommentBlockId(null);
    setIsCommentsOpen(true);
  };

  /**
   * Open comments attached to one block
   */
  const openBlockComments = (blockId) => {
    setSelectedCommentBlockId(blockId);
    setIsCommentsOpen(true);
  };

  /**
   * Notify collaborators that the current user started typing
   */
  const emitTypingStarted = () => {
    socket.emit("typing-started", {
      pageId,
      user,
    });
  };

  /**
   * Notify collaborators that the current user stopped typing
   */
  const emitTypingStopped = () => {
    socket.emit("typing-stopped", {
      pageId,
      user,
    });
  };

  /**
   * Broadcast the current user's block and character position
   */
  const emitCursorMoved = (cursor) => {
    socket.emit("cursor-moved", {
      pageId,
      user,
      cursor,
    });
  };

  /**
   * Emit the latest comment threads to collaborators currently connected to this page
   */
  const emitCommentsUpdated = (threads) => {
    socket.emit("comments-updated", { pageId, threads });
  };

  /**
   * Emit the latest attachment list to collaborators currently connected to this page
   */
  const emitAttachmentsUpdated = (attachments) => {
    socket.emit("attachments-updated", {
      pageId,
      attachments,
    });
  };

  /**
   * Emit the latest permissions list to collaborators currently connected to this page
   */
  const emitPermissionsUpdated = (permissions) => {
    socket.emit("permissions-updated", {
      pageId,
      permissions,
    });
  };

  /**
   * Emit the latest user page acesss to other collaborators currently connected to this page
   */
  const emitUserPageAccessUpdated = ({ userId, accessRole }) => {
    socket.emit("user-page-access-updated", {
      pageId,
      userId,
      accessRole,
    });
  };

  /**
   * Create a new paragraph block directly after another block
   */
  const createBlockAfter = async (currentBlockId) => {
    // if current user is viewer, do nothing
    if (!canEdit) {
      return;
    }

    try {
      // get current position of current block inside block list
      const currentIndex = blocks.findIndex(
        (block) => block._id === currentBlockId,
      );
      if (currentIndex === -1) {
        // if block does not exist
        return null;
      }

      // new block must be right after current block
      const newBlockIndex = currentIndex + 1;

      // move every block after the insertion point down 1 position
      const shiftedBlocks = blocks.map((block, index) => {
        // blocks before the insertion point stay the same
        if (index < newBlockIndex) {
          return block;
        }
        // blocks after insertion point move down 1 position
        else {
          return { ...block, order: block.order + 1 };
        }
      });

      // call POST /api/blocks to create new block that has the same indent level as current block
      const res = await api.post("/blocks", {
        pageId,
        type: "paragraph",
        content: {
          text: "",
          indentLevel: blocks[currentIndex].content?.indentLevel || 0,
        },
        order: newBlockIndex,
      });

      // updated list of blocks
      const updatedBlocks = [
        // everything before the insertion point
        ...shiftedBlocks.slice(0, newBlockIndex),

        // the new block
        res.data.block,

        // everything after the insertion point
        ...shiftedBlocks.slice(newBlockIndex),
      ].map((block, index) => ({
        ...block,
        order: index,
      }));

      // update React state
      setBlocks(updatedBlocks);

      // save into db
      await saveBlockOrder(updatedBlocks);

      // notify other users inside the page that a new block was created
      socket.emit("block-created", { pageId, block: res.data.block });

      return res.data.block;
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create block");
    }
  };

  /**
   * Update block indentation level
   */
  const updateBlockIndent = async (blockId, newIndentLevel) => {
    // if this user is viewer, do nothing
    if (!canEdit) {
      return;
    }

    // find the block that should be indented
    const block = blocks.find((currentBlock) => currentBlock._id === blockId);
    if (!block) {
      // if block does not exist, do nothing
      return;
    }

    // update block
    await updateBlock(blockId, {
      content: { ...block.content, indentLevel: newIndentLevel },
    });
  };

  /**
   * Upload a file/image to a block
   */
  const uploadBlockFile = async (blockId, file) => {
    // if current user is viewer, do nothing
    if (!canEdit) {
      return;
    }

    try {
      // create FormData object to send to backend
      const uploadData = new FormData();

      // attach file
      uploadData.append("file", file);

      // attach page ID
      uploadData.append("pageId", pageId);

      // attach block ID
      uploadData.append("blockId", blockId);

      // send the file to backend with upload data and request headers
      const res = await api.post("/attachments/upload", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.attachment;
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to upload file to block",
      );

      return null;
    }
  };

  /**
   * A serialized representation / signature of the document content
   * The automatic-version timer restarts only when this content signature changes
   */
  const documentVersionSignature = JSON.stringify({
    title,
    blocks: blocks.map((block) => ({
      id: block._id,
      type: block.type,
      content: block.content,
      order: block.order,
    })),
  });

  /**
   * Automatically create a page snapshot after the page has remained unchanged/idle for 2 mins
   * Timer restarts whenever:
   * - title changes
   * - block content changes
   * - block order changes
   * - block is created / deleted
   */
  useEffect(() => {
    // if no page is loaded, no pageId exists or current user is not owner, do nothing
    if (!isPageLoaded || !pageId || !isOwner) {
      return;
    }

    // ignore the 1st page render because when the page first loads from MongoDB, nothing is changed, so no need to create automatic snapshot
    if (!hasPageLoadedRef.current) {
      hasPageLoadedRef.current = true;
      return;
    }

    // create a snapshot of the current page and blocks automatically
    const createAutomaticSnapshot = async () => {
      // if user isn't owner or page isn't loaded, do nothing
      if (!isOwner || !pageId) {
        return;
      }

      try {
        // call POST /api/versions/pages/:pageId to create automatic snapshot
        await api.post(`/versions/pages/${pageId}`, { source: "AUTO" });
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to create automatic snapshot",
        );
      }
    };

    // start a new timer
    autoVersionTimeoutRef.current = setTimeout(
      () => {
        // create a new automatic snapshot after 2 mins
        createAutomaticSnapshot();
      },
      2 * 60 * 1000,
    );

    // cleanup function
    // runs this before this effect runs again
    // cancel previous timer so multiple timers don't exist at the same time
    return () => {
      if (autoVersionTimeoutRef.current) {
        clearTimeout(autoVersionTimeoutRef.current);
      }
    };
  }, [pageId, documentVersionSignature, isOwner, isPageLoaded]);

  /**
   * While a page is loading, display loading message
   */
  if (!page) {
    return <div>Loading page...</div>;
  }

  // return UI
  return (
    <div className="editor">
      {/* Display the most recent request error */}
      {error && <p className="error">{error}</p>}

      {/* Presence bar: display online collaborators and typing activity */}
      <PresencePanel activeUsers={activeUsers} typingUsers={typingUsers} />

      {/* Page-level editor actions */}
      <EditorToolbar
        isOwner={isOwner}
        canEdit={canEdit}
        onOpenComments={openPageComments}
        onOpenAttachments={() => setIsAttachmentsOpen(true)}
        onOpenVersions={() => setIsVersionModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onArchivePage={archivePage}
        onDeletePage={deletePage}
      />

      {/* Version history and restoration UI */}
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        pageId={pageId}
        currentPage={page} // current page data for version diff feature
        currentBlocks={blocks} // current page blocks for version diff feature
        onRestore={restoreVersion}
      />

      {/* Owner-only page permission management UI */}
      <ShareModal
        pageId={pageId}
        isOpen={isShareModalOpen}
        permissions={permissions}
        onPermissionsChanged={setPermissions}
        onPermissionsUpdated={emitPermissionsUpdated}
        onUserAccessUpdated={emitUserPageAccessUpdated}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* A panel for page-level or block-level comment threads */}
      <CommentsPanel
        pageId={pageId}
        blockId={selectedCommentBlockId}
        isOpen={isCommentsOpen}
        threads={commentThreads}
        onThreadsChanged={setCommentThreads}
        onCommentsUpdated={emitCommentsUpdated}
        onClose={() => {
          setIsCommentsOpen(false);
          setSelectedCommentBlockId(null);
        }}
      />

      {/* A panel for file upload, download, preview, and deletion */}
      <AttachmentsPanel
        pageId={pageId}
        canEdit={canEdit}
        isOpen={isAttachmentsOpen}
        attachments={attachments}
        onAttachmentsChanged={setAttachments}
        onAttachmentsUpdated={emitAttachmentsUpdated}
        onClose={() => setIsAttachmentsOpen(false)}
      />

      {/* Editable page title for owners and editors */}
      <input
        className="editor-title"
        value={title}
        onChange={(event) => handleTitleChange(event.target.value)}
        disabled={!canEdit}
        placeholder="Untitled"
      />

      {/* Display title autosave state only to users who can edit */}
      {canEdit && (
        <p className="save-status">
          {titleSaveStatus === "saving" && "Saving title..."}
          {titleSaveStatus === "saved" && "Saved"}
          {titleSaveStatus === "error" && "Failed to save title"}
        </p>
      )}

      {/*
       * BlockList owns drag-and-drop rendering
       * Editor still owns block data and API/socket behavior
       */}
      <BlockList
        blocks={blocks}
        commentThreads={commentThreads}
        canEdit={canEdit}
        remoteCursors={remoteCursors}
        onDragEnd={handleDragEnd}
        onUpdateBlock={updateBlock}
        onDeleteBlock={deleteBlock}
        onCopyBlock={copyBlock}
        onCreateBlockAfter={createBlockAfter}
        onUpdateBlockIndent={updateBlockIndent}
        onComment={openBlockComments}
        onTypingStarted={emitTypingStarted}
        onTypingStopped={emitTypingStopped}
        onCursorMoved={emitCursorMoved}
        onUploadFile={uploadBlockFile}
      />

      {/* Only owners and editors may create new blocks */}
      {canEdit && (
        <button
          type="button"
          className="add-block-button"
          onClick={createBlock}
        >
          + Add text block
        </button>
      )}
    </div>
  );
};

export default Editor;
