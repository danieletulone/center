# CENTER

*A turn-based tug-of-war for four.* Single point of contention. Four ways to want it.

CENTER is a browser card-strategy game built from the **Waract** design system
(exported from Claude Design). Four players sit around the Center;
pull cards drag it toward you, attacks push it away from your rivals. First to a
pull of **21** claims it.

- **82 cards**: the full 64-card base library across seven suits and 18 Genesis cards across three temperaments, all playable
- **A rules engine** where every card has a real, tested effect: reach and seats, shields, mirrors, freezes, generators, maneuvers, Genesis triggers, the temperament triangle, and Convergence as an anti-stalemate rule
- **Three AI rivals** (Aggressor, Trickster, Warden) that score every legal play by simulating it, at three difficulties
- **A WebGL table** (three.js / React Three Fiber): a shader Nexus that drifts toward whoever is winning, light tethers, element-coloured spell bolts, particle bursts, shields, frost crowns, floor shockwaves, bloom, chromatic aberration and camera shake
- **Procedural audio**: every sound is synthesised at runtime with WebAudio, so there are no audio assets to ship
- **Codex** (all 82 cards, filter and search), **Rules**, OG images, PWA manifest, sitemap

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| 3D | three 0.186, @react-three/fiber 9, @react-three/drei 10, @react-three/postprocessing 3 |
| State | zustand |
| Fonts | Jomolhari, Karantina, Jura via `next/font/google` (the exact faces from the design system) |

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Other scripts:

```bash
npm run lint
npm run typecheck
npm run simulate -- 300   # headless AI-vs-AI balance run (wins by seat, match length, card coverage)
```

## Deploy

All routes prerender as static, so it runs on any Node host or on Vercel.
On Vercel, import the repo as-is (Next.js preset). Set `NEXT_PUBLIC_SITE_URL` to the
production origin so canonical URLs, the sitemap and OG metadata resolve.

## Layout

```
src/
  app/            routes: / (title), /play, /codex, /rules, plus OG image, icon, manifest, robots, sitemap
  ds/             Waract design-system components ported to TSX (PlayCard, GenesisCard, CardGlyph, ElementOrb, Flourish, Button…)
  game/           cards.ts (the 82 cards) · engine.ts (rules) · ai.ts (rivals) · store.ts (client store + FX queue)
  three/          GameScene (table, tokens, tethers, FX director), TitleScene, Nexus shader, HexFloor shader, pooled particles
  ui/             Title, Play/Setup, HUD (hand, pool, chronicle, cast display, genesis reveal, end screen), Codex
  lib/            procedural audio, storage hook
scripts/simulate.ts
```

## Rules in brief

- Each turn: unspent elements fade; gain one of each element plus one *attuned* to your hand plus generator output; draw 2; play up to 3 cards; end turn.
- **Plasma** (fire) attacks reach only your two neighbours. **Cryo** (ice) is ranged. *Reach* and *Leader* cards ignore range.
- Seat-moving **maneuvers** must open your turn, and they end it.
- **Genesis** cards appear once their trigger is met (from round 3 on). They are free and don't use a play. When the temperament you play beats one a rival already played, its numbers get +2.
- **Element triangle**: Plasma > Cryo > Particle > Plasma. Hitting a rival whose last card was the element you beat adds +1 push.
- **Convergence**: from rounds 10, 16 and 22, every pull gains +1, +2, +3.

The full text is at `/rules` in the app.

## Design decisions

The handoff defined the cards and the visual language but not a complete rule set.
These interpretations are implemented and documented in `/rules`:

- Win at pull 21, with a 30-round cap. AI simulation tuning gives a median match of about 9 rounds and no stalemates.
- Unspent elements don't carry over (Reservoir changes this). Choice effects (Drift, Transmute, Harvest) are *attuned* automatically to the cards in your hand.
- "Steal an element" (Backdraft) takes a leftover element if the target has one; otherwise it ices one of the target's next-turn elements.
- Harvest Moon counts only bonus generation (generators and economy cards), not the base income.
- Later seats start with one extra card to offset first-player tempo.
