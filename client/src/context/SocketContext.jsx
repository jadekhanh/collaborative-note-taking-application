import { createContext, useContext } from "react";

// create new context SocketContext that stores socket connection
export const SocketContext = createContext(null);

// create custom hook that reads socket from Context
export const useSocket = () => {
  return useContext(SocketContext);
};
