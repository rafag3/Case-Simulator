import type { Catalog, CaseDef, Item } from '../types';

export interface Db {
  catalog: Catalog;
  items: Item[];
  cases: CaseDef[];
  caseById: Map<string, CaseDef>;
  itemByKey: Map<string, Item>;
  /** itens em ordem crescente de preço */
  byPrice: Item[];
}

let db: Db | null = null;

export async function loadCatalog(): Promise<Db> {
  const res = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
  if (!res.ok) throw new Error(`Não foi possível carregar o catálogo (${res.status})`);
  const catalog = (await res.json()) as Catalog;
  catalog.items.forEach((it, id) => {
    it.id = id;
    it.key = it.wear ? `${it.n} (${it.wear})` : it.n;
  });
  db = {
    catalog,
    items: catalog.items,
    cases: catalog.cases,
    caseById: new Map(catalog.cases.map((c) => [c.id, c])),
    itemByKey: new Map(catalog.items.map((i) => [i.key, i])),
    byPrice: [...catalog.items].sort((a, b) => a.p - b.p),
  };
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Catálogo ainda não carregado');
  return db;
}

export function imgUrl(item: Item, size = '256fx192f'): string {
  if (!item.img) return '';
  if (item.img.startsWith('http')) return item.img;
  return `${getDb().catalog.imgPrefix}${item.img}/${size}`;
}
