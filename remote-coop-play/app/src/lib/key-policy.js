const ALLOWED_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "Enter",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight"
]);

function normalizeInput(payload) {
  if (!payload || typeof payload !== "object") return null;

  const action = payload.action === "up" ? "up" : payload.action === "down" ? "down" : null;
  const code = typeof payload.code === "string" ? payload.code : null;

  if (!action || !code || !ALLOWED_CODES.has(code)) return null;

  return {
    action,
    code
  };
}

module.exports = {
  ALLOWED_CODES,
  normalizeInput
};
