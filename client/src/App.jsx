/**
 * Frontend navigation:
 * /login -> login page
 * /register -> register page
 * /dashboard -> dashboard page, only if logged in
 * /workspaces/:workspaceId -> workspace page, only if logged in
 * anything else -> redirect to dashboard
 */

/**
 * built-in tools from React Router:
 * BrowserRouter = lets React use normal browser url
 * Navigate = redirects the user to another page
 * Route = defines 1 url path
 * Routes = container for all route definitions
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// import page components where each one is a screen in the app
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Workspace from "./pages/Workspace";

// create a ProtectedRoute component
// this one is for pages that is only visible after logged in
// E.g.,: <Protected Route> <Dashboard /> </ProtectedRoute>
const ProtectedRoute = ({ children }) => {
  // get user and loading state from AuthContext
  const { user, loading } = useAuth();

  // while auth is being checked, show Loading... text
  // prevent React from redirecting too early before it knows if the user is logged in
  if (loading) {
    return <div>Loading...</div>;
  }

  // if user is not logged in, direct to Login page
  if (!user) {
    // replace = replace the current browser history entry
    // so pressing back will not keep bouncing the user back to the protected page
    return <Navigate to="/login" replace />;
  }

  // if user is logged in, show the protected page (Dashboard page)
  // <Protected Route> <Dashboard /> </ProtectedRoute> becomes <Dashboard/> only when logged in
  return children;
};

// create a PublicRoute component
// this one is for pages that should be visible when logged out, like login/register
// E.g.,: <PublicRoute> <Login /> </PublicRoute>
const PublicRoute = ({ children }) => {
  // get user and loading state from AuthContext
  const { user, loading } = useAuth();

  // while auth is being checked, show Loading... text
  // prevent React from redirecting too early before it knows if the user is logged in
  if (loading) {
    return <div>Loading...</div>;
  }

  // if user is logged in, direct them to dashboard
  if (user) {
    // replace = replace the current browser history entry
    // so pressing back will not keep bouncing the user back to the protected page
    return <Navigate to="/dashboard" replace />;
  }

  // if user is not logged in, direct to the public page (login)
  // <PublicRoute> <Login /> </PublicRoute> becomes <Login/> when logged out
  return children;
};

/**
 * App
 *
 * React Router route decides which component appears on the screen when user opens the App
 * Similar to backend, Express route decides which controller handles request
 *
 * Flow when user opens the App:
 * Open browser url
 * React Router checks path
 * PublicRoute / ProtectedRoute checks login state
 * Correct page component appears:
 * - If user is still logged in, show Dashboard page
 * - If user is logged out, show Login page
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        // Login route: show Login through PublicRoute: if user is logged out,
        show Login; if user is already logged in, show Dashboard
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        // Register route: show Register through PublicRoute
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        // Dashboard route: show Dashboard through ProtectedRoute: if user is
        already logged in, show Dashboard; if logged out, show Login
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        // Workspace route: show Workspace through ProtectedRoute: if user is
        already logged in, show Workspace; if logged out, show Login
        <Route
          path="/workspaces/:workspaceId"
          element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          }
        />
        // Other Routes: redirect to Dashboard
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
