/* Headless balance check: run AI-only matches and report outcomes. */
import { newGame, endTurn, play } from '../src/game/engine';
import { choosePlay } from '../src/game/ai';
import { CARD_BY_ID } from '../src/game/cards';

const N = Number(process.argv[2] ?? 200);
const wins = [0, 0, 0, 0];
const rounds: number[] = [];
const played: Record<string, number> = {};
const genesis: Record<string, number> = {};
let errors = 0;
for (let i = 0; i < N; i++) {
  const g = newGame({ seed: i + 1, difficulty: 'adept' });
  g.players[0].personality = 'human';
  let guard = 0;
  try {
    while (g.phase === 'playing' && guard++ < 5000) {
      let plays = 0;
      while (g.phase === 'playing' && plays++ < 6) {
        const intent = choosePlay(g);
        if (!intent) break;
        const id = g.players[g.current].hand.find((h) => h.uid === intent.uid)!.id;
        const r = play(g, g.current, intent);
        if (!r.ok) throw new Error('AI chose illegal play ' + id + ' ' + r.reason);
        played[id] = (played[id] ?? 0) + 1;
        if (CARD_BY_ID[id].kind === 'genesis') genesis[id] = (genesis[id] ?? 0) + 1;
      }
      g.fx = [];
      endTurn(g);
    }
  } catch (e) {
    errors++;
    console.error(e);
  }
  if (g.winner != null) wins[g.winner]++;
  rounds.push(g.round);
}
rounds.sort((a, b) => a - b);
console.log('wins by seat', wins, 'errors', errors);
const hist: Record<number, number> = {};
for (const r of rounds) hist[Math.min(31, Math.floor(r / 3) * 3)] = (hist[Math.min(31, Math.floor(r / 3) * 3)] ?? 0) + 1;
console.log('hist', JSON.stringify(hist));
console.log('rounds median', rounds[Math.floor(N / 2)], 'min', rounds[0], 'max', rounds[N - 1], 'capped', rounds.filter((r) => r > 30).length);
const unplayed = Object.keys(CARD_BY_ID).filter((k) => !played[k]);
console.log('never played:', unplayed.join(', ') || 'none');
console.log('genesis plays:', JSON.stringify(genesis));
