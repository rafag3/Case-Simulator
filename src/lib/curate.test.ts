import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Catalog } from '../types';
import { CHEAP_PRICE, HIGH_ROLLER_CASES, HIGH_ROLLER_RETURN, curateCatalog } from './curate';

const raw: Catalog = JSON.parse(readFileSync('public/catalog.json', 'utf8'));
raw.items.forEach((it, id) => (it.id = id));
const byPrice = [...raw.items].sort((a, b) => a.p - b.p);
const cur = curateCatalog(raw, byPrice);
const ev = (drops: [number, number][]) => drops.reduce((s, [id, p]) => s + raw.items[id].p * p, 0);

describe('curadoria do catálogo', () => {
  it('tira metade das caixas baratas e mantém as demais', () => {
    const cheapBefore = raw.cases.filter((c) => c.price > 0 && c.price < CHEAP_PRICE).length;
    const cheapAfter = cur.cases.filter((c) => c.price > 0 && c.price < CHEAP_PRICE).length;
    expect(cheapAfter).toBe(cheapBefore - Math.floor(cheapBefore / 2));
    const restBefore = raw.cases.filter((c) => c.price >= CHEAP_PRICE).map((c) => c.id);
    const ids = new Set(cur.cases.map((c) => c.id));
    expect(restBefore.every((id) => ids.has(id))).toBe(true);
  });

  it('cada seção vai da mais barata à mais cara', () => {
    for (const cat of cur.categories) {
      const ps = cur.cases.filter((c) => c.cat === cat.id).map((c) => c.price);
      expect(ps).toEqual([...ps].sort((a, b) => a - b));
    }
  });

  it('caixas high roller: todas criadas, chances somam 1 e retorno de ~75%', () => {
    const hr = cur.cases.filter((c) => c.cat === 'highroller');
    expect(hr.length).toBe(HIGH_ROLLER_CASES.length);
    for (const c of hr) {
      expect(c.drops.reduce((s, d) => s + d[1], 0)).toBeCloseTo(1, 6);
      expect(ev(c.drops) / c.price).toBeCloseTo(HIGH_ROLLER_RETURN, 2);
      expect(c.drops.every(([, p]) => p > 0)).toBe(true);
    }
  });

  it('ids continuam únicos', () => {
    expect(new Set(cur.cases.map((c) => c.id)).size).toBe(cur.cases.length);
  });
});
