/**
 * Flow:
 * User types email and password
 * React stores what they type
 * User clicks register button
 * Axios POST /auth/register
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
 * This is Register page
 */
const Register = () => {
  // creates a navigation function that later changes the page after register
  const navigate = useNavigate();

  // get register function from AuthContext
  const { register } = useAuth();

  // typedData = { email, username, password } = data that user types in
  // "" at first
  const [typedData, setTypedData] = useState({
    email: "",
    username: "",
    password: "",
  });

  // error state
  // "" at first
  const [error, setError] = useState("");

  // handle input change by user that runs whenever user types
  // suppose user types email, then event.target = email textbox, event.target.name = email, event.target.value = detectivemochi@gmail.com
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
      // calls register() from AuthContext
      await register(typedData);

      // navigate to Dashboard once login succeeds
      navigate("/dashboard");
    } catch (error) {
      // set error message
      // try to read response, data, message. if any part doesn't exist, ouput "Registration failed"
      setError(error.response?.data?.message || "Registration failed");
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
        {/* display error if exists */}
        {error && <p className="error">{error}</p>}
        {/* create Email textbox */}
        <input
          name="email" // identifier label
          type="email" // what kind of data it should accept
          placeHolder="Email" // faint hint text displayed inside the box before user types in
          value={typedData.email}
          onChange={handleInputChange} // every keystroke calls handleInputChange(), updates state, React re-renders, textbox updates
        />
        {/* create Username textbox */}
        <input
          name="username" // identifier label
          type="username" // what kind of data it should accept
          placeHolder="Username" // faint hint text displayed inside the box before user types in
          value={typedData.username}
          onChange={handleInputChange} // every keystroke calls handleInputChange(), updates state, React re-renders, textbox updates
        />
        {/* create Password textbox */}
        <input
          name="password" // identifier label
          type="password" // what kind of data it accepts
          placeHolder="Password" // faint hint text displayed inside the box before user types in
          value={typedData.password}
          onChange={handleInputChange} // every keystroke calls handleInputChange(), updates state, React re-renders, textbox updates
        />
        {/* create Register button */}
        <button type="submit">Register</button>
        {/* create: Already have an account? Login 
         "Already have an account?" appears as normal static text
          "Login" is a clickable hyperlink */}
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
