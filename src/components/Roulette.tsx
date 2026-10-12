import { useEffect, useMemo, useRef, useState } from 'react';
import { getDb, imgUrl } from '../lib/catalog';
import { pickWeighted } from '../lib/game';
import { tick } from '../lib/sound';
import type { CaseDef } from '../types';

const STRIP = 56;
const WIN = 48;
export const SPIN_MS = 6000;
export const FAST_MS = 900;

interface Props {
  caseDef: CaseDef;
  winner: number;
  fast: boolean;
  delay: number;
  withSound: boolean;
  onDone: () => void;
}

export function Roulette({ caseDef, winner, fast, delay, withSound, onDone }: Props) {
  const { items } = getDb();
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [done, setDone] = useState(false);

  // As cartas que passam são só enfeite: o resultado já foi sorteado com as chances reais.
  // Aqui os itens raros aparecem um pouco mais do que na tabela, para a faixa não ficar monótona.
  const strip = useMemo(() => {
    const visual = caseDef.drops.map(([id, prob]) => [id, Math.pow(prob, 0.55)] as const);
    const ids = Array.from({ length: STRIP }, () => pickWeighted(visual, Math.random));
    ids[WIN] = winner;
    return ids;
  }, [caseDef, winner]);

  useEffect(() => {
    const view = viewRef.current as HTMLDivElement;
    const track = trackRef.current as HTMLDivElement;
    const first = track.children[0] as HTMLElement;
    const second = track.children[1] as HTMLElement;
    const step = second.offsetLeft - first.offsetLeft;
    const cardW = first.offsetWidth;
    const offset = (Math.random() - 0.5) * cardW * 0.8;
    const x = WIN * step + cardW / 2 - view.clientWidth / 2 + offset;
    const duration = fast ? FAST_MS : SPIN_MS;

    const start = window.setTimeout(() => {
      track.style.transition = `transform ${duration}ms cubic-bezier(0.1, 0.62, 0.08, 1)`;
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
    }, 60 + delay);

    let raf = 0;
    let last = -1;
    const loop = () => {
      const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
      const index = Math.floor((-m.m41 + view.clientWidth / 2) / step);
      if (index !== last) {
        last = index;
        if (withSound) tick();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const end = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      setDone(true);
      doneRef.current();
    }, 60 + delay + duration + 200);

    return () => {
      clearTimeout(start);
      clearTimeout(end);
      cancelAnimationFrame(raf);
    };
  }, [strip, fast, delay, withSound]);

  return (
    <div className={`roulette${done ? ' is-done' : ''}`} ref={viewRef}>
      <div className="roulette-marker" />
      <div className="roulette-track" ref={trackRef}>
        {strip.map((id, i) => {
          const it = items[id];
          return (
            <div key={i} className={`roulette-card r-${it.r}${done && i === WIN ? ' is-winner' : ''}`}>
              <img src={imgUrl(it)} alt="" draggable={false} />
              <span>{it.w}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
