import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Catalog, CaseDef, Item } from '../types';
import {
  battleWinner,
  caseExpectedValue,
  itemForValue,
  pickWeighted,
  rollCase,
  simulateBattle,
  upgradeChance,
} from './game';

// gerador determinístico para os testes
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const catalog: Catalog = JSON.parse(readFileSync('public/catalog.json', 'utf8'));
const item = (p: number): Item => ({ id: 0, key: '', n: '', w: '', s: '', wear: null, r: 'milspec', img: null, p });

describe('catálogo', () => {
  it('toda caixa tem chances que somam 100%', () => {
    for (const c of catalog.cases) {
      const sum = c.drops.reduce((s, d) => s + d[1], 0);
      expect(Math.abs(sum - 1), c.name).toBeLessThan(1e-4);
    }
  });

  it('todo drop aponta para um item com preço e imagem', () => {
    for (const c of catalog.cases)
      for (const [id] of c.drops) {
        expect(catalog.items[id], c.name).toBeDefined();
        expect(catalog.items[id].p).toBeGreaterThan(0);
        expect(catalog.items[id].img).toBeTruthy();
      }
  });

  it('a tabela do contrato soma 100%', () => {
    const sum = catalog.contract.reduce((s, c) => s + c[1], 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-4);
  });
});

describe('sorteio', () => {
  it('pickWeighted respeita os limites', () => {
    const entries = [['a', 0.25], ['b', 0.75]] as const;
    expect(pickWeighted(entries, () => 0)).toBe('a');
    expect(pickWeighted(entries, () => 0.2499)).toBe('a');
    expect(pickWeighted(entries, () => 0.25)).toBe('b');
    expect(pickWeighted(entries, () => 0.9999)).toBe('b');
  });

  it('a frequência observada bate com a tabela da caixa', () => {
    const c = catalog.cases.find((x) => x.id === 'KilowattCase') as CaseDef;
    const rng = seeded(42);
    const n = 200_000;
    const count = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const id = rollCase(c, rng);
      count.set(id, (count.get(id) ?? 0) + 1);
    }
    for (const [id, prob] of c.drops) {
      const freq = (count.get(id) ?? 0) / n;
      // 5 desvios-padrão de folga
      const tol = 5 * Math.sqrt((prob * (1 - prob)) / n) + 1e-5;
      expect(Math.abs(freq - prob), catalog.items[id].n).toBeLessThan(tol);
    }
  });

  it('o retorno médio simulado converge para o valor esperado', () => {
    const c = catalog.cases.find((x) => x.id === 'KilowattCase') as CaseDef;
    const rng = seeded(7);
    const n = 300_000;
    let total = 0;
    for (let i = 0; i < n; i++) total += catalog.items[rollCase(c, rng)].p;
    const ev = caseExpectedValue(c, catalog.items);
    expect(Math.abs(total / n - ev) / ev).toBeLessThan(0.08);
  });
});

describe('aprimoramento', () => {
  it('chance proporcional com margem e teto', () => {
    expect(upgradeChance(10, 20)).toBeCloseTo(0.475);
    expect(upgradeChance(10, 100)).toBeCloseTo(0.095);
    expect(upgradeChance(10, 10.1)).toBe(0.9);
    expect(upgradeChance(0, 10)).toBe(0);
  });

  it('na média o aprimoramento nunca devolve mais do que foi apostado', () => {
    for (const [bet, target] of [[1, 2], [5, 50], [10, 11], [3, 1000]])
      expect(upgradeChance(bet, target) * target).toBeLessThanOrEqual(bet);
  });
});

describe('contrato', () => {
  it('escolhe o item mais caro que cabe no valor', () => {
    const sorted = [1, 2, 5, 10].map(item);
    expect(itemForValue(sorted, 7).p).toBe(5);
    expect(itemForValue(sorted, 10).p).toBe(10);
    expect(itemForValue(sorted, 999).p).toBe(10);
    expect(itemForValue(sorted, 0.5).p).toBe(1);
  });
});

describe('batalha', () => {
  it('gera um drop por jogador em cada rodada', () => {
    const cases = catalog.cases.slice(0, 3);
    const drops = simulateBattle(cases, 4, seeded(1));
    expect(drops).toHaveLength(3);
    for (const round of drops) expect(round).toHaveLength(4);
  });

  it('vence quem soma mais; no modo invertido, quem soma menos', () => {
    const solo = [[0], [1], [2]];
    expect(battleWinner([5, 9, 2], solo, false, () => 0)).toBe(1);
    expect(battleWinner([5, 9, 2], solo, true, () => 0)).toBe(2);
    expect(battleWinner([5, 1, 2, 3], [[0, 1], [2, 3]], false, () => 0)).toBe(0);
  });

  it('empate é decidido por sorteio entre os empatados', () => {
    const solo = [[0], [1], [2]];
    expect(battleWinner([4, 4, 1], solo, false, () => 0)).toBe(0);
    expect(battleWinner([4, 4, 1], solo, false, () => 0.99)).toBe(1);
  });
});
