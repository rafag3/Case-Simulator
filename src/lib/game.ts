// Regras do simulador. Tudo aqui é puro e recebe o gerador de números aleatórios,
// para que os testes possam conferir as chances.
import type { CaseDef, Item } from '../types';

export type Rng = () => number;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function pickWeighted<T>(entries: readonly (readonly [T, number])[], rng: Rng): T {
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = rng() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r < 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Sorteia um item da caixa com as chances da tabela. */
export const rollCase = (c: CaseDef, rng: Rng): number => pickWeighted(c.drops, rng);

/** Valor médio devolvido por abertura. */
export const caseExpectedValue = (c: CaseDef, items: Item[]) =>
  c.drops.reduce((sum, [id, prob]) => sum + items[id].p * prob, 0);

export const UPGRADE_EDGE = 0.95;
export const UPGRADE_MAX_CHANCE = 0.9;

/** Chance de um aprimoramento: valor apostado sobre o valor do alvo, com margem da casa e teto. */
export function upgradeChance(bet: number, target: number): number {
  if (bet <= 0 || target <= 0) return 0;
  return Math.min(UPGRADE_MAX_CHANCE, (bet / target) * UPGRADE_EDGE);
}

/** Onde fica a faixa vencedora na volta de 0 a 100: no começo (0 a X) ou no fim (100 − X a 100). */
export type UpgradeSide = 'low' | 'high';

/** O roll (0 a 1) cai dentro da faixa vencedora? A chance é a mesma nos dois lados. */
export function upgradeWins(roll: number, chance: number, side: UpgradeSide): boolean {
  return side === 'low' ? roll < chance : roll >= 1 - chance;
}

export const CONTRACT_MIN = 3;
export const CONTRACT_MAX = 10;

/** Item mais caro que cabe no valor; se nada couber, o mais barato. `sorted` em ordem crescente de preço. */
export function itemForValue(sorted: Item[], value: number): Item {
  let lo = 0;
  let hi = sorted.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].p <= value) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return sorted[best];
}

export interface BattleMode {
  id: string;
  label: string;
  /** índices dos jogadores por equipe; o jogador 0 é sempre você */
  teams: number[][];
}

export const BATTLE_MODES: BattleMode[] = [
  { id: '1v1', label: '1 x 1', teams: [[0], [1]] },
  { id: '1v1v1', label: '1 x 1 x 1', teams: [[0], [1], [2]] },
  { id: '1v1v1v1', label: '1 x 1 x 1 x 1', teams: [[0], [1], [2], [3]] },
  { id: '2v2', label: '2 x 2', teams: [[0, 1], [2, 3]] },
];

/** Resultado completo de uma batalha: drops[rodada][jogador] = id do item. */
export function simulateBattle(cases: CaseDef[], players: number, rng: Rng): number[][] {
  return cases.map((c) => Array.from({ length: players }, () => rollCase(c, rng)));
}

/** Equipe vencedora. Empates são decididos por sorteio entre as equipes empatadas. */
export function battleWinner(playerTotals: number[], teams: number[][], lowestWins: boolean, rng: Rng): number {
  const totals = teams.map((t) => round2(t.reduce((s, p) => s + playerTotals[p], 0)));
  const best = lowestWins ? Math.min(...totals) : Math.max(...totals);
  const tied = totals.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  return tied[Math.floor(rng() * tied.length)];
}
