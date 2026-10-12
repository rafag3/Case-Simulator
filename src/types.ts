export type Rarity = 'consumer' | 'industrial' | 'milspec' | 'restricted' | 'classified' | 'covert' | 'gold';

export interface Item {
  id: number;
  /** chave estável (nome + desgaste), usada no que fica salvo no aparelho */
  key: string;
  n: string;
  w: string;
  s: string;
  wear: string | null;
  r: Rarity;
  img: string | null;
  p: number;
}

/** [id do item, chance] */
export type Drop = [number, number];

export interface CaseDef {
  id: string;
  name: string;
  cat: string;
  price: number;
  old: number | null;
  img: string | null;
  battle: boolean;
  drops: Drop[];
}

export interface Catalog {
  generatedAt: string;
  imgPrefix: string;
  categories: { id: string; label: string }[];
  items: Item[];
  cases: CaseDef[];
  /** [multiplicador, chance] */
  contract: [number, number][];
}
