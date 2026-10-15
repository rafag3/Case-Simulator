import type { Catalog, CaseDef, Drop, Item, Rarity } from '../types';

/**
 * Caixas montadas a partir da tabela de chances pública do csgo.net (faixas de 0 a 10.000.000).
 * Preço dos itens: o do catálogo; se o item não estiver lá, o preço em dólar do site × USD_TO_CATALOG.
 */
const USD_TO_CATALOG = 0.89;

interface CopiedEntry {
  name: string;
  wear: string;
  /** tamanho da faixa (quantos números de 0 a 10.000.000 dão esse item) */
  range: number;
  /** usado só se o item não existir no catálogo */
  usd: number;
  rarity: Rarity;
  img?: string;
}

interface CopiedCase {
  id: string;
  name: string;
  cat: string;
  /** retorno médio usado para calcular o preço enquanto o preço original não for informado */
  targetReturn: number;
  entries: CopiedEntry[];
}

export const COPIED_CASES: CopiedCase[] = [
  {
    id: 'copy-invisible',
    name: 'Invisible',
    cat: 'premium',
    targetReturn: 0.75,
    entries: [
      { name: 'AWP | Gungnir', wear: 'FT', range: 1005, usd: 7778.55, rarity: 'covert' },
      { name: 'M4A4 | Howl', wear: 'FT', range: 1022, usd: 4663.01, rarity: 'gold' },
      { name: 'AWP | Medusa', wear: 'FT', range: 1206, usd: 2200.65, rarity: 'covert' },
      {
        name: 'AWP | The Prince', wear: 'FT', range: 1318, usd: 1904.65, rarity: 'covert',
        img: 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwiYbf-jFk7uW-V6FjIf2WAlicyOl-pK9qHXHkw093sGvTw4uqJSnDPQAkCsNyEbZcshiwxtK0Yumz4gbX2o9C02yg2f5NtC8l',
      },
      { name: 'M4A1-S | Hot Rod', wear: 'FN', range: 1939, usd: 1327.19, rarity: 'classified' },
      { name: 'M4A1-S | Welcome to the Jungle', wear: 'FT', range: 5478, usd: 788.4, rarity: 'covert' },
      { name: 'Desert Eagle | Blaze', wear: 'FN', range: 11290, usd: 597.27, rarity: 'restricted' },
      { name: 'AWP | Lightning Strike', wear: 'FN', range: 21588, usd: 473.79, rarity: 'covert' },
      { name: 'AK-47 | Case Hardened', wear: 'FT', range: 228389, usd: 211.8, rarity: 'classified' },
      { name: 'Desert Eagle | Fennec Fox', wear: 'FT', range: 410908, usd: 173.56, rarity: 'covert' },
      { name: 'MAC-10 | Candy Apple', wear: 'MW', range: 2605229, usd: 0.169, rarity: 'milspec' },
      {
        name: 'MAC-10 | Silver', wear: 'FN', range: 2425616, usd: 0.158, rarity: 'industrial',
        img: 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8n5WxrR1a4c29Yah7JeKsAm6Xyfo44-UwS32xwkUjsGzSwtqoJCjCOABxD8AkFu5bsha7wdGyM-rn4wzWjpUFk3tFRcHXeg',
      },
      {
        name: 'MAC-10 | Urban DDPAT', wear: 'FN', range: 1375653, usd: 0.089, rarity: 'consumer',
        img: 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8n5WxrR1T9s2qbLRsNM-GHGWvzedxuPUnGXnlwhh-5m7XmYmrJHiUaFJzD8QmTeIC5EG-moKyYerg7g3Z34pMnDK-0H2xTdMbHg',
      },
      // PROVISÓRIO: os itens das faixas 0 a 2.909.359 (11,995% FN, 11,140% FT e ~5,96%) ainda não foram
      // identificados. Ocupam a faixa com MAC-10 baratos do catálogo até chegar o print do topo da lista.
      { name: 'MAC-10 | Sienna Damask', wear: 'FT', range: 1199500, usd: 0.12, rarity: 'milspec' },
      { name: 'MAC-10 | Snow Splash', wear: 'FT', range: 1114000, usd: 0.01, rarity: 'consumer' },
      { name: 'MAC-10 | Arabesque Mosaic', wear: 'FT', range: 595860, usd: 0.3, rarity: 'milspec' },
    ],
  },
];

const keyOf = (name: string, wear: string | null) => (wear ? `${name} (${wear})` : name);

/** Acrescenta ao catálogo os itens das caixas copiadas que ainda não existem (ids continuam estáveis). */
export function addCopiedItems(catalog: Catalog): void {
  const keys = new Set(catalog.items.map((i) => i.key));
  for (const c of COPIED_CASES)
    for (const e of c.entries) {
      const key = keyOf(e.name, e.wear);
      if (keys.has(key)) continue;
      const [w, ...rest] = e.name.split(' | ');
      const item: Item = {
        id: catalog.items.length, key, n: e.name, w, s: rest.join(' | '), wear: e.wear, r: e.rarity,
        img: e.img ?? catalog.items.find((i) => i.n === e.name && i.img)?.img ?? null,
        p: +(e.usd * USD_TO_CATALOG).toFixed(e.usd < 1 ? 3 : 2),
      };
      catalog.items.push(item);
      keys.add(key);
    }
}

export function buildCopiedCases(catalog: Catalog): CaseDef[] {
  const byKey = new Map(catalog.items.map((i) => [i.key, i]));
  return COPIED_CASES.map((c) => {
    const total = c.entries.reduce((s, e) => s + e.range, 0);
    const drops: Drop[] = c.entries.map((e) => [byKey.get(keyOf(e.name, e.wear))!.id, +(e.range / total).toFixed(8)]);
    drops.sort((a, b) => catalog.items[b[0]].p - catalog.items[a[0]].p);
    const ev = drops.reduce((s, [id, p]) => s + catalog.items[id].p * p, 0);
    return {
      id: c.id, name: c.name, cat: c.cat, price: +(ev / c.targetReturn).toFixed(2), old: null, img: null, battle: true, drops,
    };
  });
}
