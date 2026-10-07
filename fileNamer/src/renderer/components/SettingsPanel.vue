<template>
  <form @submit.prevent="emitGenerate" class="settings-grid">
    <div v-if="!store.folderPath" class="dnd-zone" @drop="handleFolderDrop"
         @dragover.prevent style="border: 2px dashed #45475a; border-radius: 8px; padding: 16px; cursor: pointer;">
      <p>📁 Drop a folder here or click "Choose Folder"</p>
    </div>
    <div v-else class="form-group">
      <label>Template Pattern</label>
      <input v-model="settings.template" placeholder='e.g. {DATE}_{NUMBER}.{EXT}' /> 
      <small>Use: DATE, NUMBER, NAME, ORIGINAL, EXT</small>
    </div>
    <div class="form-group">
      <label>Date Format</label>
      <select v-model="settings.dateFormat">
        <option value="yyyy-MM-dd">yyyy-MM-dd</option>
        <option value="yyyy_MM_DD">yyyy_MM_DD</option>
        <option value="yyyyMMdd">yyyyMMdd</option>
        <option value="yyyy년 MM월 dd일">Korean</option>
      </select>
    </div>
    <div class="form-group">
      <label>Grouping Mode</label>
      <select v-model="settings.groupMode">
        <option value="day">By Date (yyyy-MM-dd)</option>
        <option value="all">All Files Single Sequence</option>
        <option value="no-date">Files Without Dates Only</option>
        <option value="pattern">By Pattern</option>
        <option value="prefix">By Prefix Length</option>
        <option value="byExt">By Extension</option>
        <option value="creation">Creation Order</option>
      </select>
    </div>
    <div class="form-group">
      <label>Padding Digits</label>
      <input type="number" v-model.number="settings.paddedDigits" min="1" max="7" />
    </div>
    <div v-if="settings.groupMode === 'pattern' || settings.groupMode === 'prefix'" class="form-group">
      <label v-if="settings.groupMode === 'pattern'">Pattern Filter</label>
      <label v-else>Prefix Len</label>
      <input v-model="settings.filterValue" placeholder="keyword or length" />
    </div>
    <div v-if="settings.groupMode === 'byExt'" class="form-group extension-list">
      <label>Extensions</label>
      <div class="ext-chips">
        <span v-for="e in settings.exts" :key="e" class="chip">{{ e }}</span>
      </div>
    </div>
    <div class="form-group ops-section">
      <label>Text Operations</label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.ops.uppercase" /> UPPERCASE
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.ops.lowercase" /> lowercase
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.ops.titleCase" /> Title Case
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.ops.trimWhitespace" /> Trim Whitespace
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.ops.spaceToUnderscore" /> Space → _
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.deletePrefix" /> Strip Prefix <input v-model="settings.deletePrefixLen" placeholder="len" style="width:60px" />
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.deleteSuffix" /> Strip Suffix <input v-model="settings.deleteSuffixLen" placeholder="len" style="width:60px" />
      </label>
      <label class="toggle-row">
        <input type="checkbox" :model-value="settings.replaceWith.length > 0" @change="addReplaceEntry" /> Replace
      </label>
      <div v-if="settings.replaceWith.length" class="replace-block">
        <div v-for="(entry, i) in settings.replaceWith" :key="i">
          <input v-model="entry.find" placeholder="Find" style="margin-top:4px" />
          <span style="color:#89b4fa">→</span>
          <input v-model="entry.replace" placeholder="Replace" style="margin-left:8px" />
        </div>
      </div>
      <label class="toggle-row">
        <input type="checkbox" :model-value="settings.changeExtension !== undefined" /> Change Ext
      </label>
      <label class="toggle-row">
        <input type="checkbox" :model-value="settings.prefix !== undefined" /> Add Prefix <input v-model="settings.prefix" placeholder="prefix" style="width:100px" />
      </label>
      <label class="toggle-row">
        <input type="checkbox" :model-value="settings.suffix !== undefined" /> Add Suffix <input v-model="settings.suffix" placeholder="suffix" style="width:100px" />
      </label>
      <label class="toggle-row">
        <input type="checkbox" :model-value="settings.deleteText !== undefined" /> Delete Text <input v-model="settings.deleteText" placeholder="text to delete" style="width:100px" />
      </label>
    </div>
    <div class="action-row top-actions">
      <button @click="importSettings" ref="importBtn">Import Options</button>
      <button @click="exportSettings">Export Options</button>
      <button @click="cancelAllOps" :disabled="store.pendingOperations.length === 0">Cancel All Pending</button>
    </div>
    <div class="action-row">
      <button type="submit" :disabled="!store.allFiles.length">Generate Names</button>
      <button @click="emitExecute" type="button" :disabled="!store.currentResults.length" class="primary">Apply Changes</button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { useAppStore } from '../state/store';
import { on } from 'vue';

const emit = defineEmits(['generate']);
const store = useAppStore();

const defaultSettings = {
  template: '{DATE}_{NUMBER}.{EXT}',
  dateFormat: 'yyyy-MM-dd',
  groupMode: 'all',
  paddedDigits: 3,
  filterValue: '',
  exts: [],
  ops: {
    uppercase: false, lowercase: false, titleCase: false,
    trimWhitespace: false, spaceToUnderscore: false,
    deletePrefix: false, deleteSuffix: false,
    deleteText: '', replaceWith: []
  },
  prefix: '',
  suffix: '',
  changeExtension: '',
  deletePrefix: false,
  deletePrefixLen: '',
  deleteSuffix: false,
  deleteSuffixLen: '',
};

const settings = reactive({ ...defaultSettings });

watch(() => settings.ops.replaceWith, () => {}, { deep: true });

function addReplaceEntry() {
  settings.ops.replaceWith.push({ find: '', replace: '' });
}

function getCheckedRenames(): Array<{ source: string; dest: string }> {
  const checkedResultNames = new Map<number, string>();
  for (const idx of store.checkedIndices) {
    if (idx < store.currentResults.length) {
      checkedResultNames.set(idx, store.currentResults[idx].newName);
    }
  }
  return store.allFiles
    .filter((f: any, i: number) => store.checkedIndices.has(i))
    .map((f: any, i: number) => ({
      source: f.originalPath,
      dest: checkedResultNames.get(i) ?? '',
    }));
}

async function emitGenerate() {
  emit('generate', {
    ...settings,
    folderPath: store.folderPath || '',
    fileList: store.allFiles.map((f: any) => ({ originalName: f.originalName, ext: f.ext || '' })),
  });
}

async function emitExecute() {
  const entries = getCheckedRenames();
  if (entries.length === 0) return;

  try {
    const reply = await windowIpc.executeRename(entries);

    store.addPendingOp({
      id: Date.now(),
      label: `${reply.successCount}/${reply.total} files renamed`,
    });

    if (reply.ok && reply.failures.length > 0) {
      alert(`Renamed ${reply.successCount} files.\n${reply.failures.map(f => `  - ${f.source}: ${f.error}`).join('\n')}`);
    }
  } catch (err) {
    alert(`Rename failed: ${String(err)}`);
  }
}

async function handleFolderDrop(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer?.files?.length > 0) {
    const root = path.dirname(e.dataTransfer.files[0].path);
    dirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(root, d.name));
    if (dirs.length > 0) {
      store.folderPath = dirs[0];
      await loadFilesForFolder(dirs[0]);
    }
  }
}

let dirs: string[] = [];

async function loadFilesForFolder(folderPath: string) {
  try {
    const resp = await windowIpc.loadFiles(folderPath);
    if (resp?.ok && resp.files?.length) {
      store.setFiles(resp.files);
    }
  } catch {}
}

async function cancelAllOps() {
  store.cancelAllPending();
}

async function exportSettings() {
  const data = store.getExportData();
  try {
    const json = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fileNamer_options_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
}

async function importSettings() {
  const input = ref(null as HTMLInputElement | null);
  if (importBtn) input.value = importBtn;
  if (!input.value) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const base64 = ev.target?.result as string;
      const parsed = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      store.applyImportData(parsed);
      store.refreshUI();
    } catch {
      alert('Invalid import file');
    }
  };
  input.value?.click();
}

const importBtn = ref<HTMLButtonElement | null>(null);
</script>

<style scoped>
.settings-grid { display: flex; flex-direction: column; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 12px; color: #a6adc8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
input[type="text"], input[type="number"], select, button {
  padding: 7px 10px;
  border-radius: 5px;
  border: 1px solid #45475a;
  background: #313244;
  color: #cdd6f4;
  font-size: 12px;
}
button { cursor: pointer; border: none; }
.toggle-row { display: flex; align-items: center; gap: 6px; cursor: pointer; color: #a6adc8; font-size: 12px; }
.toggle-row input[type="checkbox"] { accent-color: #89b4fa; }
.extension-list .ext-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.chip { background: #45475a; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
.action-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.action-row.top-actions { flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
button.primary { background: #a6e3a1; color: #1e1e2e; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
.dnd-zone { min-height: 60px; text-align: center; }
.dnd-zone p { font-size: 13px; color: #cba6f7; }
.replace-block { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
</style>
