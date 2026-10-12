import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDb } from './lib/catalog';
import { round2 } from './lib/game';

export interface InvItem {
  uid: string;
  key: string;
  at: number;
  src: string;
}

export interface Stats {
  opened: number;
  spent: number;
  dropped: number;
  sold: number;
  upgrades: number;
  upgradeWins: number;
  contracts: number;
  battles: number;
  battleWins: number;
  best: { key: string; price: number } | null;
}

const emptyStats: Stats = {
  opened: 0, spent: 0, dropped: 0, sold: 0, upgrades: 0, upgradeWins: 0,
  contracts: 0, battles: 0, battleWins: 0, best: null,
};

export const START_BALANCE = 100;
export const FREE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface State {
  balance: number;
  inv: InvItem[];
  stats: Stats;
  /** última abertura de cada caixa gratuita */
  freeAt: Record<string, number>;
  fast: boolean;
  sound: boolean;
  addBalance: (n: number) => void;
  /** desconta do saldo; devolve false (sem alterar nada) se não houver saldo */
  charge: (n: number) => boolean;
  grant: (keys: string[], src: string) => InvItem[];
  sell: (uids: string[]) => number;
  consume: (uids: string[]) => void;
  bump: (delta: Partial<Omit<Stats, 'best'>>) => void;
  markFree: (caseId: string) => void;
  toggle: (k: 'fast' | 'sound') => void;
  reset: () => void;
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const priceOf = (key: string) => getDb().itemByKey.get(key)?.p ?? 0;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE,
      inv: [],
      stats: emptyStats,
      freeAt: {},
      fast: false,
      sound: true,
      addBalance: (n) => set((s) => ({ balance: round2(s.balance + n) })),
      charge: (n) => {
        if (n > get().balance + 1e-9) return false;
        set((s) => ({ balance: round2(s.balance - n) }));
        return true;
      },
      grant: (keys, src) => {
        const now = Date.now();
        const added = keys.map((key) => ({ uid: uid(), key, at: now, src }));
        set((s) => {
          let best = s.stats.best;
          for (const key of keys) {
            const price = priceOf(key);
            if (!best || price > best.price) best = { key, price };
          }
          return { inv: [...added, ...s.inv], stats: { ...s.stats, best } };
        });
        return added;
      },
      sell: (uids) => {
        const ids = new Set(uids);
        const total = round2(get().inv.filter((i) => ids.has(i.uid)).reduce((sum, i) => sum + priceOf(i.key), 0));
        set((s) => ({
          inv: s.inv.filter((i) => !ids.has(i.uid)),
          balance: round2(s.balance + total),
          stats: { ...s.stats, sold: round2(s.stats.sold + total) },
        }));
        return total;
      },
      consume: (uids) => {
        const ids = new Set(uids);
        set((s) => ({ inv: s.inv.filter((i) => !ids.has(i.uid)) }));
      },
      bump: (delta) =>
        set((s) => {
          const stats = { ...s.stats };
          for (const [k, v] of Object.entries(delta) as [keyof Omit<Stats, 'best'>, number][])
            stats[k] = round2(stats[k] + v);
          return { stats };
        }),
      markFree: (caseId) => set((s) => ({ freeAt: { ...s.freeAt, [caseId]: Date.now() } })),
      toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<State>),
      reset: () => set({ balance: START_BALANCE, inv: [], stats: emptyStats, freeAt: {} }),
    }),
    { name: 'case-simulator-v2' },
  ),
);

/** Itens do inventário que ainda existem no catálogo, com o preço atual. */
export function useInventory() {
  const inv = useStore((s) => s.inv);
  const { itemByKey } = getDb();
  return inv.flatMap((i) => {
    const item = itemByKey.get(i.key);
    return item ? [{ ...i, item }] : [];
  });
}
