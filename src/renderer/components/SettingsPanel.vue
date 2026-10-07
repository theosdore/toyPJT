<template>
  <form @submit.prevent="emitGenerate" class="settings-grid">
    <div class="form-group">
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
        <input type="checkbox" v-model="settings.trimWhitespace" /> Trim Whitespace
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.ops.spaceToUnderscore" /> Space → _
      </label>
      <label v-if="settings.ops.replaceWith.length" class="toggle-row">Replace: "{{ settings.ops.replaceWith[0].find }}" → "{{ settings.ops.replaceWith[0].replace }}"</label>
      <input v-model="settings.ops.replaceWith[0]?.find" placeholder="Find text" style="margin-top:4px" />
      <input v-model="settings.ops.replaceWith[0]?.replace" placeholder="Replace with" />
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.prefix !== undefined" /> Add Prefix <input v-model="settings.prefix" placeholder="prefix" style="width:100px" />
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.suffix !== undefined" /> Add Suffix <input v-model="settings.suffix" placeholder="suffix" style="width:100px" />
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="settings.deleteText !== undefined" /> Delete Text <input v-model="settings.deleteText" placeholder="text to delete" style="width:100px" />
      </label>
      <label class="toggle-row">
        <input type="checkbox" v-model="changeExtension !== undefined" /> Change Ext <input v-model="changeExtension" placeholder=".jpg" style="width:100px" />
      </label>
    </div>
    <div class="action-row">
      <button type="submit" :disabled="!store.allFiles.length">Generate Names</button>
      <button @click="emitExecute" type="button" :disabled="!store.currentResults.length" class="primary">Apply Changes</button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive, watch, defineEmits } from 'vue';
import { useAppStore } from '../state/store';

const emit = defineEmits(['generate', 'execute']);
const store = useAppStore();

const defaultSettings = {
  template: '{DATE}_{NUMBER}.{EXT}',
  dateFormat: 'yyyy-MM-dd',
  groupMode: 'day',
  paddedDigits: 4,
  filterValue: '',
  ops: { uppercase: false, lowercase: false, titleCase: false, trimWhitespace: false, spaceToUnderscore: false, replaceWith: [] },
  prefix: '',
  suffix: '',
  deleteText: '',
  changeExtension: '',
};

const settings = reactive({ ...defaultSettings });
const changeExtension = ref('');

watch(() => settings.ops.replaceWith, () => {
  if (!settings.ops.replaceWith[0]) {
    settings.ops.replaceWith.push({ find: '', replace: '' });
  }
}, { deep: true });

function emitGenerate() {
  emit('generate', { ...settings });
}

function emitExecute() {
  emit('execute');
}
</script>

<style scoped>
.settings-grid { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; color: #a6adc8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
input[type="text"], input[type="number"], select, button {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #45475a;
  background: #313244;
  color: #cdd6f4;
  font-size: 13px;
}
button { cursor: pointer; border: none; }
.toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #a6adc8; }
.toggle-row input[type="checkbox"] { accent-color: #89b4fa; }
.extension-list .ext-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip {
  background: #45475a;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}
.action-row { display: flex; gap: 8px; margin-top: 8px; }
button.primary { background: #a6e3a1; color: #1e1e2e; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
