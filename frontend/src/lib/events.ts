type Listener = () => void;

const listeners: Record<string, Listener[]> = {};

export function emitPrimaryAction(page: string) {
  (listeners[page] ?? []).forEach((fn) => fn());
}

export function onPrimaryAction(page: string, fn: Listener) {
  if (!listeners[page]) listeners[page] = [];
  listeners[page].push(fn);
  return () => {
    listeners[page] = (listeners[page] ?? []).filter((f) => f !== fn);
  };
}
