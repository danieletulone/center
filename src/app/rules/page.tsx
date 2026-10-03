import type { Metadata } from 'next';
import Link from 'next/link';
import { Flourish } from '@/ds/Flourish';
import { ElementOrb } from '@/ds/ElementOrb';
import { TemperamentMark } from '@/ds/GenesisCard';
import { CONVERGENCE_ROUNDS, DRAW_PER_TURN, GENESIS_FROM_ROUND, HAND_MAX, HAND_START, MAX_PLAYS, MAX_ROUNDS, WIN_PULL } from '@/game/engine';
import styles from './rules.module.css';

export const metadata: Metadata = {
  title: 'Rules',
  description: 'How the tug is won: the Center, pull and push, elements, reach, maneuvers and Genesis.',
};

export default function Rules() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/">◂ Center</Link>
        <Link href="/play">Play ▸</Link>
      </nav>
      <header className={styles.head}>
        <div className={styles.kicker}>The rite</div>
        <h1>Rules</h1>
        <Flourish width={300} />
      </header>

      <section>
        <h2>The Tug</h2>
        <p>
          Four players sit around a single point of contention — the <b>Center</b>. Each player has a <b>pull</b>: how far the Center leans toward them. Everyone starts at 0.
          The first to reach a pull of <b>{WIN_PULL}</b> claims the Center and wins. If {MAX_ROUNDS} rounds pass, the highest pull wins.
        </p>
        <ul>
          <li>
            <b>Pull</b> cards add to your own pull.
          </li>
          <li>
            <b>Push</b> cards subtract from a rival&apos;s pull. Pull can fall below zero.
          </li>
          <li>The Nexus at the heart of the table physically drifts toward whoever is winning.</li>
        </ul>
      </section>

      <section>
        <h2>Your Turn</h2>
        <ol>
          <li>
            <b>Refresh.</b> Unspent elements fade. You gain one of each element, plus one more attuned to what your hand needs, plus anything your generators make.
          </li>
          <li>
            <b>Draw</b> {DRAW_PER_TURN} cards. You start with {HAND_START} (the last two seats start with one more, to offset tempo); at the end of your turn you discard down to {HAND_MAX}.
          </li>
          <li>
            <b>Play</b> up to {MAX_PLAYS} cards you can afford. Genesis cards are free and don&apos;t count.
          </li>
          <li>
            <b>End</b> your turn. Turns pass clockwise; a full circle is a round.
          </li>
        </ol>
      </section>

      <section>
        <h2>Elements</h2>
        <div className={styles.elements}>
          {(
            [
              ['fire', 'Plasma', 'Offense. Close range — reaches only your two neighbours.'],
              ['ice', 'Cryo', 'Control. Ranged — reaches any rival. Slows, freezes, locks.'],
              ['arcane', 'Particle', 'Defense. Walls, mirrors, redirection, anchoring.'],
              ['flux', 'Flux', 'Motion. Pull, economy, maneuvers and wild cards.'],
            ] as const
          ).map(([el, name, text]) => (
            <div key={el} className={styles.el}>
              <ElementOrb element={el} size={28} />
              <div>
                <h3>{name}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p>
          <b>Element triangle.</b> Plasma melts Cryo, Cryo stills Particle, Particle smothers Plasma. Attack a rival whose last card was the element yours beats and the push gains <b>+1</b>.
        </p>
      </section>

      <section>
        <h2>Reach &amp; Seats</h2>
        <p>
          Your two side seats are your <b>neighbours</b>; the seat across the Center is your <b>Front</b>. Plasma attacks reach neighbours only. <b>Reach</b> and <b>Leader</b> cards — and every Cryo card — ignore range.
          Vantage lets you strike your Front; Encircle lets you strike every seat.
        </p>
        <p>
          <b>Maneuvers</b> that move seats (Sidestep, Flank, Rotate, Pivot, Displace, Blindside) must be the first card you play, and they end your turn. Anchor Down and Lockstep Field hold seats in place.
        </p>
      </section>

      <section>
        <h2>Defense</h2>
        <p>
          Defensive cards last until your next turn. Shields absorb push point-for-point. Bulwark and Aegis block attacks outright; Mirror reflects, Magnius redirects, Phase dodges one targeted card,
          Static Field cancels Cryo sabotage. Plasma Lance and Blindside ignore defenses.
        </p>
      </section>

      <section>
        <h2>Genesis</h2>
        <p>
          Eighteen eureka cards sit outside every deck. From round {GENESIS_FROM_ROUND}, when you meet one&apos;s trigger it materialises in your hand — once per match. Three temperaments form a triangle:
        </p>
        <div className={styles.tempers}>
          <span>
            <TemperamentMark temperament="ascendant" /> Ascendant overruns Tempered
          </span>
          <span>
            <TemperamentMark temperament="malefic" /> Malefic punishes Ascendant
          </span>
          <span>
            <TemperamentMark temperament="tempered" /> Tempered outlasts Malefic
          </span>
        </div>
        <p>Play a Genesis while any rival has already played the temperament yours beats, and it is <b>empowered</b>: +2 to its numbers.</p>
      </section>

      <section>
        <h2>Convergence</h2>
        <p>
          The Center hungers. From round {CONVERGENCE_ROUNDS[0]}, every pull gains +1; from round {CONVERGENCE_ROUNDS[1]}, +2; from round {CONVERGENCE_ROUNDS[2]}, +3. Stalemates do not last.
        </p>
      </section>

      <section>
        <h2>Controls</h2>
        <ul>
          <li>Click a card to select it, then click a glowing rival to target. Self-cast cards show a Play button.</li>
          <li>Right-click (or the ⤢ corner) to inspect a card. Esc cancels or opens the menu. Enter ends your turn.</li>
        </ul>
      </section>

      <footer className={styles.foot}>
        <Flourish width={240} flip />
        <Link href="/play" className={styles.cta}>
          Enter the Center
        </Link>
      </footer>
    </main>
  );
}
