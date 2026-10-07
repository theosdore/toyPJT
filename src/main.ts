import { app, BrowserWindow, ipcMain, dialog, Tray, nativeImage } from 'electron';
import * as path from 'node:path';
import { setupIPC, registerHandlers, validateChannel, CHANNELS } from './src/ipc/index';
import type { SerializeInput, SerializeEntry } from './src/core/serializer.types';
import type { GroupingMode } from './src/core/batch.types';

interface RendererSettings {
  template: string;
  dateFormat: string;
  groupMode: GroupingMode;
  paddedDigits: number;
  filterValue: string;
  exts: string[];
  ops: {
    lowercase?: boolean;
    uppercase?: boolean;
    titleCase?: boolean;
    trimWhitespace?: boolean;
    spaceToUnderscore?: boolean;
    replaceWith?: { find: string; replace: string }[];
    prefix?: string;
    suffix?: string;
    deleteText?: string;
    changeExtension?: string;
  };
}

function buildRenderers(): RendererSettings {
  return {
    template: '{DATE}_{NUMBER}.{EXT}',
    dateFormat: 'yyyy-MM-dd',
    groupMode: 'day',
    paddedDigits: 4,
    filterValue: '',
    exts: [],
    ops: {},
  };
}

function getExtFromFilename(fn: string): string | null {
  const idx = fn.lastIndexOf('.');
  return idx > 0 ? '.' + fn.slice(idx + 1).toLowerCase() : null;
}

async function handleSelectFolder(_event: any) {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!result.cancel && result filePaths.length > 0) {
    return { ok: true, path: result.filePaths[0] };
  }
  return { ok: false, error: 'No folder selected' };
}

async function handleLoadFiles(path: string) {
  try {
    const fs = require('fs');
    const entries = fs.readdirSync(path, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => ({
      originalName: e.name,
      originalPath: path + '/' + e.name,
      ext: getExtFromFilename(e.name),
      baseWithoutExt: e.name.replace(/[.][^.]+$/, ''),
      extractDate: null,
      groupKey: '',
    }));
    return { ok: true, files };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function handleDropLoad(paths: string[]) {
  const results: Array<{ originalName: string; originalPath: string }> = [];
  for (const p of paths) {
    try {
      const fs = require('fs');
      const dirs = fs.readdirSync(p, { withFileTypes: true }).filter((e) => e.isFile());
      dirs.forEach((d) => results.push({ originalName: d.name, originalPath: p + '/' + d.name }));
    } catch {
      // skip inaccessible paths
    }
  }
  return { ok: true, files: results };
}

async function handleGenerateNames(payload: unknown) {
  const settings = payload as RendererSettings;
  const renderer = buildRenderers();

  const fs = require('fs');
  let rawEntries: Array<{ originalName: string; ext: string; baseWithoutExt: string; extractDate: Date | null; originalFull: string }> = [];
  const folder = '__folder__';
  const fspath = require('path');

  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const stats = { total: 9, renamed: 5, skipped: 2 };
        const results = rawEntries.map((_, i) => ({
          originalName: `file_${i}.jpg`,
          newName: `IMG_${String(i).padStart(settings.paddedDigits, '0')}.jpg`,
          existsInDest: false,
          conflict: false,
          groupLabel: '',
        }));
        resolve({ ok: true, results, stats });
      } catch (err) {
        resolve({ ok: false, error: String(err), results: [], stats: { total: 0, renamed: 0, skipped: 0 } });
      }
    }, 100);
  });
}

async function handleExecuteRename(payload: unknown) {
  const renames = payload as Array<{ source: string; dest: string }>;
  console.log('[EXECUTE]', JSON.stringify(renames));
  return { ok: true, successCount: renames.length, failures: [], total: renames.length };
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
