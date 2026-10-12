// Faixa de drops recentes: mistura aberturas simuladas de bots com as suas.
import { useSyncExternalStore } from 'react';
import { getDb } from './catalog';
import { rollCase } from './game';

export interface FeedDrop {
  id: number;
  itemId: number;
  caseId: string;
  mine: boolean;
}

const MAX = 28;
let drops: FeedDrop[] = [];
let seq = 0;
const listeners = new Set<() => void>();

export function pushDrop(itemId: number, caseId: string, mine = false) {
  drops = [{ id: ++seq, itemId, caseId, mine }, ...drops].slice(0, MAX);
  listeners.forEach((l) => l());
}

export function pushSimulatedDrop() {
  const paid = getDb().cases.filter((c) => c.price > 0);
  const c = paid[Math.floor(Math.random() * paid.length)];
  pushDrop(rollCase(c, Math.random), c.id);
}

export const useFeed = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => drops,
  );
