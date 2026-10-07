import { contextBridge, ipcRenderer } from 'electron';

const expose = {
  ipc: {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    loadFiles: (path: string) => ipcRenderer.invoke('load-files', path),
    generateNames: (settings: unknown) => ipcRenderer.invoke('generate-names', settings),
    executeRename: (renames: unknown) => ipcRenderer.invoke('execute-rename', renames),
    dropLoad: (paths: string[]) => ipcRenderer.invoke('drop-load', paths),
    cancelOp: () => ipcRenderer.send('cancel-op'),
    onFolderDrop: (_callback: (result: any) => void) => {
      ipcRenderer.on('folder-drop-reply', (_event, data: any) => {
        _callback(data);
      });
    },
    exportState: (settings: Record<string, unknown>, files: Array<{ originalName: string; originalPath: string; ext: string; baseWithoutExt: string }>) => ipcRenderer.invoke('export-state', {
      settings,
      files,
    }),
    importState: (json: string) => ipcRenderer.invoke('import-state', {
      json,
    }),
  },
};

contextBridge.exposeInMainWorld('windowIpc', expose);
