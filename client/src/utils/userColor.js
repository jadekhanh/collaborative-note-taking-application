/**
 * Array of colors for remote collaborators
 * Each collaborator is assigned a unique color based on their user ID
 */
const COLLABORATOR_COLORS = [
  "#a888b5",
  "#efb6c8",
  "#d0e8c5",
  "#ffe3e3",
  "#e5d9f2",
  "#ffc6c6",
  "#f3d7ca",
  "#a2d2df",
];

/**
 * Converts a user ID into a hash code and use the hash code to select a color from the COLLABORATOR_COLORS array
 * A user will always have the same hash, hence the same color
 */
export function getUserColor(userId) {
  const value = String(userId || "unknown");
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

/**
 * Get the first letter of the username and convert it to uppercase
 * If the username is not provided, return ?
 */
export function getUserInitial(username) {
  return username?.charAt(0).toUpperCase() || "?";
}
