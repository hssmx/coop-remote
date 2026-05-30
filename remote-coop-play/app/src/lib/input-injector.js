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

function createInputInjector(onLog = () => {}) {
  let enabled = false;
  let helper = null;
  let helperReady = false;
  let helperError = null;
  let lastHelperLine = null;
  const pressed = new Set();

  function log(level, message, data = undefined) {
    try { onLog({ level, message, data }); } catch {}
  }

  function ensureHelper() {
    if (process.platform !== "win32") {
      helperError = "Remote input injection is currently implemented for Windows only.";
      log("error", helperError);
      return false;
    }

    if (helper && helper.exitCode === null) return true;

    const helperPath = resolveKeyboardHelperPath();

    if (!fs.existsSync(helperPath)) {
      helperError = `Keyboard helper not found at: ${helperPath}`;
      log("error", helperError);
      return false;
    }

    helperReady = false;
    helperError = null;
    lastHelperLine = null;

    log("info", "Starting keyboard helper", { helperPath });

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
      const lines = chunk.toString("utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        lastHelperLine = line;
        if (line.includes("READY")) helperReady = true;
        log(line.includes("ERROR") ? "error" : "input", `helper: ${line}`);
      }
    });

    helper.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8").trim();
      if (!text) return;
      helperError = text;
      lastHelperLine = text;
      log("error", `helper stderr: ${text}`);
    });

    helper.on("error", (error) => {
      helperError = error.message;
      log("error", `Keyboard helper spawn failed: ${helperError}`);
      helper = null;
      helperReady = false;
      pressed.clear();
    });

    helper.on("exit", (code) => {
      helperReady = false;
      if (code !== 0 && code !== null) {
        helperError = `Keyboard helper exited with code ${code}.`;
      }
      log(code === 0 || code === null ? "info" : "error", `Keyboard helper exited`, { code });
      helper = null;
      pressed.clear();
    });

    return true;
  }

  function sendToHelper(payload) {
    if (!ensureHelper() || !helper || !helper.stdin.writable) {
      return { ok: false, error: helperError || "Keyboard helper is not available.", lastHelperLine };
    }

    try {
      helper.stdin.write(`${JSON.stringify(payload)}\n`);
      return { ok: true, lastHelperLine };
    } catch (error) {
      helperError = error.message;
      log("error", "Failed writing to keyboard helper", { error: helperError, payload });
      return { ok: false, error: helperError, lastHelperLine };
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
      return { ok: false, ignored: true, reason: "Key not allowed.", payload };
    }

    if (!enabled) {
      return { ok: false, ignored: true, reason: "Remote input disabled by host.", payload: normalized };
    }

    if (normalized.action === "down") {
      if (pressed.has(normalized.code)) return { ok: true, ignored: true, reason: "Already pressed.", payload: normalized };
      pressed.add(normalized.code);
    } else {
      pressed.delete(normalized.code);
    }

    const result = sendToHelper(normalized);
    return { ...result, payload: normalized, pressed: Array.from(pressed) };
  }

  function releaseAll() {
    for (const code of Array.from(pressed)) {
      sendToHelper({ action: "up", code });
      pressed.delete(code);
    }
    return { ok: true, pressed: [] };
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
      lastHelperLine,
      allowedCodes: Array.from(ALLOWED_CODES),
      pressed: Array.from(pressed),
      helperPath: resolveKeyboardHelperPath(),
      platform: process.platform,
      packaged: Boolean(app && app.isPackaged)
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
