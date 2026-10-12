import { useEffect, useRef, useState } from 'react';
import { Empty, ItemCard, Price } from '../components/ui';
import { getDb, imgUrl } from '../lib/catalog';
import { CONTRACT_MAX, CONTRACT_MIN, itemForValue, pickWeighted, round2 } from '../lib/game';
import { winSound } from '../lib/sound';
import { useInventory, useStore } from '../store';
import type { Item } from '../types';

export function Contract() {
  const { byPrice, catalog } = getDb();
  const inv = useInventory();
  const fast = useStore((s) => s.fast);
  const { consume, grant, bump } = useStore.getState();

  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'signing' | 'done'>('idle');
  const [result, setResult] = useState<Item | null>(null);
  const [paid, setPaid] = useState(0);
  const [flash, setFlash] = useState<Item | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const chosen = inv.filter((i) => picked.includes(i.uid));
  const total = round2(chosen.reduce((s, i) => s + i.item.p, 0));
  const ready = chosen.length >= CONTRACT_MIN && phase !== 'signing';
  const table = catalog.contract;
  const minMult = Math.min(...table.map((t) => t[0]));
  const maxMult = Math.max(...table.map((t) => t[0]));

  // enquanto assina, passam itens aleatórios da faixa de valor possível
  useEffect(() => {
    if (phase !== 'signing') return;
    const pool = byPrice.filter((i) => i.p >= paid * minMult * 0.8 && i.p <= paid * maxMult);
    const list = pool.length ? pool : byPrice;
    const t = setInterval(() => setFlash(list[Math.floor(Math.random() * list.length)]), 90);
    return () => clearInterval(t);
  }, [phase, paid, byPrice, minMult, maxMult]);

  function toggle(uid: string) {
    if (phase === 'signing') return;
    if (phase === 'done') setPhase('idle');
    setPicked((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : p.length < CONTRACT_MAX ? [...p, uid] : p));
  }

  function sign() {
    if (!ready) return;
    const mult = pickWeighted(table, Math.random);
    const won = itemForValue(byPrice, total * mult);
    consume(picked);
    bump({ contracts: 1 });
    setPaid(total);
    setPicked([]);
    setPhase('signing');
    // a entrega acontece mesmo se você sair da tela durante a animação
    window.setTimeout(() => {
      grant([won.key], 'contract');
      if (!mounted.current) return;
      setResult(won);
      setPhase('done');
      winSound(won.p > total);
    }, fast ? 700 : 2600);
  }

  return (
    <div className="page">
      <h1 className="title">Contrato</h1>
      <p className="lead">
        Troque de {CONTRACT_MIN} a {CONTRACT_MAX} itens por um só. O item recebido vale entre{' '}
        {Math.round(minMult * 100)}% e {Math.round(maxMult * 100)}% do total entregue.
      </p>

      <div className="contract">
        <div className="panel">
          <h3>Itens do contrato ({chosen.length}/{CONTRACT_MAX})</h3>
          <div className="slots slots-10">
            {Array.from({ length: CONTRACT_MAX }, (_, i) => {
              const it = chosen[i];
              return it ? (
                <button key={it.uid} className={`slot r-${it.item.r}`} onClick={() => toggle(it.uid)}
                  title="Remover do contrato">
                  <img src={imgUrl(it.item, '128fx96f')} alt={it.item.n} />
                </button>
              ) : (
                <div key={i} className="slot is-empty">+</div>
              );
            })}
          </div>
          <div className="panel-total">Total: <Price value={total} /></div>
          <button className="btn btn-primary btn-lg" disabled={!ready} onClick={sign}>
            {phase === 'signing' ? 'Assinando…' : chosen.length < CONTRACT_MIN
              ? `Escolha mais ${CONTRACT_MIN - chosen.length}` : 'Assinar contrato'}
          </button>
        </div>

        <div className="panel contract-result">
          <h3>Resultado</h3>
          {phase === 'signing' && flash && <ItemCard item={flash} dim />}
          {phase === 'done' && result && (
            <>
              <ItemCard item={result} />
              <div className={result.p >= paid ? 'ok' : 'bad'}>
                Você entregou <Price value={paid} /> e recebeu <Price value={result.p} />
              </div>
            </>
          )}
          {phase === 'idle' && <div className="slot slot-big is-empty">O item do contrato aparece aqui</div>}
        </div>
      </div>

      <section className="section">
        <div className="section-head is-static">
          <h2>Seu inventário</h2>
          <button className="link" disabled={phase === 'signing' || inv.length === 0}
            onClick={() => { setPhase('idle'); setPicked([...inv].sort((a, b) => a.item.p - b.item.p).slice(0, CONTRACT_MAX).map((i) => i.uid)); }}>
            Escolher os {CONTRACT_MAX} mais baratos
          </button>
        </div>
        {inv.length === 0 ? (
          <Empty>Sem itens para o contrato. <a href="#/">Abra uma caixa</a> primeiro.</Empty>
        ) : (
          <div className="grid grid-items grid-tight">
            {[...inv].sort((a, b) => b.item.p - a.item.p).map((i) => (
              <ItemCard key={i.uid} item={i.item} size="sm" selected={picked.includes(i.uid)}
                onClick={() => toggle(i.uid)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
