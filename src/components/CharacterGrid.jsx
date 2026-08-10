import { characters } from '../data/characters.js';
import CharacterCard from './CharacterCard.jsx';

// Deterministic pseudo-random generator so the "organic" scatter is stable
// across renders (no layout jitter) but still looks hand-placed per card.
function seeded(id, salt) {
  const x = Math.sin(id * 999 + salt * 57) * 10000;
  return x - Math.floor(x);
}

function scatterStyle(id) {
  const rot = (seeded(id, 1) - 0.5) * 10; // -5deg .. 5deg
  const yShift = (seeded(id, 2) - 0.5) * 22; // px
  const xShift = (seeded(id, 3) - 0.5) * 12; // px
  const scale = 0.94 + seeded(id, 4) * 0.14; // 0.94 .. 1.08
  return {
    '--rot': `${rot.toFixed(2)}deg`,
    '--y': `${yShift.toFixed(1)}px`,
    '--x': `${xShift.toFixed(1)}px`,
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
