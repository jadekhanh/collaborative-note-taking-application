const COLLABORATOR_COLORS = [
  "#d64545",
  "#2f80ed",
  "#27ae60",
  "#f2994a",
  "#9b51e0",
  "#219897",
  "#eb5757",
  "#6fcf97",
];

export function getUserColor(userId) {
  const value = String(userId || "unknown");
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

export function getUserInitial(username) {
  return username?.charAt(0).toUpperCase() || "?";
}
