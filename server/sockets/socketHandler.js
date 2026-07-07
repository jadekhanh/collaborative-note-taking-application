/**
 * A socket = one live connection between one browswer tab and the server
 * Visual:
 * Jade's browser tab <------ live socket -------> server
 * Maurice Macaroni's browser tab <------ live socket -------> server
 *
 * Unlike normal HTTP: request -> response -> done
 * Socket.IO stays connected: browser <-> server so either side can send events anytime
 *
 * socketHandler:
 * Tracks: which users are currently viewing each page?
 * Broadcast events: block created, block updated, cursor moved, user joined, user typing, user left
 */

/**
 * Create an in-memory map that stores active users inside pages
 * Visual:
 * {
 *  page123 => {
 *      socketA => {userId: 1, username: "Milu"},
 *      socketB => {userId: 2, username: "Ducko"},
 *      }
 * }
 * This map stores in server memory, not MongoDB. When server restarts, it resets
 * key = pageId, value = user Map
 */
const activeUsersByPage = new Map();

/**
 * Get active users in a page
 */
const getPageUsers = (pageId) => {
  // ?.values() = if the page exists, get the values, if page not exist, don't crash and return []
  // Array.from() = converts map into normal array list []
  return Array.from(activeUsersByPage.get(pageId)?.values() || []);
};

/**
 * Main socket handler that receives io
 * io = whole Socket.IO server = all connected sockets
 * socket = one specific user's connection
 */
const socketHandler = (io) => {
  // whenever a browser (socket) connects, io run this function
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // listen for frontend event called "join-page" saying this user joins the page
    socket.on("join-page", ({ pageId, user }) => {
      // socket joins Socket.IO room named after the page
      // Ex: room page123: Milu socket, Ducko socket
      socket.join(pageId);

      // check if we're tracking this page's user map
      // if not create a new empty user map for this page
      if (!activeUsersByPage.has(pageId)) {
        activeUsersByPage.set(pageId, new Map());
      }

      // inside this page's user map, store this socket
      // key = socket.id, value = { socketId, userId, username, avatarUrl }
      activeUsersByPage.get(pageId).set(socket.id, {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl || "",
      });

      // io sends an event called "page-users-updated" to everyone in that page room, including the user who just joined
      io.to(pageId).emit("page-users-updated", {
        // send pageId and updated active users list
        // frontend can now show which users are currently here
        pageId,
        users: getPageUsers(pageId),
      });
    });

    // listen for frontend event called "leave-page" saying this user leaves the page
    socket.on("leave-page", ({ pageId }) => {
      // socket leaves Socket.IO room named after the page
      socket.leave(pageId);

      // check if we're tracking this page's user map
      if (activeUsersByPage.has(pageId)) {
        // remove this socket from the page's user map
        activeUsersByPage.get(pageId).delete(socket.id);

        // io sends an event called "page-users-updated" to everyone in the page room
        io.to(pageId).emit("page-users-updated", {
          // send pageId and updated active users list
          // frontend can now show which users are currently here
          pageId,
          users: getPageUsers(pageId),
        });
      }
    });

    // listen for frontend event called "block-created" saying a new block is created
    socket.on("block-created", ({ pageId, block }) => {
      // socket sends the new block to everyone in the page
      socket.to(pageId).emit("receive-block-created", { block });
    });

    // listen for frontend event called "block-updated" saying a block is updated
    socket.on("block-updated", ({ pageId, block }) => {
      // socket sends the updated block to everyone in the page
      socket.to(pageId).emit("receive-block-updated", { block });
    });

    // listen for frontend event called "block-deleted" saying a block is deleted
    socket.on("block-deleted", ({ pageId, blockId }) => {
      // socket tells everyone in the room to remove block with this id from the screen
      socket.to(pageId).emit("receive-block-deleted", { blockId });
    });

    // listen for frontend event called "blocks-reordered" saying blocks are reordered
    socket.on("blocks-reordered", ({ pageId, blocks }) => {
      // socket tells everyone in the room to reorder blocks
      socket.to(pageId).emit("receive-blocks-reordered", { blocks });
    });

    // listen for frontend event called "cursor-moved" listening for cursor movement
    socket.on("cursor-moved", ({ pageId, user, cursor }) => {
      // socket tells everyone where the user's cursor moved
      socket.to(pageId).emit("receive-cursor-moved", {
        user,
        // cursor = { x, y } = location of the cursor
        cursor,
      });
    });

    // listen for frontend event called "typing-started" saying "Ducko is typing ..."
    socket.on("typing-started", ({ pageId, user }) => {
      socket.to(pageId).emit("receive-typing-started", { user });
    });

    // listen for frontend event called "typing-stopped" to remove the typing indicator
    socket.on("typing-stopped", ({ pageId, user }) => {
      socket.to(pageId).emit("receive-typing-stopped", { user });
    });

    // runs automatically when socket disconnects
    socket.on("disconnect", () => {
      // loop through every page being tracked
      for (const [pageId, usersMap] of activeUsersByPage.entries()) {
        // if this disconnected socket was inside the page
        if (usersMap.has(socket.id)) {
          // remove that socket from the page
          usersMap.delete(socket.id);

          // io sends "page-users-updated" event to remaining users inside the page
          io.to(pageId).emit("page-users-updated", {
            // sends new active users list
            pageId,
            users: getPageUsers(pageId),
          });

          // if no one is on the page
          if (usersMap.size === 0) {
            // delete the page from map
            activeUsersByPage.delete(pageId);
          }
        }
      }

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
