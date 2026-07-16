/**
 * Flow:
 * User types email and password
 * React stores what they type
 * User clicks login button
 * Axios POST /auth/login
 * Express
 * MongoDB
 * JWT + User returned
 * AuthContext saves user
 * React navigate to Dashboard
 * Dashboard UI is rendered
 */

import { useState } from "react";
// Link = frontend hyperlink. React uses hyperlink to change page without reloading the website
// useNavigate = automatically moves to a new link after login succeeds instead of user clicking the new link to move forward
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * React component = a function that returns UI
 * This is Login Page
 */
const Login = () => {
  // creates a navigation function that later changes page after login
  const navigate = useNavigate();

  // get login function from AuthContext
  const { login } = useAuth();

  // typedData = { email, password } = data that user types in
  // "" at first
  const [typedData, setTypedData] = useState({ email: "", password: "" });

  // error state
  // "" at first
  const [error, setError] = useState("");

  // handle input change by user that runs whenever user types
  // suppose user types email, then event.target = <input>, event.target.name = email, event.target.value = detectivemochi@gmail.com
  const handleInputChange = (event) => {
    setTypedData({
      ...typedData,
      [event.target.name]: event.target.value,
    });
  };

  // handle submit when user submits
  const handleSubmit = async (event) => {
    // prevent HTML forms to reload the page automatically
    event.preventDefault();

    // clear previous error
    setError("");

    try {
      // calls login() from AuthContext
      await login({
        email: typedData.email.trim(),
        password: typedData.password,
      });

      // navigate to Dashboard once login succeeds
      navigate("/dashboard");
    } catch (error) {
      // set error message
      // try to read res, data, message. if any part doesn't exist, ouput "Login failed"
      setError(error.response?.data?.message || "Login failed");
    }
  };

  // return UI
  return (
    // create HTML
    <div className="auth-page">
      {/* create HTML form, when user submits, call handleSubmit() */}
      <form className="auth-card" onSubmit={handleSubmit}>
        {/* heading 1: page title */}
        <h1>Login</h1>

        {error && <p className="error">{error}</p>}
        {/* create Email textbox */}
        <input
          name="email" // identifier label
          type="email" // what kind of data it should accept
          placeholder="Email" // faint hint text displayed inside the box before user types in
          value={typedData.email}
          onChange={handleInputChange} // every keystroke calls handleInputChange(), updates state, React re-renders, textbox updates
          autoComplete="email"
          required
        />
        {/* create Password textbox */}
        <input
          name="password" // identifier label
          type="password" // what kind of data it accepts
          placeholder="Password" // faint hint text displayed inside the box before user types in
          value={typedData.password}
          onChange={handleInputChange} // every keystroke calls handleInputChange(), updates state, React re-renders, textbox updates
          autoComplete="current-password"
          required
        />
        {/* create Login button */}
        <button type="submit">Login</button>
        {/* create: No account? Register */}
        {/* "No account?"" appears as normal static text */}
        {/* "Register" is a clickable hyperlink */}
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
