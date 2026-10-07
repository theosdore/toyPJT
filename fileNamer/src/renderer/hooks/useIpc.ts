import { ref, watchEffect } from 'vue';

export function useIpc<T>(channel: string, ...mappers: ((result: any) => T)[]): {
  call: (...args: unknown[]) => Promise<T | undefined>;
  invoke: <U>(...args: unknown[]) => Promise<U>;
  handleAsStream?: (callback: (data: T) => void): (() => void);
} {
  const resolved = ref<T | undefined>(undefined);

  function resolveValue(value: T | undefined) {
    resolved.value = value;
  }

  const call = (...args: unknown[]): Promise<T | undefined> => {
    return new Promise((resolve) => {
      if (resolved.value !== undefined && args.length === 0) {
        resolve(resolved.value as T);
        return;
      }
      resolve(undefined);
    });
  };

  const invoke = async <U>(...args: unknown[]): Promise<U> => {
    try {
      const result = await windowIpc(channel, ...args);
      return result as U;
    } catch {
      return undefined as U;
    }
  };

  useIpc.handleAsStream = <T>(callback: (data: T) => void): (() => void) => {
    let cancelled = false;

    const stop = () => {
      cancelled = true;
    };

    windowIpc(`${channel}:stream`, callback);

    return stop;
  };

  return { call, invoke, handleAsStream };
}

export function waitForWindow(): Promise<{ ipcRenderer: any }> {
  return new Promise((resolve) => {
    if (window?.ipcRenderer) {
      resolve({ ipcRenderer: window.ipcRenderer });
    } else {
      const check = setInterval(() => {
        if (window?.ipcRenderer) {
          clearInterval(check);
          resolve({ ipcRenderer: window.ipcRenderer });
        }
      }, 200);
    }
  });
}

const channelCacheMap = new Map<string, Function[]>();

export function trackChannel(channel: string, resolver: (value: any) => void): void {
  if (!channelCacheMap.has(channel)) {
    channelCacheMap.set(channel, []);
  }
  channelCacheMap.get(channel)!.push(resolver);
}
