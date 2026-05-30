const path = require("path");
const { spawn } = require("child_process");
const { normalizeInput, ALLOWED_CODES } = require("./key-policy");

function createInputInjector() {
  let enabled = false;
  let helper = null;
  let helperReady = false;
  let helperError = null;
  const pressed = new Set();

  function ensureHelper() {
    if (process.platform !== "win32") {
      helperError = "Remote input injection is currently implemented for Windows only.";
      return false;
    }

    if (helper && helper.exitCode === null) return true;

    const helperPath = path.join(__dirname, "..", "native", "windows-key-helper.ps1");

    helperReady = false;
    helperError = null;

    helper = spawn(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        helperPath
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      }
    );

    helper.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8").trim();
      if (!text) return;
      if (text.includes("READY")) helperReady = true;
      console.log("[key-helper]", text);
    });

    helper.stderr.on("data", (chunk) => {
      helperError = chunk.toString("utf8").trim();
      console.error("[key-helper-error]", helperError);
    });

    helper.on("exit", (code) => {
      helperReady = false;
      if (code !== 0 && code !== null) {
        helperError = `Keyboard helper exited with code ${code}.`;
      }
      helper = null;
      pressed.clear();
    });

    return true;
  }

  function sendToHelper(payload) {
    if (!ensureHelper() || !helper || !helper.stdin.writable) {
      return { ok: false, error: helperError || "Keyboard helper is not available." };
    }

    helper.stdin.write(`${JSON.stringify(payload)}\n`);
    return { ok: true };
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) ensureHelper();
    if (!enabled) releaseAll();
  }

  function handleRemoteInput(payload) {
    const normalized = normalizeInput(payload);
    if (!normalized) {
      return { ok: false, ignored: true, reason: "Key not allowed." };
    }

    if (!enabled) {
      return { ok: false, ignored: true, reason: "Remote input disabled by host." };
    }

    if (normalized.action === "down") {
      if (pressed.has(normalized.code)) return { ok: true, ignored: true, reason: "Already pressed." };
      pressed.add(normalized.code);
    } else {
      pressed.delete(normalized.code);
    }

    return sendToHelper(normalized);
  }

  function releaseAll() {
    for (const code of Array.from(pressed)) {
      sendToHelper({ action: "up", code });
      pressed.delete(code);
    }
    return { ok: true };
  }

  function shutdown() {
    try { releaseAll(); } catch {}
    if (helper) {
      try { helper.stdin.end(); } catch {}
      try { helper.kill(); } catch {}
    }
    helper = null;
    helperReady = false;
    enabled = false;
    pressed.clear();
  }

  function status() {
    return {
      enabled,
      helperReady,
      helperError,
      allowedCodes: Array.from(ALLOWED_CODES),
      pressed: Array.from(pressed)
    };
  }

  return {
    setEnabled,
    handleRemoteInput,
    releaseAll,
    shutdown,
    status
  };
}

module.exports = {
  createInputInjector
};
