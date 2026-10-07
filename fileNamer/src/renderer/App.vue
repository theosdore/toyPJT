<template>
  <div class="app-layout">
    <aside class="sidebar">
      <h1>FileNamer</h1>
      <SettingsPanel />
    </aside>
    <main class="workspace">
      <div v-if="!store.folderPath" class="welcome">
        <div class="folder-icon">📁</div>
        <p>Select a folder to rename files</p>
        <button @click="triggerFolderPick">Choose Folder</button>
      </div>
      <div v-else class="file-preview">
        <DiffTable />
        <div class="status-bar" v-if="store.isProcessing">
          <span>{{ Math.round(store.processingProgress) }}%</span>
        </div>
      </div>
    </main>
    <ToastContainer />
  </div>
</template>

<script setup>
import { useAppStore } from './state/store';
import SettingsPanel from './components/SettingsPanel.vue';
import DiffTable from './components/DiffTable.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useIpc } from './hooks/useIpc';
import { onMounted, onUnmounted } from 'vue';
import * as fs from 'node:fs';
import * as path from 'node:path';

const store = useAppStore();
const { call: ipcSelectFolder } = useIpc('select-folder');
const { invoke: ipcLoadFiles } = useIpc('load-files');

let dirs: string[] = [];

async function triggerFolderPick() {
  const result = await ipcSelectFolder();
  if (result?.ok && result.path) {
    store.setFolder(result.path);
    await loadFilesForFolder(result.path);
  }
}

async function loadFilesForFolder(folderPath: string) {
  try {
    const resp = await ipcLoadFiles(folderPath);
    if (resp?.ok && resp.files?.length) {
      store.setFiles(resp.files);
    }
  } catch {}
}

let dndListener: (e: DragEvent) => void;

function handleDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  const items = e.dataTransfer?.files;
  if (items && items.length > 0) {
    try {
      const root = path.dirname(items[0].path);
      dirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(root, d.name));
      if (dirs.length > 0) {
        windowIpc.send('folder-drop', { folderPath: dirs[0] });
      }
    } catch {}
  }
}

onMounted(() => {
  dndListener = handleDrop;
  document.addEventListener('dragover', handleDrop);
  document.addEventListener('drop', handleDrop);
});

onUnmounted(() => {
  document.removeEventListener('dragover', dndListener);
  document.removeEventListener('drop', dndListener);
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 260px;
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.sidebar h1 {
  font-size: 18px;
  margin: 0;
  color: #cba6f7;
}
.workspace {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #a6adc8;
  justify-content: center;
  height: 100%;
}
.folder-icon {
  font-size: 48px;
}
button {
  padding: 10px 24px;
  background: #89b4fa;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #1e1e2e;
  font-weight: 600;
}
button:hover { background: #74c7ec; }
.status-bar {
  padding: 8px;
  background: #313244;
  border-radius: 6px;
  text-align: center;
  font-weight: bold;
}
</style>
