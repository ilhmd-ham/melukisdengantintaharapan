import { useState } from 'react';
import { characters } from '../data/characters.js';
import CharacterCard from './CharacterCard.jsx';
import CardModal from './CardModal.jsx';

// Layout/positioning for all 36 cards (shuffle → grid → circle → idle
// orbit) is handled entirely in JS/GSAP — see animations/introAnimations.js
// — targeting `.card-anim` by class selector in DOM order, which is why
// order here matters: it must stay id-ascending (01 → 36) so index `i` in
// those animations lines up with each card's actual number.
export default function CharacterGrid() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="card-grid" role="list" aria-label="36 kartu karakter">
      {characters.map((character) => (
        <div role="listitem" key={character.id} style={{ display: 'contents' }}>
          <CharacterCard character={character} onSelect={setSelected} />
        </div>
      ))}
      <CardModal character={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
