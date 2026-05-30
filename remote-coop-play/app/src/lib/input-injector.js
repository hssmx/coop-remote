const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { app } = require("electron");
const { normalizeInput, ALLOWED_CODES } = require("./key-policy");

function resolveKeyboardHelperPath() {
  const candidates = [];

  if (app && app.isPackaged) {
    candidates.push(
      path.join(process.resourcesPath, "app.asar.unpacked", "src", "native", "windows-key-helper.ps1"),
      path.join(process.resourcesPath, "src", "native", "windows-key-helper.ps1")
    );
  }

  candidates.push(
    path.join(__dirname, "..", "native", "windows-key-helper.ps1"),
    path.join(__dirname.replace("app.asar", "app.asar.unpacked"), "..", "native", "windows-key-helper.ps1")
  );

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }

  return candidates[0];
}

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

    const helperPath = resolveKeyboardHelperPath();

    if (!fs.existsSync(helperPath)) {
      helperError = `Keyboard helper not found at: ${helperPath}`;
      console.error(helperError);
      return false;
    }

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

    helper.on("error", (error) => {
      helperError = error.message;
      console.error("[key-helper-spawn-error]", helperError);
      helper = null;
      helperReady = false;
      pressed.clear();
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

    try {
      helper.stdin.write(`${JSON.stringify(payload)}\n`);
      return { ok: true };
    } catch (error) {
      helperError = error.message;
      return { ok: false, error: helperError };
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) ensureHelper();
    if (!enabled) releaseAll();
    return status();
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
      pressed: Array.from(pressed),
      helperPath: resolveKeyboardHelperPath()
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
