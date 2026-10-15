import type { Catalog, CaseDef, Drop, Item } from '../types';

/** Abaixo deste preço a caixa conta como "barata" e entra na limpeza de repetidas. */
export const CHEAP_PRICE = 5;
/** Fração das caixas baratas que sai do catálogo. */
export const CHEAP_DROP_SHARE = 0.5;
/** Retorno esperado das caixas criadas aqui: o mesmo patamar das caixas do catálogo (~75%). */
export const HIGH_ROLLER_RETURN = 0.75;
export const HIGH_ROLLER_CAT = { id: 'highroller', label: 'Caixas high roller' };

/** Caixas caras criadas a partir dos itens do catálogo. Nomes próprios, sem copiar marcas. */
export const HIGH_ROLLER_CASES: { id: string; name: string; price: number }[] = [
  { id: 'hr-neblina', name: 'Neblina', price: 25 },
  { id: 'hr-eclipse', name: 'Eclipse', price: 50 },
  { id: 'hr-obsidiana', name: 'Obsidiana', price: 100 },
  { id: 'hr-aurora', name: 'Aurora', price: 200 },
  { id: 'hr-reliquia', name: 'Relíquia', price: 400 },
  { id: 'hr-coroa-negra', name: 'Coroa Negra', price: 800 },
  { id: 'hr-lenda', name: 'Lenda', price: 1500 },
];

const ev = (c: CaseDef, items: Item[]) => c.drops.reduce((s, [id, p]) => s + items[id].p * p, 0);

/** Quão parecidas são duas caixas: preço próximo e itens em comum. Menor = mais parecidas. */
function distance(a: CaseDef, b: CaseDef): number {
  const priceGap = Math.abs(Math.log(a.price / b.price));
  const ia = new Set(a.drops.map((d) => d[0]));
  const shared = b.drops.filter((d) => ia.has(d[0])).length;
  const jaccard = shared / (ia.size + b.drops.length - shared || 1);
  return priceGap - 0.5 * jaccard;
}

/**
 * Remove metade das caixas baratas, sempre a mais repetida: dentro de cada categoria, acha o par
 * vizinho (em preço) mais parecido e tira a que devolve menos em média. Repete até atingir a meta.
 */
export function pruneCheapCases(cases: CaseDef[], items: Item[]): CaseDef[] {
  const cheap = cases.filter((c) => c.price > 0 && c.price < CHEAP_PRICE);
  let toRemove = Math.floor(cheap.length * CHEAP_DROP_SHARE);
  const removed = new Set<string>();
  const byCat = new Map<string, CaseDef[]>();
  for (const c of cheap) byCat.set(c.cat, [...(byCat.get(c.cat) ?? []), c]);
  for (const list of byCat.values()) list.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));

  while (toRemove > 0) {
    let best: { d: number; a: CaseDef; b: CaseDef } | null = null;
    for (const list of byCat.values()) {
      const alive = list.filter((c) => !removed.has(c.id));
      for (let i = 1; i < alive.length; i++) {
        const d = distance(alive[i - 1], alive[i]);
        if (!best || d < best.d) best = { d, a: alive[i - 1], b: alive[i] };
      }
    }
    if (!best) break;
    const ra = ev(best.a, items) / best.a.price;
    const rb = ev(best.b, items) / best.b.price;
    removed.add((ra < rb ? best.a : best.b).id);
    toRemove--;
  }
  return cases.filter((c) => !removed.has(c.id));
}

/** Pesos ∝ preço^-k, com k ajustado para o retorno esperado bater com `target`. */
function weightsFor(prices: number[], target: number): number[] {
  const evFor = (k: number) => {
    const w = prices.map((p) => p ** -k);
    const total = w.reduce((s, x) => s + x, 0);
    return { w: w.map((x) => x / total), ev: prices.reduce((s, p, i) => s + (p * w[i]) / total, 0) };
  };
  // k negativo favorece os itens caros: só acontece se nem a média simples alcança o alvo
  let lo = -10;
  let hi = 20;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (evFor(mid).ev > target) lo = mid;
    else hi = mid;
  }
  return evFor((lo + hi) / 2).w;
}

/** Monta uma caixa cara: ~16 itens espalhados de 8% a 30× o preço, com faca/luva no topo. */
export function buildHighRollerCase(def: { id: string; name: string; price: number }, byPrice: Item[]): CaseDef | null {
  const lo = def.price * 0.08;
  const hi = def.price * 30;
  const pool = byPrice.filter((it) => it.p >= lo && it.p <= hi && it.img);
  if (pool.length < 8) return null;
  const min = pool[0].p;
  const max = pool[pool.length - 1].p;
  const n = 16;
  const chosen = new Map<number, Item>();
  for (let i = 0; i < n; i++) {
    const goal = min * (max / min) ** (i / (n - 1));
    const top = i >= n - 4;
    const candidates = top ? pool.filter((it) => it.r === 'gold') : pool;
    let pick: Item | null = null;
    for (const it of candidates.length ? candidates : pool) {
      if (chosen.has(it.id)) continue;
      if (!pick || Math.abs(Math.log(it.p / goal)) < Math.abs(Math.log(pick.p / goal))) pick = it;
    }
    if (pick) chosen.set(pick.id, pick);
  }
  const list = [...chosen.values()].sort((a, b) => b.p - a.p);
  const target = def.price * HIGH_ROLLER_RETURN;
  if (list[list.length - 1].p >= target || list[0].p <= target) return null;
  const w = weightsFor(list.map((it) => it.p), target);
  const drops: Drop[] = list.map((it, i) => [it.id, +w[i].toFixed(8)]);
  // fecha em 1 exato no item mais barato (o de maior chance)
  const rest = drops.slice(0, -1).reduce((s, d) => s + d[1], 0);
  drops[drops.length - 1][1] = +(1 - rest).toFixed(8);
  return { id: def.id, name: def.name, cat: HIGH_ROLLER_CAT.id, price: def.price, old: null, img: null, battle: true, drops };
}

/** Catálogo final: tira as baratas repetidas, soma as caras e ordena cada seção do mais barato ao mais caro. */
export function curateCatalog(catalog: Catalog, byPrice: Item[]): Catalog {
  const extra = HIGH_ROLLER_CASES.map((d) => buildHighRollerCase(d, byPrice)).filter((c): c is CaseDef => !!c);
  const cases = [...pruneCheapCases(catalog.cases, catalog.items), ...extra].sort(
    (a, b) => a.price - b.price || a.name.localeCompare(b.name),
  );
  // seções também vão da mais barata à mais cara (pela mediana de preço)
  const median = (id: string) => {
    const ps = cases.filter((c) => c.cat === id).map((c) => c.price);
    return ps[Math.floor(ps.length / 2)];
  };
  const categories = [...catalog.categories, HIGH_ROLLER_CAT]
    .filter((cat) => cases.some((c) => c.cat === cat.id))
    .sort((a, b) => median(a.id) - median(b.id));
  return { ...catalog, cases, categories };
}
