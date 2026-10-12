import { useEffect, useMemo, useRef, useState } from 'react';
import { CaseArt, Empty, ItemCard, Price } from '../components/ui';
import { getDb } from '../lib/catalog';
import { BATTLE_MODES, battleWinner, round2, simulateBattle } from '../lib/game';
import type { BattleMode } from '../lib/game';
import { loseSound, tick, winSound } from '../lib/sound';
import { useStore } from '../store';
import type { CaseDef } from '../types';

const MAX_ROUNDS = 10;
const BOTS = ['Bot Alfa', 'Bot Bravo', 'Bot Delta', 'Bot Eco', 'Bot Fox', 'Bot Kilo', 'Bot Lima', 'Bot Zulu'];

interface Game {
  id: number;
  cases: CaseDef[];
  mode: BattleMode;
  lowest: boolean;
  names: string[];
  /** drops[rodada][jogador] */
  drops: number[][];
  winner: number;
  total: number;
  payout: number;
}

function pickBots(n: number) {
  const pool = [...BOTS];
  return Array.from({ length: n }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
}

export function Battles() {
  const { cases, items } = getDb();
  const balance = useStore((s) => s.balance);
  const fast = useStore((s) => s.fast);
  const { charge, addBalance, bump } = useStore.getState();

  const [modeId, setModeId] = useState('1v1');
  const [lowest, setLowest] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [step, setStep] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const mode = BATTLE_MODES.find((m) => m.id === modeId) as BattleMode;
  const byId = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  const chosen = picks.map((id) => byId.get(id) as CaseDef);
  const cost = round2(chosen.reduce((s, c) => s + c.price, 0));
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => c.price > 0 && (!q || c.name.toLowerCase().includes(q))).sort((a, b) => a.price - b.price);
  }, [cases, query]);

  const rounds = game?.cases.length ?? 0;
  const finished = game !== null && step >= rounds * 2;
  const half = fast ? 300 : 900;

  useEffect(() => {
    if (!game || finished) return;
    const t = window.setTimeout(() => {
      setStep((s) => s + 1);
      tick();
    }, half);
    return () => clearTimeout(t);
  }, [game, step, finished, half]);

  useEffect(() => {
    if (!game || !finished) return;
    if (game.payout > 0) winSound(true);
    else loseSound();
  }, [game, finished]);

  function start(cs: CaseDef[], m: BattleMode, low: boolean) {
    const price = round2(cs.reduce((s, c) => s + c.price, 0));
    if (cs.length === 0 || !charge(price)) return;
    const players = m.teams.flat().length;
    const drops = simulateBattle(cs, players, Math.random);
    const totals = Array.from({ length: players }, (_, p) => round2(drops.reduce((s, r) => s + items[r[p]].p, 0)));
    const winner = battleWinner(totals, m.teams, low, Math.random);
    const total = round2(totals.reduce((s, v) => s + v, 0));
    const mine = m.teams[winner].includes(0);
    const payout = mine ? round2(total / m.teams[winner].length) : 0;
    bump({ battles: 1, battleWins: mine ? 1 : 0 });
    // o prêmio entra no saldo no fim, mesmo se você sair da tela durante a batalha
    window.setTimeout(() => payout > 0 && addBalance(payout), cs.length * 2 * (fast ? 300 : 900));
    setGame({ id: Date.now(), cases: cs, mode: m, lowest: low, names: ['Você', ...pickBots(players - 1)], drops, winner, total, payout });
    setStep(0);
  }

  if (game) {
    const revealed = Math.ceil(step / 2);
    const spinning = !finished && step % 2 === 0 ? step / 2 : -1;
    const current = Math.min(Math.floor(step / 2), rounds - 1);
    const playerTotal = (p: number) => round2(game.drops.slice(0, revealed).reduce((s, r) => s + items[r[p]].p, 0));
    const teamOf = (p: number) => game.mode.teams.findIndex((t) => t.includes(p));
    const winners = game.mode.teams[game.winner];
    const again = round2(game.cases.reduce((s, c) => s + c.price, 0));

    return (
      <div className="page">
        <h1 className="title">Batalha {game.mode.label}{game.lowest ? ' • invertida' : ''}</h1>
        <div className="rounds">
          {game.cases.map((c, i) => (
            <div key={i} className={`round${i === current && !finished ? ' is-current' : ''}${i < revealed ? ' is-done' : ''}`}
              title={c.name}>
              <CaseArt c={c} />
            </div>
          ))}
        </div>

        {finished && (
          <div className={`banner ${game.payout > 0 ? 'ok' : 'bad'}`}>
            {game.payout > 0 ? (
              <>Vitória! Você ganhou <Price value={game.payout} /></>
            ) : (
              <>Derrota. {winners.map((p) => game.names[p]).join(' e ')} {winners.length > 1 ? 'venceram' : 'venceu'}.</>
            )}
            <div className="banner-actions">
              <button className="btn btn-primary" disabled={balance < again}
                onClick={() => start(game.cases, game.mode, game.lowest)}>
                Repetir <Price value={again} />
              </button>
              <button className="btn btn-ghost" onClick={() => setGame(null)}>Nova batalha</button>
            </div>
          </div>
        )}

        <div className="arena" style={{ '--players': game.names.length } as React.CSSProperties}>
          {game.names.map((name, p) => (
            <div key={p} className={`player team-${teamOf(p)}${finished && winners.includes(p) ? ' is-winner' : ''}`}>
              <div className="player-head">
                <div className="avatar">{p === 0 ? 'V' : name.slice(4, 5)}</div>
                <div>
                  <strong>{name}</strong>
                  <Price value={playerTotal(p)} />
                </div>
              </div>
              <div className="player-slot">
                {spinning >= 0 ? (
                  <div className="spinner" />
                ) : (
                  <ItemCard item={items[game.drops[Math.max(revealed - 1, 0)][p]]} size="sm" />
                )}
              </div>
              <div className="player-drops">
                {game.drops.slice(0, Math.max(revealed - (spinning >= 0 ? 0 : 1), 0)).map((r, i) => (
                  <ItemCard key={i} item={items[r[p]]} size="sm" />
                )).reverse()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="title">Batalhas</h1>
      <p className="lead">
        Você e os bots abrem as mesmas caixas, com as mesmas chances. Quem somar mais leva o valor de todos os itens.
      </p>

      <div className="battle-setup">
        <div className="panel">
          <h3>Formato</h3>
          <div className="seg seg-wrap">
            {BATTLE_MODES.map((m) => (
              <button key={m.id} className={m.id === modeId ? 'is-active' : ''} onClick={() => setModeId(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={lowest} onChange={() => setLowest((v) => !v)} />
            Modo invertido (vence quem somar menos)
          </label>

          <h3>Caixas da batalha ({chosen.length}/{MAX_ROUNDS})</h3>
          {chosen.length === 0 ? (
            <Empty>Toque nas caixas da lista para adicionar.</Empty>
          ) : (
            <div className="rounds">
              {chosen.map((c, i) => (
                <button key={i} className="round is-removable" title={`Remover ${c.name}`}
                  onClick={() => setPicks((p) => p.filter((_, k) => k !== i))}>
                  <CaseArt c={c} />
                </button>
              ))}
            </div>
          )}
          <div className="panel-total">Custo: <Price value={cost} /></div>
          <button className="btn btn-primary btn-lg" disabled={chosen.length === 0 || balance < cost}
            onClick={() => start(chosen, mode, lowest)}>
            {chosen.length > 0 && balance < cost ? 'Saldo insuficiente' : 'Criar batalha'}
          </button>
        </div>

        <section className="section">
          <div className="section-head is-static">
            <h2>Adicionar caixas</h2>
            <input className="mini-search" type="search" placeholder="Buscar caixa" value={query}
              onChange={(e) => setQuery(e.target.value)} aria-label="Buscar caixa" />
          </div>
          <div className="grid grid-cases grid-tight">
            {list.map((c) => (
              <button key={c.id} className="case-card" disabled={picks.length >= MAX_ROUNDS}
                onClick={() => setPicks((p) => [...p, c.id])}>
                <div className="case-card-art"><CaseArt c={c} /></div>
                <div className="case-card-price"><Price value={c.price} /></div>
                <div className="case-card-name">{c.name}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
