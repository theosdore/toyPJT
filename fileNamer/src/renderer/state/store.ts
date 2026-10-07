import { create } from 'zustand';

interface AppState {
  folderPath: string | null;
  allFiles: Array<{
    originalName: string;
    originalPath: string;
    ext: string;
    baseWithoutExt: string;
    extractDate: Date | null;
    groupKey: string;
  }>;
  currentResults: Array<{
    originalName: string;
    finalName: string;
    existsInDest: boolean;
  }>;
  pendingOperations: Array<{ id: string; label: string }>;
  isProcessing: boolean;
  processingProgress: number;
  checkedIndices: Set<number>;
  groupLabelColumn: string;
}

export const useAppStore = create<AppState>((set) => ({
  folderPath: null,
  allFiles: [],
  currentResults: [],
  pendingOperations: [],
  isProcessing: false,
  processingProgress: 0,
  checkedIndices: new Set(),
  groupLabelColumn: '',

  setFolder: (path: string) => set({ folderPath: path }),
  setFiles: (files: AppState['allFiles']) => set({ allFiles: files }),
  setResults: (results: AppState['currentResults']) => set({ currentResults: results }),
  setChecked: (idx: number, checked: boolean) =>
    set((s) => {
      const next = new Set(s.checkedIndices);
      if (checked) next.add(idx);
      else next.delete(idx);
      return { checkedIndices: next };
    }),
  toggleAllChecked: () =>
    set((s) => {
      if (!s.allFiles.length) return { checkedIndices: new Set() };
      const next = new Set(Array.from({ length: s.allFiles.length }, (_, i) => i));
      return { checkedIndices: next };
    }),
  clearChecks: () => set({ checkedIndices: new Set() }),
  addPendingOp: (op: AppState['pendingOperations'][0]) =>
    set((s) => ({ pendingOperations: [...s.pendingOperations, op] })),
  removePendingOp: (id: string) =>
    set((s) => ({
      pendingOperations: s.pendingOperations.filter((op) => op.id !== id),
    })),
  startProcessing: () => set({ isProcessing: true, processingProgress: 0 }),
  setProgress: (pct: number) =>
    set((s) => ({ processingProgress: pct })),
  finishProcessing: () => set({ isProcessing: false, processingProgress: 0 }),
}));
