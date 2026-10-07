import { useCallback, useEffect } from 'vue';

interface IpcChannel {
  channel: string;
  args?: unknown[];
}

function waitForWindow(): Promise<{ ipcRenderer: any }> {
  return new Promise((resolve) => {
    if (window && window.ipcRenderer) {
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

export function useIpc<T>(channel: string, ...mappers: ((result: any) => T)[]): {
  call: (...args: unknown[]) => Promise<T | undefined>;
  handleAsStream?: (callback: (data: T) => void) => () => void;
} {
  const [resolver, promise] = useStatePromise<T>();
  const { call } = useCallback(
    (...args: unknown[]): Promise<T | undefined> => {
      waitForWindow().then(async ({ ipcRenderer }) => {
        try {
          const result = await ipcRenderer.invoke(channel, ...args);
          return mappers.length > 0 ? mappers[0](result) : result as T;
        } catch (err) {
          console.error(`IPC ${channel} failed:`, err);
          return undefined;
        }
      });
      return promise;
    },
    [channel, promise, ...mappers]
  );

  useIpc.handleAsStream = useCallback(
    (callback: (data: T) => void): (() => void) => {
      let cancelled = false;
      const unsub = channel === 'files-ready'
        ? window.ipcRenderer!.on('files-loaded', (_event, data: any) => {
            if (!cancelled) callback(mappers[0](data));
          })
        : null;
      return () => {
        cancelled = true;
        unsub?.off();
      };
    },
    [channel, mappers[0]]
  );

  return { call, handleAsStream };
}

function useStatePromise<T>(): [T | undefined, Promise<T>] {
  const [state, setState] = React.useState<T | undefined>();
  const p = new Promise<T>((resolve) => {
    setState.resolve = resolve;
  });
  return [state, p];
}
