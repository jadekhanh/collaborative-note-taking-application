/**
 * A panel displayed at the top of Editor to displays collaborators currently connected to the page and users who are actively typing
 */
const PresencePanel = ({ activeUsers, typingUsers }) => {
  return (
    <section className="presence-panel">
      <div className="presence-panel-header">
        <h3>People here</h3>

        <span>{activeUsers.length} online</span>
      </div>

      {/* Display every user currently connected to this page */}
      <div className="presence-user-list">
        {activeUsers.length === 0 ? (
          <p className="presence-empty">No active collaborators</p>
        ) : (
          activeUsers.map((activeUser) => {
            const isTyping = typingUsers.some(
              (typingUser) => typingUser._id === activeUser._id,
            );

            return (
              <div
                key={activeUser.socketId || activeUser._id}
                className="presence-user"
              >
                {/* Simple avatar using the first username letter */}
                <div className="presence-avatar">
                  {activeUser.username?.charAt(0).toUpperCase() || "?"}
                </div>

                <div className="presence-user-info">
                  <strong>{activeUser.username || "Unknown user"}</strong>
                  <span>{isTyping ? "Typing..." : "Viewing page"}</span>
                </div>

                <span className="online-indicator" />
              </div>
            );
          })
        )}
      </div>

      {/* Summarize typing activity below the online-user list */}
      {typingUsers.length > 0 && (
        <p className="typing-indicator">
          {typingUsers.map((typingUser) => typingUser.username).join(", ")}{" "}
          editing...
        </p>
      )}
    </section>
  );
};

export default PresencePanel;
