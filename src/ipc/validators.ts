export const CHANNELS = {
  SELECT_FOLDER: 'select-folder',
  LOAD_FILES: 'load-files',
  GENERATE_NAMES: 'generate-names',
  EXECUTE_RENAME: 'execute-rename',
  DROP_LOAD: 'drop-load',
  CANCEL_OP: 'cancel-op',
} as const;

type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS];

const VALID_CHANNELS = new Set(Object.values(CHANNELS));

export function validateChannel(channel: string): channel is ChannelName {
  return VALID_CHANNELS.has(channel);
}

export interface SelectFolderReply {
  ok: boolean;
  path: string | null;
  error?: string;
}

export interface LoadFilesReply {
  ok: boolean;
  files: Array<{
    originalName: string;
    originalPath: string;
    ext: string;
    baseWithoutExt: string;
    extractDate: Date | null;
    groupKey: string;
  }>;
  error?: string;
}

export interface GenerateNamesReply {
  ok: boolean;
  results: Array<{
    originalName: string;
    newName: string;
    existsInDest: boolean;
    conflict: boolean;
    groupLabel: string;
  }>;
  stats: { total: number; renamed: number; skipped: number };
  error?: string;
}

export interface RenameEntry {
  source: string;
  dest: string;
}

export interface ExecuteRenameReply {
  ok: boolean;
  successCount: number;
  failures: Array<{ source: string; error: string }>;
  total: number;
  error?: string;
}

export interface DropLoadReply {
  ok: boolean;
  files: Array<{
    originalName: string;
    originalPath: string;
  }>;
  error?: string;
}

export type IpchdlreType =
  | { type: 'select-folder'; reply: SelectFolderReply }
  | { type: 'load-files'; reply: LoadFilesReply }
  | { type: 'generate-names'; reply: GenerateNamesReply }
  | { type: 'execute-rename'; reply: ExecuteRenameReply }
  | { type: 'drop-load'; reply: DropLoadReply };

declare global {
  interface Window {
    ipcRenderer?: {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>;
      on(event: string, listener: (...args: unknown[]) => void): () => void;
      off(event: string, listener: (...args: unknown[]) => void): void;
      send(channel: string, ...args: unknown[]): void;
      emit(event: string, ...args: unknown[]): void;
    };
  }
}
