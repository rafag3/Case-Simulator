import { useEffect, useRef, useState } from 'react';
import { getDb, imgUrl } from '../lib/catalog';
import { tick } from '../lib/sound';
import { Price } from './ui';

interface Props {
  winners: number[];
  /** cartas de itens já vendidos ficam apagadas */
  dim: boolean[];
  fast: boolean;
  onDone: () => void;
}

/** Abertura em lote: as cartas começam viradas para baixo e vão virando em sequência. */
export function FlipGrid({ winners, dim, fast, onDone }: Props) {
  const { items } = getDb();
  const [go, setGo] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const step = fast ? 12 : winners.length > 50 ? 45 : 70;

  useEffect(() => {
    const timers = [window.setTimeout(() => setGo(true), 80)];
    // no modo rápido as cartas viram quase juntas: um clique a cada quatro basta
    winners.forEach((_, i) => {
      if (!fast || i % 4 === 0) timers.push(window.setTimeout(tick, 80 + i * step));
    });
    timers.push(window.setTimeout(() => doneRef.current(), 80 + winners.length * step + 500));
    return () => timers.forEach(clearTimeout);
  }, [winners, step, fast]);

  return (
    <div className={`flips${go ? ' is-go' : ''}`}>
      {winners.map((id, i) => {
        const it = items[id];
        return (
          <div key={i} className={`flip r-${it.r}${dim[i] ? ' is-dim' : ''}`} title={it.n}
            style={{ '--d': `${i * step}ms` } as React.CSSProperties}>
            <div className="flip-inner">
              <div className="flip-back" />
              <div className="flip-front">
                <img src={imgUrl(it, '128fx96f')} alt={it.n} draggable={false} />
                <Price value={it.p} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
