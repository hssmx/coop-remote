const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("remoteCoop", {
  setInputEnabled: (enabled) => ipcRenderer.invoke("input:set-enabled", enabled),
  sendInput: (payload) => ipcRenderer.invoke("input:send", payload),
  releaseAllKeys: () => ipcRenderer.invoke("input:release-all"),
  inputStatus: () => ipcRenderer.invoke("input:status"),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url)
});
