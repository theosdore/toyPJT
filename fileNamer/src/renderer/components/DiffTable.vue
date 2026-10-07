<template>
  <table v-if="store.currentResults.length" class="diff-table">
    <thead>
      <tr>
        <th><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
        <th>Group</th>
        <th>Original</th>
        <th>New Name</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, idx) in store.currentResults" :key="idx">
        <td><input type="checkbox" :checked="store.checkedIndices.has(idx)" @change="store.setChecked(idx, $event.target.checked)" /></td>
        <td>{{ item.groupLabel }}</td>
        <td>{{ item.originalName }}</td>
        <td>{{ item.newName }}</td>
        <td><span :class="item.conflict ? 'conflict-badge' : 'ok-badge'">{{ item.conflict ? 'Conflict!' : 'OK' }}</span></td>
      </tr>
    </tbody>
  </table>
  <div v-else class="empty-state">
    <p>Click "Generate Names" to see preview</p>
  </div>
</template>

<script setup>
import { useAppStore } from '../state/store';

const store = useAppStore();
const allChecked = () => {
  return store.allFiles.length > 0 && store.checkedIndices.size === store.allFiles.length;
};
</script>

<style scoped>
.diff-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.diff-table th { background: #313244; padding: 8px 12px; text-align: left; color: #a6adc8; white-space: nowrap; }
.diff-table td { padding: 6px 12px; border-bottom: 1px solid #45475a; }
.ok-badge { color: #a6e3a1; font-weight: bold; }
.conflict-badge { color: #f38ba8; font-weight: bold; }
.empty-state { text-align: center; color: #6c7086; padding: 40px; }
</style>
