import { ipcMain } from 'electron';
import { validateChannel, CHANNELS, IpchdlreType } from './validators';

type Handlers = Record<string, (event: any, payload: unknown) => Promise<IpchdlreType['reply']>>;
const handlers: Handlers = {};

export function registerHandlers(h: Handlers): void {
  for (const [channel, handler] of Object.entries(h)) {
    if (!validateChannel(channel)) continue;
    ipcMain.on(channel, async (_event, payload) => {
      try {
        const result = await handler(_event, payload);
        _event.reply(channel, result);
      } catch (err) {
        _event.reply(channel, { ok: false, error: String(err) });
      }
    });
  }
}

export function getHandlerForChannel(channel: string): ((event: any, payload: unknown) => Promise<IpchdlreType['reply']>) | undefined {
  return handlers[channel] ?? undefined;
}

export function setupIPC(): void {
  registerHandlers(handlers);
}
