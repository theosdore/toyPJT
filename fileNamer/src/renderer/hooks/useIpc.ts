import { ref, watchEffect, nextTick } from 'vue';

interface IpcChannel {
  channel: string;
  args?: unknown[];
}

export function useIpc<T>(channel: string, ...mappers: ((result: any) => T)[]): {
  call: (...args: unknown[]) => Promise<T | undefined>;
  handleAsStream?: (callback: (data: T) => void) => () => void;
} {
  const resolved = ref<T | undefined>(undefined);
  let activeResolvers: Array<((value: T | undefined) => void)> = [];

  function resolveValue(value: T | undefined) {
    activeResolvers.forEach(r => r(value));
    activeResolvers = [];
    resolved.value = value;
  }

  const call = (...args: unknown[]): Promise<T | undefined> => {
    return new Promise((resolve) => {
      if (resolved.value !== undefined && args.length === 0) {
        resolve(resolved.value as T);
        return;
      }
      activeResolvers.push(resolve);
    });
  };

  useIpc.handleAsStream = <T>(callback: (data: T) => void): (() => void) => {
    let cancelled = false;

    return () => {
      cancelled = true;
    };
  };

  return { call, handleAsStream };
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
      }, 50);
    }
  });
}
