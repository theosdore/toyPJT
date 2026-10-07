import { app, BrowserWindow, ipcMain, dialog, Tray, nativeImage } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { setupIPC, registerHandlers, validateChannel, CHANNELS } from './src/ipc/index';
import type { GroupingMode } from './src/core/batch.types';
import type { TextOperationSettings } from './src/core/transformer.types';
import { extractDate } from './src/core/parser';
import { applyTransformations } from './src/core/transformer';
import { computeBatchIndex } from './src/core/batch';
import { serializeAll } from './src/core/serializer';

function getExtFromFilename(fn: string): string | null {
  const idx = fn.lastIndexOf('.');
  return idx > 0 ? '.' + fn.slice(idx + 1).toLowerCase() : null;
}

function datePartToD(d: Date | null): Date | null {
  if (!d) return null;
  try {
    const y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return new Date(y, +M - 1, +day);
  } catch {
    return null;
  }
}

interface SelectFolderReply {
  ok: boolean;
  path: string | null;
  error?: string;
}

interface LoadFilesReply {
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

interface GenerateNamesReply {
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

interface ExecuteRenameReply {
  ok: boolean;
  successCount: number;
  failures: Array<{ source: string; error: string }>;
  total: number;
  error?: string;
}

async function handleSelectFolder(_event: any): Promise<SelectFolderReply> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!result.cancel && result.filePaths.length > 0) {
    return { ok: true, path: result.filePaths[0] };
  }
  return { ok: false, path: null, error: 'No folder selected' };
}

async function handleLoadFiles(folderPath: string): Promise<LoadFilesReply> {
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const files = entries.filter((e: any) => e.isFile()).map((e: any) => ({
      originalName: e.name,
      originalPath: path.join(folderPath, e.name),
      ext: getExtFromFilename(e.name),
      baseWithoutExt: e.name.replace(/[.][^.]+$/, ''),
      extractDate: extractDate(e.name)?.date ?? null,
      groupKey: '',
    }));
    return { ok: true, files };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function buildGroupLabel(entry: { extractDate: Date | null; originalName: string; ext: string }, mode: GroupingMode, pat: string | undefined): string {
  switch (mode) {
    case 'all':
      return 'All Files';
    case 'day': {
      const d = entry.extractDate || new Date(entry.originalName);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    case 'no-date':
      return entry.extractDate ? 'Has Date' : 'No Date';
    case 'pattern':
      return entry.originalName.toLowerCase().includes(pat?.toLowerCase())
        ? pat || 'matched'
        : 'unmatched';
    case 'prefix':
      return entry.originalName.slice(0, 3);
    case 'byExt':
      return `ext-${(entry.originalName.split('.').pop() ?? 'unknown').toLowerCase()}`;
    case 'creation':
      return 'Creation Order';
    default:
      return 'Other';
  }
}

async function handleGenerateNames(payload: unknown): Promise<GenerateNamesReply> {
  try {
    const settings = payload as {
      template: string;
      dateFormat: string;
      groupMode: GroupingMode;
      paddedDigits: number;
      filterValue: string;
      exts: string[];
      ops: Partial<TextOperationSettings>;
      folderPath: string;
      fileList: Array<{ originalName: string; ext?: string }>;
    };

    const { folderPath, template, dateFormat, groupMode, paddedDigits, filterValue, exts, ops, fileList } = settings;

    const dirEntries = fs.readdirSync(folderPath, { withFileTypes: true }).filter((e: any) => e.isFile());
    const allRaw = dirEntries.map((de: any) => ({
      originalName: de.name,
      ext: getExtFromFilename(de.name),
      baseWithoutExt: de.name.replace(/[.][^.]+$/, ''),
      extractDate: extractDate(de.name)?.date ?? null,
      transformedBase: '',
    }));

    let filtered = [...allRaw];
    if (exts.length > 0) {
      filtered = filtered.filter(e => {
        const el = (e.ext || '').replace('.', '').toLowerCase();
        return exts.some(ext => ext.toLowerCase() === el);
      });
    }

    const transformedFiltered = filtered.map(e => {
      const base = applyTransformations(e.baseWithoutExt, ops);
      return { ...e, transformedBase: base };
    });

    const extended = transformedFiltered.map(f => ({ ...f, originalPath: path.join(folderPath, f.originalName) }));

    const batchResult = computeBatchIndex(
      extended,
      groupMode,
      filterValue,
      exts.length > 0 ? exts.map(ext => (ext.startsWith('.') ? ext : '.' + ext)) : undefined
    );

    const numKeys = new Map<number, number>();
    for (const be of batchResult.entries) {
      numKeys.set(be.entryIndex, be.groupNumber);
    }

    const k = new Set(batchResult.entries.map((be, i) => be.groupKey));
    const grpLblMap = new Map<string, string>();
    for (const [idx, f] of extended.entries()) {
      const be = batchResult.entries.find(b => b.entryIndex === idx);
      if (be) {
        const label = buildGroupLabel(f, groupMode, filterValue);
        grpLblMap.set(be.groupKey, label);
      }
    }

    const serializeInputs = batchResult.entries.map((be, i) => {
      const f = transformedFiltered[be.entryIndex];
      const num = be.groupNumber;
      return {
        originalName: f.originalName,
        originalPath: path.join(folderPath, f.originalName),
        ext: f.ext ?? '',
        baseWithoutExt: f.transformedBase,
        originalFull: f.originalName,
        datePart: datePartToD(f.extractDate),
        number: num,
      };
    });

    const serialized = serializeAll(serializeInputs, template, paddedDigits, dateFormat, 'auto');

    const results = serialized.map((s, idx) => {
      const f = extended[idx];
      const be = batchResult.entries.find(b => b.entryIndex === idx);
      const groupLabel = be ? grpLblMap.get(be.groupKey) ?? '' : '';
      return {
        originalName: s.originalName,
        newName: s.newName,
        existsInDest: s.existsInDest,
        conflict: s.existsInDest,
        groupLabel,
      };
    });

    const stats = {
      total: transformedFiltered.length,
      renamed: results.filter(r => !r.conflict && !r.existsInDest).length,
      skipped: results.filter(r => r.conflict || r.existsInDest).length,
    };

    return { ok: true, results, stats };
  } catch (err) {
    return { ok: false, error: String(err), results: [], stats: { total: 0, renamed: 0, skipped: 0 } };
  }
}

async function handleExecuteRename(payload: unknown): Promise<ExecuteRenameReply> {
  try {
    const renames = payload as Array<{ source: string; dest: string }>;
    let successCount = 0;
    const failures: Array<{ source: string; error: string }> = [];

    for (const rename of renames) {
      try {
        const srcDir = path.dirname(rename.source);
        const dstDir = path.dirname(rename.dest);
        if (!fs.existsSync(dstDir)) {
          fs.mkdirSync(dstDir, { recursive: true });
        }
        fs.renameSync(rename.source, rename.dest);
        successCount++;
      } catch (err) {
        failures.push({ source: rename.source, error: String(err) });
      }
    }

    const msg = `Renamed ${successCount}/${renames.length}. ${failures.length ? `${failures.length} failed.` : ''}`;
    dialog.showMessageBoxSync(null, { type: 'info', message: msg, detail: failures.map(f => `${f.source} -> ${f.error}`).join('\n') });

    return { ok: true, successCount, failures, total: renames.length };
  } catch (err) {
    return { ok: false, error: String(err), successCount: 0, failures: [], total: 0 };
  }
}

async function handleDropLoad(paths: string[]): Promise<{
  ok: boolean;
  files: Array<{ originalName: string; originalPath: string }>;
  error?: string;
}> {
  const results: Array<{ originalName: string; originalPath: string }> = [];
  for (const p of paths) {
    try {
      const dirs = fs.readdirSync(p, { withFileTypes: true }).filter((e: any) => e.isFile());
      dirs.forEach((d: any) => results.push({ originalName: d.name, originalPath: path.join(p, d.name) }));
    } catch {}
  }
  return { ok: true, files: results };
}

registerHandlers({
  'select-folder': handleSelectFolder,
  'load-files': handleLoadFiles,
  'generate-names': handleGenerateNames,
  'execute-rename': handleExecuteRename,
  'drop-load': handleDropLoad,
  'cancel-op': async () => ({ ok: true }),
});

app.whenReady().then(() => {
  setupIPC();

  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../src/preload.ts'),
      sandbox: true,
    },
  });

  win.loadURL('data:text/html;base64,' + Buffer.from('<html></html>').toString('base64'));

  win.on('closed', () => { win.destroy(); });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
});
