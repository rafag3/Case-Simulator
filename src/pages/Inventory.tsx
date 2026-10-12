import { useMemo, useState } from 'react';
import { Empty, ItemCard, Price } from '../components/ui';
import { getDb } from '../lib/catalog';
import { round2 } from '../lib/game';
import { useInventory, useStore } from '../store';

type Sort = 'price-desc' | 'price-asc' | 'recent';

export function Inventory() {
  const inv = useInventory();
  const stats = useStore((s) => s.stats);
  const { sell, reset } = useStore.getState();
  const [sort, setSort] = useState<Sort>('price-desc');

  const sorted = useMemo(() => {
    const list = [...inv];
    if (sort === 'price-desc') list.sort((a, b) => b.item.p - a.item.p);
    if (sort === 'price-asc') list.sort((a, b) => a.item.p - b.item.p);
    if (sort === 'recent') list.sort((a, b) => b.at - a.at);
    return list;
  }, [inv, sort]);

  const total = round2(inv.reduce((s, i) => s + i.item.p, 0));
  const best = stats.best ? getDb().itemByKey.get(stats.best.key) : undefined;

  const cells: [string, React.ReactNode][] = [
    ['Caixas abertas', stats.opened],
    ['Gasto em caixas', <Price value={stats.spent} />],
    ['Valor que saiu das caixas', <Price value={stats.dropped} />],
    ['Aprimoramentos ganhos', `${stats.upgradeWins} de ${stats.upgrades}`],
    ['Contratos', stats.contracts],
    ['Batalhas vencidas', `${stats.battleWins} de ${stats.battles}`],
  ];

  return (
    <div className="page">
      <h1 className="title">Inventário</h1>
      <div className="stats">
        {cells.map(([label, value]) => (
          <div key={label} className="stat">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        {best && (
          <div className="stat">
            <span>Melhor item</span>
            <strong>{best.n}</strong>
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="toolbar-info">
          {inv.length} {inv.length === 1 ? 'item' : 'itens'} • <Price value={total} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
          <option value="price-desc">Mais caros</option>
          <option value="price-asc">Mais baratos</option>
          <option value="recent">Mais recentes</option>
        </select>
        <button className="btn btn-ghost" disabled={inv.length === 0} onClick={() => sell(inv.map((i) => i.uid))}>
          Vender tudo
        </button>
      </div>

      {sorted.length === 0 ? (
        <Empty>Seu inventário está vazio. <a href="#/">Abra uma caixa</a> para começar.</Empty>
      ) : (
        <div className="grid grid-items">
          {sorted.map((i) => (
            <ItemCard key={i.uid} item={i.item}>
              <button className="btn btn-sm btn-ghost" onClick={() => sell([i.uid])}>Vender</button>
            </ItemCard>
          ))}
        </div>
      )}

      <button className="btn btn-plain btn-danger" onClick={() => {
        if (window.confirm('Apagar saldo, inventário e estatísticas e começar do zero?')) reset();
      }}>
        Reiniciar progresso
      </button>
    </div>
  );
}
