const path = require("path");
const { app, BrowserWindow, ipcMain, session, desktopCapturer, shell } = require("electron");
const { createInputInjector } = require("./lib/input-injector");

let mainWindow;

function emitDebug(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("debug:event", {
      at: new Date().toISOString(),
      source: "main",
      ...payload
    });
  }
}

const inputInjector = createInputInjector((entry) => emitDebug({ source: "input", ...entry }));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 740,
    title: "Remote Coop Play",
    backgroundColor: "#F5F7FB",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("closed", () => {
    inputInjector.shutdown();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    session.defaultSession.setDisplayMediaRequestHandler(
      async (_request, callback) => {
        const sources = await desktopCapturer.getSources({
          types: ["screen", "window"],
          thumbnailSize: { width: 900, height: 520 },
          fetchWindowIcons: true
        });

        const primary = sources.find((source) => source.name.toLowerCase().includes("screen")) || sources[0];

        callback({
          video: primary,
          audio: "loopback"
        });
      },
      { useSystemPicker: true }
    );
  } catch (error) {
    emitDebug({ level: "warn", message: `Display media handler not available: ${error.message}` });
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  inputInjector.shutdown();
});

app.on("window-all-closed", () => {
  inputInjector.shutdown();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("input:set-enabled", async (_event, enabled) => {
  const status = inputInjector.setEnabled(Boolean(enabled));
  emitDebug({ level: "info", message: `Remote input ${enabled ? "enabled" : "disabled"}`, data: status });
  return status;
});

ipcMain.handle("input:send", async (_event, payload) => {
  const result = inputInjector.handleRemoteInput(payload);
  emitDebug({ level: result.ok ? "input" : "error", message: `Input ${payload?.action || "?"} ${payload?.code || "?"}`, data: result });
  return result;
});

ipcMain.handle("input:release-all", async () => {
  const result = inputInjector.releaseAll();
  emitDebug({ level: "input", message: "Released all pressed keys", data: result });
  return result;
});

ipcMain.handle("input:status", async () => {
  const status = inputInjector.status();
  emitDebug({ level: "info", message: "Input status requested", data: status });
  return status;
});

ipcMain.handle("capture:list-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true
  });

  const mapped = sources.map((source) => ({
    id: source.id,
    name: source.name,
    type: source.id.startsWith("screen:") ? "screen" : "window",
    thumbnail: source.thumbnail && !source.thumbnail.isEmpty() ? source.thumbnail.toDataURL() : null
  }));

  emitDebug({ level: "info", message: "Capture sources listed", data: { count: mapped.length } });
  return mapped;
});

ipcMain.handle("app:open-external", async (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});
