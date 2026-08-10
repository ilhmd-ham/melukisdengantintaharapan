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
  const rot = (seeded(id, 1) - 0.5) * 34; // -17deg .. 17deg
  const yf = (seeded(id, 2) - 0.5) * 1.1; // -0.55 .. 0.55 of card height
  const xf = (seeded(id, 3) - 0.5) * 0.9; // -0.45 .. 0.45 of card width
  const scale = 0.82 + seeded(id, 4) * 0.4; // 0.82 .. 1.22
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
