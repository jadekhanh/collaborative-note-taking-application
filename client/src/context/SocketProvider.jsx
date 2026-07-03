import { useEffect } from "react";
import socket from "../sockets/socket";
import { useAuth } from "./AuthContext";
import { SocketContext } from "./SocketContext";

// create new provider SocketProvider that stores socket and makes the socket available in entire app
// children = App
export const SocketProvier = ({ children }) => {
  // get current user
  const user = useAuth();

  // useEffect = run this code after whenever user is renderered
  useEffect(() => {
    // if user exists and socket is not connected
    if (user && !socket.connected) {
      // then connect
      socket.connect();
    }

    // if user does not exist and socket is connected
    if (!user && socket.connected) {
      // then disconnect
      socket.disconnect();
    }
  }, [user]);

  // return UI
  return (
    // put socket inside socket context
    // SocketProvider stores socket so every child component can use it
    // SocketProvider wraps around the App
    <SocketContext.Provider value={socket}>
      {/* children = App */}
      {children}
    </SocketContext.Provider>
  );
};
