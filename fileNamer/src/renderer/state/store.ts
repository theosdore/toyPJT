import { create } from 'zustand';

interface AppSettings {
  template: string;
  dateFormat: string;
  groupMode: string;
  paddedDigits: number;
  filterValue: string;
  exts: string[];
  folderPath: string | null;
  allFiles: Array<{
    originalName: string;
    originalPath: string;
    ext: string;
    baseWithoutExt: string;
    extractDate: Date | null;
    groupKey: string;
  }>;
}

const GROUPING_LABELS = ['all', 'day', 'no-date', 'pattern', 'prefix', 'byExt', 'creation'];

export interface SerializeRequest {
  settings: {
    template: string;
    dateFormat: string;
    groupMode: string;
    paddedDigits: number;
    filterValue: string;
    exts: string[];
  };
  files: Array<{
    originalName: string;
    originalPath: string;
    ext: string;
    baseWithoutExt: string;
  }>;
}

export type ResultSortField = '' | 'label' | 'originalName' | 'finalName';
export type ResultSortDir = 'asc' | 'desc';

interface InitialStore {
  selectedFileCount: number;
  activeTab: string;
  theme: 'dark' | 'light';
  sortColumn: ResultSortField;
  sortDirection: ResultSortDir;
  targetFolder: string;
  template: string;
  dateFormat: string;
  groupMode: string;
  paddedDigits: number;
  filterValue: string;
  exts: string[];
  deleteText: string;
  replaceWith: Array<{ find: string; replace: string }>;
  changeExtension: string;
  lowercase: boolean;
  uppercase: boolean;
  titleCase: boolean;
  trimWhitespace: boolean;
  spaceToUnderscore: boolean;
  leftPrefix: string;
  rightSuffix: string;
  deletePrefix: boolean;
  deleteSuffix: boolean;
}

const initialStore: InitialStore = {
  selectedFileCount: 0,
  activeTab: 'renamer',
  theme: 'dark',
  sortColumn: '',
  sortDirection: 'asc',
  targetFolder: '',
  template: '{DATE}_{NUMBER}.{EXT}',
  dateFormat: 'yyyy-MM-dd',
  groupMode: 'all',
  paddedDigits: 3,
  filterValue: '',
  exts: [],
  deleteText: '',
  replaceWith: [],
  changeExtension: '',
  lowercase: false,
  uppercase: false,
  titleCase: false,
  trimWhitespace: false,
  spaceToUnderscore: false,
  leftPrefix: '',
  rightSuffix: '',
  deletePrefix: false,
  deleteSuffix: false,
};

export const useAppStore = create<typeof initialStore & {
  folderPath: string | null;
  allFiles: any[];
  currentResults: Array<{
    originalName: string;
    newName: string;
    existsInDest: boolean;
  }>;
  pendingOperations: Array<{ id: string; label: string }>;
  isProcessing: boolean;
  processingProgress: number;
  checkedIndices: Set<number>;
}>(set => ({
  ...initialStore,
  folderPath: null,
  allFiles: [],
  currentResults: [],
  pendingOperations: [],
  isProcessing: false,
  processingProgress: 0,
  checkedIndices: new Set(),

  cancelAllPending: () => set({
    pendingOperations: [],
    currentResults: [],
  }),

  toggleSortCol: (col: ResultSortField) =>
    set((s) => {
      if (s.sortColumn === col) {
        return { sortColumn: col, sortDirection: s.sortDirection === 'asc' ? 'desc' : 'asc' };
      }
      return { sortColumn: col, sortDirection: 'asc' };
    }),

  getExportData: (): SerializeRequest => ({
    settings: {
      template: store.state.template,
      dateFormat: store.state.dateFormat,
      groupMode: store.state.groupMode,
      paddedDigits: store.state.paddedDigits,
      filterValue: store.state.filterValue,
      exts: [...store.state.exts],
    },
    files: store.state.allFiles.map((f) => ({
      originalName: f.originalName,
      originalPath: f.originalPath,
      ext: f.ext,
      baseWithoutExt: f.baseWithoutExt,
    })),
  }),

  applyImportData: (data: SerializeRequest) => set((s) => {
    return {
      template: data.settings.template ?? s.template,
      dateFormat: data.settings.dateFormat ?? s.dateFormat,
      groupMode: data.settings.groupMode ?? s.groupMode,
      paddedDigits: data.settings.paddedDigits ?? s.paddedDigits,
      filterValue: data.settings.filterValue ?? s.filterValue,
      exts: data.settings.exts ?? s.exts,
      targetFolder: s.targetFolder,
      allFiles: data.files.map((f) => ({
        ...f,
        extractDate: null,
        groupKey: '',
      })),
    };
  }),
}));
