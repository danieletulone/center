import type { CSSProperties } from 'react';
import { cardDef } from '@/game/cards';
import { PlayCard } from './PlayCard';
import { GenesisCard } from './GenesisCard';

/** Render any card (base or genesis) by id. */
export function Card({ id, width = 240, style, className }: { id: string; width?: number; style?: CSSProperties; className?: string }) {
  const d = cardDef(id);
  if (d.kind === 'genesis') {
    return (
      <GenesisCard
        temperament={d.temperament}
        icon={d.id}
        title={d.title}
        trigger={d.trigger}
        effect={d.effect}
        selfCost={d.selfCost}
        width={width}
        style={style}
        className={className}
      />
    );
  }
  return (
    <PlayCard
      element={d.element}
      icon={d.id}
      title={d.title}
      category={d.category}
      cost={d.cost}
      effect={d.effect}
      tags={d.tags}
      width={width}
      style={style}
      className={className}
    />
  );
}
