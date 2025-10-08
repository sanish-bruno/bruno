const { ipcRenderer, contextBridge, webUtils } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, handler) => {
    // Deliberately strip event as it includes `sender`
    const subscription = (event, ...args) => handler(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  getFilePath(file) {
    const path = webUtils.getPathForFile(file);
    return path;
  }
});

// Expose Paw Assist API
contextBridge.exposeInMainWorld('pawAssist', {
  generate: (request) => ipcRenderer.invoke('pawAssist:generate', request),
  convertPostman: (request) => ipcRenderer.invoke('pawAssist:convertPostman', request),
  getSettings: () => ipcRenderer.invoke('pawAssist:getSettings'),
  updateSettings: (request) => ipcRenderer.invoke('pawAssist:updateSettings', request),
  testConnection: () => ipcRenderer.invoke('pawAssist:testConnection'),
  getProviders: () => ipcRenderer.invoke('pawAssist:getProviders')
});
