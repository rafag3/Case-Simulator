// Gera public/catalog.json: caixas, preços, itens e chances (snapshot público do csgo.net)
// + imagens e raridades da base da comunidade ByMykel/CSGO-API.
// Uso: node scripts/fetch-data.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const API = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en';
const IMG_PREFIX = 'https://community.akamai.steamstatic.com/economy/image/';
const WEARS = { 'Factory New': 'FN', 'Minimal Wear': 'MW', 'Field-Tested': 'FT', 'Well-Worn': 'WW', 'Battle-Scarred': 'BS' };
const RARITY = {
  rarity_common_weapon: 'consumer', rarity_common: 'consumer',
  rarity_uncommon_weapon: 'industrial', rarity_uncommon: 'industrial',
  rarity_rare_weapon: 'milspec', rarity_rare: 'milspec', rarity_rare_character: 'milspec',
  rarity_mythical_weapon: 'restricted', rarity_mythical: 'restricted', rarity_mythical_character: 'restricted',
  rarity_legendary_weapon: 'classified', rarity_legendary: 'classified', rarity_legendary_character: 'classified',
  rarity_ancient_weapon: 'covert', rarity_ancient: 'covert', rarity_ancient_character: 'covert',
  rarity_contraband_weapon: 'gold', rarity_contraband: 'gold',
};
// Categorias na ordem em que aparecem no site. Caixas com nome de pessoas reais ficam de fora.
const CATEGORIES = [
  ['isFreeCase', 'free', 'Caixas gratuitas'],
  ['isLimitedEdition', 'limited', 'Edição limitada'],
  ['isAccessoriesCase', 'accessories', 'Acessórios'],
  ['isMiningCase', 'mining', 'Caixas de mineração'],
  ['isUltraCase', 'premium', 'Caixas premium'],
  ['bonusOnly', 'bonus', 'Caixas de bônus'],
  ['isCustomCase', 'custom', 'Caixas personalizadas'],
  ['isALLIN', 'allin', 'Caixas All In'],
  ['isStandardCase', 'standard', 'Caixas padrão'],
  ['isCollection', 'collections', 'Coleções'],
  ['isArchiveCase', 'archive', 'Arquivo'],
];
// Nomes que remetem a pessoas reais
const EXCLUDE_NAMES = ['Ice Spice', "Gaben's Yacht", 'Vasya'];
const EXCLUDE_FLAGS = ['isBloggerCase', 'isProgamers', 'isTeamSpiritCase', 'isAvatarCase', 'isCategory'];

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function ddpFetch() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://csgo.net/websocket', { headers: { Origin: 'https://csgo.net' } });
    const data = { cases: [], pf_case_ranges: [] };
    const subs = ['cases', 'specialCases']; let ready = 0;
    const timer = setTimeout(() => reject(new Error('timeout DDP')), 60000);
    ws.onopen = () => ws.send(JSON.stringify({ msg: 'connect', version: '1', support: ['1'] }));
    ws.onerror = (e) => reject(new Error(e.message || 'erro websocket'));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.msg === 'connected') subs.forEach((name, i) => ws.send(JSON.stringify({ msg: 'sub', id: String(i), name, params: [] })));
      else if (m.msg === 'ping') ws.send(JSON.stringify({ msg: 'pong' }));
      else if (m.msg === 'added' && data[m.collection]) data[m.collection].push({ _id: m.id, ...m.fields });
      else if (m.msg === 'ready') { ready += m.subs.length; if (ready === subs.length) { clearTimeout(timer); ws.close(); resolve(data); } }
    };
  });
}

async function loadImages() {
  const files = ['skins', 'stickers', 'agents', 'keychains', 'graffiti', 'patches', 'music_kits', 'collectibles', 'crates', 'keys'];
  const byName = new Map();
  for (const f of files) {
    const res = await fetch(`${API}/${f}.json`);
    if (!res.ok) { console.warn('falhou', f, res.status); continue; }
    for (const it of await res.json()) {
      const rec = { image: it.image, rarity: RARITY[it.rarity?.id] ?? null, kind: f };
      for (const n of [it.name, it.market_hash_name]) if (n && !byName.has(norm(n))) byName.set(norm(n), rec);
    }
  }
  return byName;
}



const [{ cases, pf_case_ranges }, images] = await Promise.all([ddpFetch(), loadImages()]);
const ranges = new Map(pf_case_ranges.map((r) => [r.caseID, r]));

const items = []; const itemIndex = new Map(); const unmatched = new Map();
function itemId(entry) {
  const full = norm(entry.name || entry._id);
  if (itemIndex.has(full)) return itemIndex.get(full);
  const wm = full.match(/^(.*) \(([^()]+)\)$/);
  const wear = wm && WEARS[wm[2]] ? WEARS[wm[2]] : null;
  const base = wear ? wm[1] : full;
  const meta = images.get(base) || images.get(full) || images.get(norm(entry._id)) || images.get(base.replace(/^StatTrak™ /, '').replace(/^Souvenir /, ''));
  if (!meta) unmatched.set(base, (unmatched.get(base) || 0) + 1);
  const isGold = base.startsWith('★');
  const [weapon, ...rest] = base.split(' | ');
  const rec = {
    n: base, w: weapon, s: rest.join(' | '), wear,
    r: isGold ? 'gold' : meta?.rarity ?? 'milspec',
    img: meta?.image?.startsWith(IMG_PREFIX) ? meta.image.slice(IMG_PREFIX.length) : meta?.image ?? null,
    p: entry.price_eur,
  };
  items.push(rec); itemIndex.set(full, items.length - 1);
  return items.length - 1;
}

const out = []; const skipped = { excluded: 0, inactive: 0, norange: 0, empty: 0 };
for (const c of cases) {
  if (EXCLUDE_FLAGS.some((f) => c[f]) || EXCLUDE_NAMES.includes(norm(c.ename || c.name || ''))) { skipped.excluded++; continue; }
  if (c.disabled || c.active === false) { skipped.inactive++; continue; }
  const cat = CATEGORIES.find(([flag]) => c[flag]);
  const range = ranges.get(c._id);
  if (!cat || !range) { skipped.norange++; continue; }
  const drops = range.items.filter((i) => i.name && i.price_eur != null).map((i) => [itemId(i), +i.prob.toFixed(8)]);
  if (!drops.length) { skipped.empty++; continue; }
  drops.sort((a, b) => items[b[0]].p - items[a[0]].p);
  const official = /steam(community|static)|akamaihd/.test(c.image || '');
  out.push({
    id: c._id, name: norm(c.ename || c.name), cat: cat[1], price: c.price_eur ?? 0,
    old: c.oldPrice_eur ?? null, img: official ? c.image : null, place: c.place ?? 0,
    battle: !!c.isBattleCase, drops,
  });
}
out.sort((a, b) => a.place - b.place || a.price - b.price);

const catalog = {
  generatedAt: new Date().toISOString(), imgPrefix: IMG_PREFIX,
  categories: CATEGORIES.map(([, id, label]) => ({ id, label })).filter((c) => out.some((x) => x.cat === c.id)),
  items, cases: out.map(({ place, ...c }) => c),
  // Tabela do contrato: [multiplicador sobre o valor entregue, chance]
  contract: (ranges.get('contract')?.items ?? []).map((i) => [+(i.price / ranges.get('contract').price).toFixed(4), +i.prob.toFixed(8)]),
};
mkdirSync('public', { recursive: true });
writeFileSync('public/catalog.json', JSON.stringify(catalog));

const noImg = items.filter((i) => !i.img).length;
console.log(`caixas: ${out.length} | itens: ${items.length} | sem imagem: ${noImg} | puladas:`, skipped);
console.log('por categoria:', Object.fromEntries(catalog.categories.map((c) => [c.id, out.filter((x) => x.cat === c.id).length])));
console.log('sem correspondência (top 25):', [...unmatched.keys()].slice(0, 25));
console.log('soma das chances (min/max):', Math.min(...out.map((c) => c.drops.reduce((s, d) => s + d[1], 0))).toFixed(4), Math.max(...out.map((c) => c.drops.reduce((s, d) => s + d[1], 0))).toFixed(4));
