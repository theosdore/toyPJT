type DispatchMessage = 
  | { type: 'generate'; payload: unknown }
  | { type: 'cancel' };

function queueWork(queue: Array<() => void>) {
  const next = queue.shift();
  if (next) next();
}

export function createDispatcher() {
  return new Promise<void>(async (resolve) => {
    try {
      const core = await import('./core/index.js');
      console.log('[Worker] core module loaded');
      resolve();
    } catch (err) {
      console.error('[Worker] dispatch failed:', err);
      resolve();
    }
  });
}

console.log('[Worker] dispatcher initialized');
