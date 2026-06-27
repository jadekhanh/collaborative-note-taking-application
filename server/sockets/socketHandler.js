/**
 * io = entire Socket.IO server that controls all connected users/clients
 * socket = 1 specific client's connection that controls 1 user's browser tab
 * each user has their own socket and io listens to all sockets which means all connected users
 */

// passing Socket.IO server into this function
const socketHandler = (io) => {
    // .on() = Socket.IO listens for an event
    // "connection" = whenever a new client connects, run this function
    io.on("connection", (socket) => {
        // every socket has a unique socket ID
        console.log(`User connected: ${socket.id}`);

        // when this user sends a "join-page" event
        // this happens when user sends: socket.emit("join-page", pageId) when they join a document page
        socket.on("join-page", (pageID) => {
            // put this user into the room named after this page
            // so that user who doesn't join this page cannot receive edits from this page
            socket.join(pageID);
            console.log(`Socket ${socket.id} joined page ${pageID}`);

            // this user sends update ("user-joined") to everyone in the room except themselves
            socket.to(pageId).emit("user-joined", {
                // data being sent: socketId, pageId
                socketId: socket.id,
                pageId,
            });
        });

        // when this user sends a "leave-page" event
        // this happens when user sends: socket.emit("leave-page", pageId) when they leave a document page
        socket.on("leave-page", (pageId) => {
            // remove this user from that room
            socket.leave(pageId);
            console.log(`Socket ${socket.id} left page ${pageId}`);

            // this user sends update ("user-left") to everyone in the room except themselves
            socket.to(pageId).emit("user-left", {
                // data being sent
                socketId: socket.id,
                pageId,
            });
        });

        // when this user sends a "page-update" event
        // this happens when user sends: socket.emit("page-update", ({pageId, content})) when they type a content onto document page
        socket.on("page-update", ({pageId, content}) => {
            // this user sends update ("page-update") to everyone in the room except themselves
            socket.to(pageId).emit("receive-page-update", {
                pageId,
                content,
            });
        });

        // when this user disconnects
        // this happens when browser closes, internet disconnects, refresh page so Socket.IO automatically triggers this event
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};

// export this function so every file can uses it
module.exports = socketHandler;