import type { ReactNode } from 'react';
import { getDb, imgUrl } from '../lib/catalog';
import { money, pct } from '../lib/format';
import type { CaseDef, Item } from '../types';

export function Price({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`price ${className}`}>
      <i className="coin" aria-hidden="true" />
      {money(value)}
    </span>
  );
}

interface ItemCardProps {
  item: Item;
  chance?: number;
  selected?: boolean;
  dim?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  children?: ReactNode;
}

export function ItemCard({ item, chance, selected, dim, size = 'md', onClick, children }: ItemCardProps) {
  const cls = `item r-${item.r} item-${size}${selected ? ' is-selected' : ''}${dim ? ' is-dim' : ''}${onClick ? ' is-click' : ''}`;
  return (
    <div className={cls} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()) : undefined}>
      <div className="item-top">
        <Price value={item.p} />
        <span className="item-meta">
          {chance !== undefined && <span>{pct(chance)}</span>}
          {item.wear && <b>{item.wear}</b>}
        </span>
      </div>
      <img className="item-img" src={imgUrl(item)} alt="" loading="lazy" draggable={false} />
      <div className="item-name">
        <span>{item.w}</span>
        <strong>{item.s || ' '}</strong>
      </div>
      {children}
    </div>
  );
}

// Tons das caixas sem arte oficial, escolhidos pelo nome para ficarem sempre iguais.
function hue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

/** Arte da caixa: imagem oficial quando existe; senão, uma caixa desenhada com o melhor item em destaque. */
export function CaseArt({ c }: { c: CaseDef }) {
  if (c.img) return <img className="case-art-img" src={c.img} alt="" loading="lazy" draggable={false} />;
  const top = getDb().items[c.drops[0][0]];
  return (
    <div className="crate" style={{ '--h': hue(c.name) } as React.CSSProperties}>
      <div className="crate-lid" />
      <div className="crate-body" />
      <img src={imgUrl(top)} alt="" loading="lazy" draggable={false} />
    </div>
  );
}

export function CaseCard({ c }: { c: CaseDef }) {
  const off = c.old && c.old > c.price ? Math.round((1 - c.price / c.old) * 100) : 0;
  return (
    <a className="case-card" href={`#/case/${encodeURIComponent(c.id)}`}>
      <div className="case-card-art">
        <CaseArt c={c} />
      </div>
      <div className="case-card-price">
        {c.price === 0 ? (
          <span className="tag tag-free">Grátis</span>
        ) : (
          <>
            {off > 0 && <s>{money(c.old as number)}</s>}
            <Price value={c.price} />
          </>
        )}
      </div>
      <div className="case-card-name">{c.name}</div>
    </a>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
