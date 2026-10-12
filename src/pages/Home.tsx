import { useMemo, useState } from 'react';
import { CaseCard, Empty } from '../components/ui';
import { getDb } from '../lib/catalog';

export function Home() {
  const { catalog, cases } = getDb();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? cases.filter((c) => c.name.toLowerCase().includes(q)) : cases;
    return catalog.categories
      .map((cat) => ({ ...cat, cases: list.filter((c) => c.cat === cat.id) }))
      .filter((g) => g.cases.length > 0);
  }, [catalog, cases, query]);

  return (
    <div className="page">
      <div className="search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input type="search" placeholder="Buscar caixa" value={query} onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar caixa" />
      </div>
      {groups.length === 0 && <Empty>Nenhuma caixa encontrada para "{query}".</Empty>}
      {groups.map((g) => (
        <section key={g.id} className="section">
          <button className="section-head" onClick={() => setCollapsed((s) => ({ ...s, [g.id]: !s[g.id] }))}
            aria-expanded={!collapsed[g.id]}>
            <h2>{g.label}</h2>
            <span>{collapsed[g.id] ? 'Mostrar' : 'Minimizar'}</span>
          </button>
          {!collapsed[g.id] && (
            <div className="grid grid-cases">
              {g.cases.map((c) => (
                <CaseCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
