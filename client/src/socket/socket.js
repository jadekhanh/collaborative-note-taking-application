import { io } from "socket.io-client";

/**
 * WebSocket = one connection that stays open
 * Flow:
 * Ducko types "Tacos"
 * Frontend
 * Socket
 * Backend
 * Other user's frontend
 * Their screen updates instantly without page refresh
 *
 * Create a socket connection to backend server that runs on localhost:5001
 *
 * Notes: Axios handles regular API requests while Socket.IO keeps everyone's screen synchronized in real time without refreshing the page or polling the server
 */
const socket = io("http://localhost:5001", {
  // if true, immediately connects to server once app starts without logging in
  autoConnect: false,
});

export default socket;
