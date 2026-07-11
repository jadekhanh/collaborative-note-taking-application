/**
 * User dropdown menu
 * Once clicked on, dropdown bar shows username, email, and logout button
 */
const UserProfileDropdown = ({ user, onLogout }) => {
  // return UI
  return (
    <div className="user-profile-dropdown">
      {/* Display username and email */}
      <div>
        <strong>{user.username}</strong>
        <p>{user.email}</p>
      </div>

      {/* Logout button */}
      <button onClick={onLogout}>Logout</button>
    </div>
  );
};

export default UserProfileDropdown;
