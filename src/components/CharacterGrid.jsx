import { characters } from '../data/characters.js';
import CharacterCard from './CharacterCard.jsx';

// Deterministic pseudo-random generator so the "organic" scatter is stable
// across renders (no layout jitter) but still looks hand-placed per card.
function seeded(id, salt) {
  const x = Math.sin(id * 999 + salt * 57) * 10000;
  return x - Math.floor(x);
}

// The grid itself (CSS Grid, see .card-grid) already lays every card out in
// strict reading order — row by row, left to right, low id to high id — at
// every breakpoint, since that's just source order. This function only
// adds a large per-card offset ON TOP of that grid position, so the result
// looks hand-scattered/chaotic close-up while the overall flow across the
// wall still reads top-left to bottom-right by number.
//
// Offsets are expressed as FRACTIONS of the card's own width/height
// (via --xf/--yf, consumed in CSS as calc(var(--xf) * var(--card-w))) —
// not fixed pixel values — so the same amount of visual "chaos" holds up
// automatically at every card size/breakpoint instead of needing a
// separate tuned number per media query.
function scatterStyle(id) {
  // Kept large enough to read as hand-scattered, but pulled back from an
  // earlier version that let cards overlap so much their tap targets
  // became ambiguous (visually on top of card A, but actually hit-testing
  // to card B underneath) — which was part of what caused "harus dipencet
  // 2x" (needing two presses: the first press was landing on the wrong,
  // hidden card).
  const rot = (seeded(id, 1) - 0.5) * 22; // -11deg .. 11deg
  const yf = (seeded(id, 2) - 0.5) * 0.56; // -0.28 .. 0.28 of card height
  const xf = (seeded(id, 3) - 0.5) * 0.44; // -0.22 .. 0.22 of card width
  const scale = 0.9 + seeded(id, 4) * 0.22; // 0.9 .. 1.12
  return {
    '--rot': `${rot.toFixed(2)}deg`,
    '--yf': yf.toFixed(3),
    '--xf': xf.toFixed(3),
    '--scale': scale.toFixed(3),
    '--stagger': id,
  };
}

export default function CharacterGrid() {
  return (
    <div className="card-grid" role="list" aria-label="36 kartu karakter, dapat dibalik">
      {characters.map((character) => (
        <div role="listitem" key={character.id} style={{ display: 'contents' }}>
          <CharacterCard character={character} style={scatterStyle(character.id)} />
        </div>
      ))}
    </div>
  );
}
