import { useState } from 'react';
import type { ReactNode } from 'react';
import { getDb, imgUrl } from '../lib/catalog';
import { useFeed } from '../lib/feed';
import { useStore } from '../store';
import { Price } from './ui';

const icons: Record<string, ReactNode> = {
  cases: <path d="M3 8l9-5 9 5v8l-9 5-9-5V8zm9 4l9-4M12 12L3 8m9 4v9" />,
  upgrade: <path d="M12 20V6m0 0l-6 6m6-6l6 6M5 3h14" />,
  contract: <path d="M7 3h8l4 4v14H7V3zm8 0v4h4M10 12h6m-6 4h6" />,
  battles: <path d="M4 4l9 9m-3 3l-3 3-3-3 3-3M20 4l-9 9m3 3l3 3 3-3-3-3M4 4v4h4M20 4v4h-4" />,
  inventory: <path d="M4 7h16v13H4V7zm4 0V4h8v3M4 12h16" />,
};

const NAV = [
  { id: '', label: 'Caixas', icon: 'cases' },
  { id: 'upgrade', label: 'Aprimorar', icon: 'upgrade' },
  { id: 'contract', label: 'Contrato', icon: 'contract' },
  { id: 'battles', label: 'Batalhas', icon: 'battles' },
  { id: 'inventory', label: 'Inventário', icon: 'inventory' },
];

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function LiveDrops() {
  const drops = useFeed();
  const { items, caseById } = getDb();
  return (
    <div className="live" aria-label="Drops recentes (simulados)">
      <div className="live-label">
        <i />
        Ao vivo
      </div>
      <div className="live-track">
        {drops.map((d) => {
          const it = items[d.itemId];
          const c = caseById.get(d.caseId);
          return (
            <a key={d.id} className={`live-drop r-${it.r}${d.mine ? ' is-mine' : ''}`}
              href={`#/case/${encodeURIComponent(d.caseId)}`} title={`${it.n} • ${c?.name ?? ''}`}>
              <img src={imgUrl(it, '128fx96f')} alt="" draggable={false} />
              <span>{d.mine ? 'Você' : it.w}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function BalanceModal({ onClose }: { onClose: () => void }) {
  const addBalance = useStore((s) => s.addBalance);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Adicionar saldo">
        <h3>Adicionar saldo fictício</h3>
        <p>É uma simulação: o saldo é grátis, não vale dinheiro e não pode ser sacado.</p>
        <div className="modal-grid">
          {[10, 100, 1000, 10000].map((n) => (
            <button key={n} className="btn btn-ghost" onClick={() => { addBalance(n); onClose(); }}>
              + <Price value={n} />
            </button>
          ))}
        </div>
        <button className="btn btn-plain" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

export function Layout({ route, children }: { route: string; children: ReactNode }) {
  const balance = useStore((s) => s.balance);
  const sound = useStore((s) => s.sound);
  const toggle = useStore((s) => s.toggle);
  const [modal, setModal] = useState(false);
  const active = route === 'case' ? '' : route;

  return (
    <div className="app">
      <LiveDrops />
      <header className="header">
        <a className="logo" href="#/">
          <span>CASE</span>SIMULATOR
        </a>
        <nav className="nav nav-top">
          {NAV.map((n) => (
            <a key={n.id} href={`#/${n.id}`} className={active === n.id ? 'is-active' : ''}>
              <Icon name={n.icon} />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="header-right">
          <button className="icon-btn" onClick={() => toggle('sound')} title={sound ? 'Desligar som' : 'Ligar som'}
            aria-label={sound ? 'Desligar som' : 'Ligar som'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9v6h4l5 4V5L8 9H4z" />
              {sound ? <path d="M16 9a4 4 0 010 6m2.5-9a8 8 0 010 12" /> : <path d="M16 9l5 6m0-6l-5 6" />}
            </svg>
          </button>
          <button className="balance" onClick={() => setModal(true)} title="Adicionar saldo fictício">
            <Price value={balance} />
            <b>+</b>
          </button>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        Simulador sem dinheiro real. Saldo e itens são fictícios e não podem ser sacados, vendidos ou trocados.
        Projeto de fã, sem vínculo com a Valve.
      </footer>
      <nav className="nav nav-bottom">
        {NAV.map((n) => (
          <a key={n.id} href={`#/${n.id}`} className={active === n.id ? 'is-active' : ''}>
            <Icon name={n.icon} />
            {n.label}
          </a>
        ))}
      </nav>
      {modal && <BalanceModal onClose={() => setModal(false)} />}
    </div>
  );
}
