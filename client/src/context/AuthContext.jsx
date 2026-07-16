// import built-in React functions: React hooks
import { createContext, useContext } from "react";

/**
 * Context = stores logged-in user in 1 place so every page in the frontend can access it = global storage for React
 * Without Context, we have to pass the user through every component in the app, which is very insufficient
 */
export const AuthContext = createContext(null);

// export hook
export const useAuth = () => {
  return useContext(AuthContext);
};
