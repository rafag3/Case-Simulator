import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, ItemCard, Price } from '../components/ui';
import { getDb, imgUrl } from '../lib/catalog';
import { pct } from '../lib/format';
import { itemForValue, round2, upgradeChance, upgradeWins, type UpgradeSide } from '../lib/game';
import { loseSound, winSound } from '../lib/sound';
import { useInventory, useStore } from '../store';
import type { Item } from '../types';

const MAX_ITEMS = 4;
const MULTS = [1.5, 2, 3, 5, 10, 20];
const R = 88;
const CIRC = 2 * Math.PI * R;
// o roll vai de 0 a 100 e é a posição do ponteiro na volta, no sentido horário
const roll100 = (v: number) => (v * 100).toFixed(2).replace('.', ',');
const SIDE_KEY = 'upgrade-side';

function loadSide(): UpgradeSide {
  try {
    return localStorage.getItem(SIDE_KEY) === 'high' ? 'high' : 'low';
  } catch {
    return 'low';
  }
}

/** Texto da faixa vencedora, ex.: "abaixo de 25,00" ou "acima de 75,00". */
const winRange = (chance: number, side: UpgradeSide) =>
  side === 'low' ? `abaixo de ${roll100(chance)}` : `acima de ${roll100(1 - chance)}`;

export function Upgrade() {
  const { byPrice } = getDb();
  const inv = useInventory();
  const balance = useStore((s) => s.balance);
  const fast = useStore((s) => s.fast);
  const { charge, consume, grant, bump } = useStore.getState();

  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState(0);
  const [target, setTarget] = useState<Item | null>(null);
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'win' | 'lose'>('idle');
  const [angle, setAngle] = useState(0);
  const [played, setPlayed] = useState(0);
  const [rolled, setRolled] = useState(0);
  const [side, setSide] = useState<UpgradeSide>(loadSide);
  const [playedSide, setPlayedSide] = useState<UpgradeSide>(side);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const chosen = inv.filter((i) => picked.includes(i.uid));
  const cash = Math.min(Math.max(extra || 0, 0), balance);
  const bet = round2(chosen.reduce((s, i) => s + i.item.p, 0) + cash);
  const busy = phase === 'spinning';
  // durante o giro e no resultado, o medidor mostra a chance que valeu no sorteio
  const chance = phase === 'idle' ? (target ? upgradeChance(bet, target.p) : 0) : played;
  const shownSide = phase === 'idle' ? side : playedSide;

  function chooseSide(s: UpgradeSide) {
    if (busy) return;
    setSide(s);
    setPhase('idle');
    try {
      localStorage.setItem(SIDE_KEY, s);
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
  }

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = bet * 1.06;
    const out: Item[] = [];
    for (const it of byPrice) {
      if (it.p <= min || (q && !it.n.toLowerCase().includes(q))) continue;
      out.push(it);
      if (out.length === 60) break;
    }
    return out;
  }, [byPrice, bet, query]);

  // o alvo precisa valer mais do que a aposta
  useEffect(() => {
    if (target && !busy && phase === 'idle' && target.p <= bet * 1.06) setTarget(null);
  }, [bet, target, busy, phase]);

  function togglePick(uid: string) {
    if (busy) return;
    setPhase('idle');
    setPicked((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : p.length < MAX_ITEMS ? [...p, uid] : p));
  }

  function pickByMult(m: number) {
    if (bet <= 0) return;
    const it = itemForValue(byPrice, bet * m);
    if (it.p > bet * 1.06) {
      setTarget(it);
      setPhase('idle');
    }
  }

  function run() {
    if (!target || bet <= 0 || busy || !charge(cash)) return;
    const goal = target;
    const roll = Math.random();
    const win = upgradeWins(roll, chance, side);
    setPlayed(chance);
    setPlayedSide(side);
    setRolled(roll);
    consume(picked);
    bump({ upgrades: 1, upgradeWins: win ? 1 : 0 });
    setPicked([]);
    setExtra(0);
    setPhase('spinning');
    // o ponteiro para dentro do arco (no lado escolhido) só quando o sorteio foi vencedor
    setAngle((a) => Math.ceil(a / 360) * 360 + 360 * 4 + roll * 360);
    // a entrega acontece mesmo se você sair da tela durante a animação
    window.setTimeout(() => {
      if (win) grant([goal.key], 'upgrade');
      if (!mounted.current) return;
      setPhase(win ? 'win' : 'lose');
      if (win) winSound(true);
      else loseSound();
    }, fast ? 900 : 4200);
  }

  return (
    <div className="page">
      <h1 className="title">Aprimoramento</h1>
      <div className="upgrade">
        <div className="panel">
          <h3>Você aposta</h3>
          <div className="slots">
            {Array.from({ length: MAX_ITEMS }, (_, i) => {
              const it = chosen[i];
              return it ? (
                <button key={it.uid} className={`slot r-${it.item.r}`} onClick={() => togglePick(it.uid)}
                  title="Remover da aposta">
                  <img src={imgUrl(it.item, '128fx96f')} alt={it.item.n} />
                </button>
              ) : (
                <div key={i} className="slot is-empty">+</div>
              );
            })}
          </div>
          <label className="field">
            <span>Somar saldo</span>
            <input type="number" min={0} max={balance} step="0.5" inputMode="decimal" disabled={busy}
              value={extra || ''} placeholder="0,00"
              onChange={(e) => { setExtra(Number(e.target.value)); setPhase('idle'); }} />
          </label>
          <div className="panel-total">Aposta: <Price value={bet} /></div>
        </div>

        <div className="gauge-wrap">
          <div className={`gauge is-${phase}`}>
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={R} className="gauge-bg" />
              <circle cx="100" cy="100" r={R} className="gauge-arc" strokeDasharray={`${chance * CIRC} ${CIRC}`}
                transform={`rotate(${-90 + (shownSide === 'high' ? (1 - chance) * 360 : 0)} 100 100)`} />
            </svg>
            <div className="gauge-pointer"
              style={{ transform: `rotate(${angle}deg)`, transitionDuration: `${fast ? 800 : 4000}ms` }} />
            <span className="gauge-end gauge-end-0">0</span>
            <span className="gauge-end gauge-end-100">100</span>
            <div className="gauge-center">
              {phase === 'win' && <b className="ok">Aprimorado!</b>}
              {phase === 'lose' && <b className="bad">Não foi desta vez</b>}
              {(phase === 'win' || phase === 'lose') && (
                <span>roll {roll100(rolled)} • ganhava {winRange(played, playedSide)}</span>
              )}
              {(phase === 'idle' || phase === 'spinning') && (
                <>
                  <strong>{target || busy ? pct(chance) : '—'}</strong>
                  <span>{target && !busy ? `ganha com roll ${winRange(chance, side)}` : 'chance'}</span>
                </>
              )}
            </div>
          </div>
          <div className="side-toggle" role="radiogroup" aria-label="Lado da faixa vencedora">
            {(['low', 'high'] as const).map((s) => (
              <button key={s} role="radio" aria-checked={side === s} disabled={busy} onClick={() => chooseSide(s)}>
                {s === 'low' ? 'Início' : 'Fim'}
                {chance > 0 && (s === 'low' ? ` · 0–${Math.round(chance * 100)}` : ` · ${100 - Math.round(chance * 100)}–100`)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" disabled={!target || bet <= 0 || busy} onClick={run}>
            {busy ? 'Girando…' : 'Aprimorar'}
          </button>
          <div className="mults">
            {MULTS.map((m) => (
              <button key={m} className="chip" disabled={bet <= 0 || busy} onClick={() => pickByMult(m)}>x{m}</button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Você pode ganhar</h3>
          {target ? (
            <ItemCard item={target} />
          ) : (
            <div className="slot slot-big is-empty">Escolha o alvo na lista abaixo</div>
          )}
        </div>
      </div>

      <div className="split">
        <section className="section">
          <div className="section-head is-static">
            <h2>Seu inventário</h2>
            <span>até {MAX_ITEMS} itens</span>
          </div>
          {inv.length === 0 ? (
            <Empty>Sem itens. Você pode apostar só saldo ou <a href="#/">abrir uma caixa</a>.</Empty>
          ) : (
            <div className="grid grid-items grid-tight">
              {[...inv].sort((a, b) => b.item.p - a.item.p).map((i) => (
                <ItemCard key={i.uid} item={i.item} size="sm" selected={picked.includes(i.uid)}
                  onClick={() => togglePick(i.uid)} />
              ))}
            </div>
          )}
        </section>
        <section className="section">
          <div className="section-head is-static">
            <h2>Escolha o alvo</h2>
            <input className="mini-search" type="search" placeholder="Buscar skin" value={query}
              onChange={(e) => setQuery(e.target.value)} aria-label="Buscar skin" />
          </div>
          {bet <= 0 ? (
            <Empty>Monte a aposta primeiro: escolha itens ou some saldo.</Empty>
          ) : options.length === 0 ? (
            <Empty>Nenhuma skin acima do valor da aposta.</Empty>
          ) : (
            <div className="grid grid-items grid-tight">
              {options.map((it) => (
                <ItemCard key={it.id} item={it} size="sm" selected={target?.id === it.id}
                  chance={upgradeChance(bet, it.p)}
                  onClick={() => { if (!busy) { setTarget(it); setPhase('idle'); } }} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
