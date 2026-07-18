// import built-in React functions: React Hooks
import { useEffect, useState } from "react";
import api from "../api/axios";
import { AuthContext } from "./AuthContext";

/**
 * Auth Provider = React component
 * Later we write:
 * <AuthProvider>
 *  <App />
 * </AuthProvider>
 *
 * children = everything inside <AuthProvider>
 */
export const AuthProvider = ({ children }) => {
  // useState is a React Hooks = frontend variable that updates the screen
  // later, to update user, do: user = setUser(newUser)
  // at first, user = null since use haven't logged in
  const [user, setUser] = useState(null);
  // later, to update loading, do loading = setLoading(newLoading)
  // at first, avoid initializing loading based on whether a token exists
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token"));

  // typedData = { username, email, password }
  const register = async (typedData) => {
    // calls Express endpoint POST api/auth/register
    // server returns response = { token, user }
    const response = await api.post("/auth/register", typedData);

    // set JWT token inside browser local storage
    localStorage.setItem("token", response.data.token);

    // set user so React knows who user is
    setUser(response.data.user);

    // return { token, user } to whenever register() is called
    return response.data;
  };

  const login = async (typedData) => {
    // call Express endpoint POST api/auth/login
    // server returns response = { token, user }
    const response = await api.post("/auth/login", typedData);

    // set JWT token inside browser local storage
    localStorage.setItem("token", response.data.token);

    // set user so React knows who user is
    setUser(response.data.user);

    // return { token, user } whenever login() is called
    return response.data;
  };

  const logout = () => {
    // remove JWT token from browser local storage
    localStorage.removeItem("token");

    // clear user from React
    setUser(null);
  };

  // useEffect() = run the following code (fetchMe()) whenever the component loads or when specified dependencies change
  useEffect(() => {
    // if token does not exist
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const loadUser = async () => {
      try {
        // call Express endpoint GET /api/auth/me
        // server returns response = { token, user }
        const response = await api.get("/auth/me");

        // set user so React knows who user is
        setUser(response.data.user);
      } catch (error) {
        console.error(error);

        // remove JWT token from browser local storage
        localStorage.removeItem("token");

        // clear user from React
        setUser(null);
      } finally {
        // we finished checking, stop showing loading spinner
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // return JSX
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
