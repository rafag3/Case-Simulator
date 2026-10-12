import { useEffect, useMemo, useRef, useState } from 'react';
import { Roulette } from '../components/Roulette';
import { CaseArt, Empty, ItemCard, Price } from '../components/ui';
import { getDb } from '../lib/catalog';
import { pushDrop } from '../lib/feed';
import { countdown, pct } from '../lib/format';
import { caseExpectedValue, rollCase, round2 } from '../lib/game';
import { winSound } from '../lib/sound';
import { FREE_COOLDOWN_MS, useStore } from '../store';
import type { InvItem } from '../store';

interface Spin {
  id: number;
  winners: number[];
  granted: InvItem[];
}

export function CasePage({ id }: { id: string }) {
  const { caseById, items } = getDb();
  const c = caseById.get(id);
  const balance = useStore((s) => s.balance);
  const fast = useStore((s) => s.fast);
  const inv = useStore((s) => s.inv);
  const freeAt = useStore((s) => s.freeAt[id] ?? 0);
  const { charge, grant, sell, bump, markFree, toggle } = useStore.getState();

  const [count, setCount] = useState(1);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [now, setNow] = useState(Date.now());
  const finished = useRef(0);

  const isFree = c?.price === 0;
  const waitMs = isFree ? freeAt + FREE_COOLDOWN_MS - now : 0;

  useEffect(() => {
    if (waitMs <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [waitMs > 0]);

  const ev = useMemo(() => (c ? caseExpectedValue(c, items) : 0), [c, items]);

  if (!c) return <Empty>Caixa não encontrada. <a href="#/">Voltar para as caixas</a></Empty>;

  const n = isFree ? 1 : count;
  const cost = round2(c.price * n);
  const canPay = balance >= cost;

  function open() {
    if (!c || phase === 'spinning' || waitMs > 0 || !charge(cost)) return;
    const winners = Array.from({ length: n }, () => rollCase(c, Math.random));
    const granted = grant(winners.map((w) => items[w].key), c.id);
    bump({ opened: n, spent: cost, dropped: winners.reduce((s, w) => s + items[w].p, 0) });
    if (isFree) markFree(c.id);
    finished.current = 0;
    setSpin({ id: Date.now(), winners, granted });
    setPhase('spinning');
  }

  function onStripDone() {
    if (!c || !spin) return;
    finished.current += 1;
    if (finished.current < spin.winners.length) return;
    setPhase('done');
    spin.winners.forEach((w) => pushDrop(w, c.id, true));
    const best = Math.max(...spin.winners.map((w) => items[w].p));
    winSound(best >= c.price * 2);
  }

  const kept = spin ? spin.granted.filter((g) => inv.some((i) => i.uid === g.uid)) : [];
  const keptValue = round2(kept.reduce((s, g) => s + (getDb().itemByKey.get(g.key)?.p ?? 0), 0));

  return (
    <div className="page">
      <a className="back" href="#/">‹ Voltar</a>
      <h1 className="title">{c.name}</h1>

      {spin ? (
        <div className={`stage stage-${spin.winners.length}`}>
          {spin.winners.map((w, i) => (
            <Roulette key={`${spin.id}-${i}`} caseDef={c} winner={w} fast={fast} delay={i * 120}
              withSound={i === 0} onDone={onStripDone} />
          ))}
        </div>
      ) : (
        <div className="case-hero">
          <CaseArt c={c} />
        </div>
      )}

      {phase === 'done' && spin && (
        <div className="result">
          <div className="grid grid-result">
            {spin.granted.map((g, i) => {
              const it = items[spin.winners[i]];
              const has = inv.some((x) => x.uid === g.uid);
              return (
                <ItemCard key={g.uid} item={it} dim={!has}>
                  <button className="btn btn-sm btn-ghost" disabled={!has} onClick={() => sell([g.uid])}>
                    {has ? 'Vender' : 'Vendido'}
                  </button>
                </ItemCard>
              );
            })}
          </div>
          {kept.length > 1 && (
            <button className="btn btn-ghost" onClick={() => sell(kept.map((g) => g.uid))}>
              Vender tudo por <Price value={keptValue} />
            </button>
          )}
        </div>
      )}

      <div className="controls">
        {!isFree && (
          <div className="seg" role="group" aria-label="Quantidade de caixas">
            {[1, 2, 3, 4, 5].map((k) => (
              <button key={k} className={count === k ? 'is-active' : ''} disabled={phase === 'spinning'}
                onClick={() => setCount(k)}>
                {k}
              </button>
            ))}
          </div>
        )}
        {waitMs > 0 ? (
          <button className="btn btn-primary btn-lg" disabled>Disponível em {countdown(waitMs)}</button>
        ) : canPay ? (
          <button className="btn btn-primary btn-lg" disabled={phase === 'spinning'} onClick={open}>
            {phase === 'spinning' ? 'Abrindo…' : phase === 'done' ? 'Abrir de novo' : 'Abrir'}
            {!isFree && phase !== 'spinning' && <Price value={cost} />}
            {isFree && phase !== 'spinning' && <span className="tag tag-free">Grátis</span>}
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" disabled>
            Saldo insuficiente: faltam <Price value={round2(cost - balance)} />
          </button>
        )}
        <label className="check">
          <input type="checkbox" checked={fast} onChange={() => toggle('fast')} />
          Abertura rápida
        </label>
      </div>

      <section className="section">
        <div className="section-head is-static">
          <h2>Conteúdo da caixa</h2>
          {!isFree && (
            <span title="Valor médio dos itens em relação ao preço da caixa">
              Retorno médio: {pct(ev / c.price)}
            </span>
          )}
        </div>
        <div className="grid grid-items">
          {c.drops.map(([itemId, prob]) => (
            <ItemCard key={itemId} item={items[itemId]} chance={prob} />
          ))}
        </div>
      </section>
    </div>
  );
}
