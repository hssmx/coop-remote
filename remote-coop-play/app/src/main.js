const path = require("path");
const { app, BrowserWindow, ipcMain, session, desktopCapturer, shell } = require("electron");
const { createInputInjector } = require("./lib/input-injector");

let mainWindow;
const inputInjector = createInputInjector();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 720,
    title: "Remote Coop Play",
    backgroundColor: "#080B12",
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
    console.warn("Display media handler not available:", error.message);
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
  inputInjector.setEnabled(Boolean(enabled));
  return inputInjector.status();
});

ipcMain.handle("input:send", async (_event, payload) => {
  return inputInjector.handleRemoteInput(payload);
});

ipcMain.handle("input:release-all", async () => {
  return inputInjector.releaseAll();
});

ipcMain.handle("input:status", async () => {
  return inputInjector.status();
});

ipcMain.handle("app:open-external", async (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});
