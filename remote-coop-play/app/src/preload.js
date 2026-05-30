const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("remoteCoop", {
  setInputEnabled: (enabled) => ipcRenderer.invoke("input:set-enabled", enabled),
  sendInput: (payload) => ipcRenderer.invoke("input:send", payload),
  releaseAllKeys: () => ipcRenderer.invoke("input:release-all"),
  inputStatus: () => ipcRenderer.invoke("input:status"),
  listCaptureSources: () => ipcRenderer.invoke("capture:list-sources"),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  onDebugEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("debug:event", listener);
    return () => ipcRenderer.removeListener("debug:event", listener);
  }
});
