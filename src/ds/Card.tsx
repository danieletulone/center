'use client';
import type { CSSProperties } from 'react';
import { cardDef } from '@/game/cards';
import { useI18n } from '@/i18n/I18nProvider';
import { PlayCard } from './PlayCard';
import { GenesisCard } from './GenesisCard';

type CardText = { title: string; effect: string; trigger?: string; selfCost?: string };

/** Render any card (base or genesis) by id, in the active language. */
export function Card({ id, width = 240, style, className }: { id: string; width?: number; style?: CSSProperties; className?: string }) {
  const { d } = useI18n();
  const def = cardDef(id);
  const text = (d.cards as Record<string, CardText>)[id];
  if (def.kind === 'genesis') {
    return (
      <GenesisCard
        temperament={def.temperament}
        icon={def.id}
        title={text.title}
        trigger={text.trigger ?? ''}
        effect={text.effect}
        selfCost={text.selfCost}
        width={width}
        style={style}
        className={className}
        labels={{
          genesis: d.card.genesis,
          temperament: d.temperaments[def.temperament],
          trigger: d.card.trigger,
          effect: d.card.effect,
          selfCost: d.card.selfCost,
        }}
      />
    );
  }
  return (
    <PlayCard
      element={def.element}
      icon={def.id}
      title={text.title}
      category={d.categories[def.category]}
      cost={def.cost}
      effect={text.effect}
      tags={def.tags.map((t) => d.tags[t])}
      width={width}
      style={style}
      className={className}
      freeLabel={d.card.free}
    />
  );
}
