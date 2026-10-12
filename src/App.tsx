import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { loadCatalog } from './lib/catalog';
import { pushSimulatedDrop } from './lib/feed';
import { Battles } from './pages/Battles';
import { CasePage } from './pages/CasePage';
import { Contract } from './pages/Contract';
import { Home } from './pages/Home';
import { Inventory } from './pages/Inventory';
import { Upgrade } from './pages/Upgrade';
import { useRoute } from './router';

export function App() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [page = '', arg] = useRoute();

  useEffect(() => {
    setState('loading');
    loadCatalog().then(
      () => {
        for (let i = 0; i < 16; i++) pushSimulatedDrop();
        setState('ready');
      },
      () => setState('error'),
    );
  }, [attempt]);

  useEffect(() => {
    if (state !== 'ready') return;
    const t = setInterval(pushSimulatedDrop, 2400);
    return () => clearInterval(t);
  }, [state]);

  if (state === 'loading') return <div className="splash"><div className="spinner" />Carregando caixas…</div>;
  if (state === 'error')
    return (
      <div className="splash">
        Não foi possível carregar as caixas. Confira sua conexão.
        <button className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>Tentar de novo</button>
      </div>
    );

  return (
    <Layout route={page}>
      {page === 'case' && arg ? <CasePage key={arg} id={arg} />
        : page === 'upgrade' ? <Upgrade />
        : page === 'contract' ? <Contract />
        : page === 'battles' ? <Battles />
        : page === 'inventory' ? <Inventory />
        : <Home />}
    </Layout>
  );
}
