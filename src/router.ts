// Rotas por hash (#/case/ID): funcionam em hospedagem estática sem configuração.
import { useSyncExternalStore } from 'react';

const read = () => window.location.hash.replace(/^#\/?/, '');

function subscribe(listener: () => void) {
  const onChange = () => {
    window.scrollTo(0, 0);
    listener();
  };
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): string[] {
  return useSyncExternalStore(subscribe, read).split('/').filter(Boolean).map(decodeURIComponent);
}

export const go = (path: string) => {
  window.location.hash = path;
};
