import { contextBridge, ipcRenderer } from 'electron';

const expose = {
  ipc: {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    loadFiles: (path: string) => ipcRenderer.invoke('load-files', path),
    generateNames: (settings: unknown) => ipcRenderer.invoke('generate-names', settings),
    executeRename: (renames: unknown) => ipcRenderer.invoke('execute-rename', renames),
    dropLoad: (paths: string[]) => ipcRenderer.invoke('drop-load', paths),
    cancelOp: () => ipcRenderer.send('cancel-op'),
  },
};

contextBridge.exposeInMainWorld('windowIpc', expose);
