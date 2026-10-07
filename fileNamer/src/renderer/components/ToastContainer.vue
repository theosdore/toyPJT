<template>
  <div id="toast-container" class="toast-container">
    <TransitionGroup name="toast-group">
      <div v-for="msg in toasts" :key="msg.id" class="toast">
        <span class="toast-msg">{{ msg.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAppStore } from '../state/store';

const store = useAppStore();
const toasts = ref([]);
const addToast = (text) => {
  const id = Date.now();
  toasts.value.push({ id, text });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 3000);
};

onMounted(() => {
  window.addEventListener('custom-toast', (e) => {
    addToast(e.detail);
  });
});
watch(store.pendingOperations, (ops) => {
  ops.forEach((op) => addToast(`Processing: ${op.label}`));
});
</script>

<style scoped>
.toast-container { position: fixed; top: 16px; right: 16px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
.toast {
  background: #313244;
  border: 1px solid #45475a;
  padding: 10px 16px;
  border-radius: 6px;
  color: #cdd6f4;
  font-size: 13px;
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
