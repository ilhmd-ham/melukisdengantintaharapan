import { useCallback, useRef, useState } from 'react';
import gsap from 'gsap';
import { characters } from '../data/characters.js';
import CharacterCard from './CharacterCard.jsx';
import CardModal from './CardModal.jsx';

// Layout/positioning for all 36 cards (shuffle → grid → circle → idle
// orbit) is handled entirely in JS/GSAP — see animations/introAnimations.js
// — targeting `.card-anim` by class selector in DOM order, which is why
// order here matters: it must stay id-ascending (01 → 36) so index `i` in
// those animations lines up with each card's actual number.
export default function CharacterGrid() {
  const [selected, setSelected] = useState(null); // { character, origin }
  const cardElRefs = useRef(new Map()); // id -> the .card DOM node

  const registerRef = useCallback((id, el) => {
    if (el) cardElRefs.current.set(id, el);
    else cardElRefs.current.delete(id);
  }, []);

  // Measures a card's CURRENT on-screen center, size, and orbit rotation —
  // "current" is the whole point: the ring keeps orbiting continuously
  // (see introAnimations.js's startOrbit), so this has to be re-measured
  // live at both open time and close time, never cached, or the modal
  // would fly back to a stale position the ring has long since left.
  // `getBoundingClientRect()` reflects whatever GSAP has drawn on the
  // current frame regardless of which phase (shuffle/grid/circle/orbit)
  // is running, and `gsap.getProperty` reads the exact rotation value
  // GSAP is currently driving on that same element — together they're a
  // precise, always-live snapshot without needing a parallel position
  // tracker of our own.
  const measureCard = useCallback((id) => {
    const el = cardElRefs.current.get(id);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const animEl = el.parentElement; // .card-anim — what GSAP actually animates
    const rotation = animEl ? gsap.getProperty(animEl, 'rotation') : 0;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: el.offsetWidth,
      height: el.offsetHeight,
      rotation: typeof rotation === 'number' ? rotation : 0,
    };
  }, []);

  const handleSelect = useCallback(
    (character) => {
      const origin = measureCard(character.id);
      setSelected({ character, origin });
    },
    [measureCard]
  );

  const handleClose = useCallback(() => setSelected(null), []);

  return (
    <div className="card-grid" role="list" aria-label="36 kartu karakter">
      {characters.map((character) => (
        <div role="listitem" key={character.id} style={{ display: 'contents' }}>
          <CharacterCard
            character={character}
            onSelect={handleSelect}
            registerRef={registerRef}
            isLifted={selected?.character.id === character.id}
          />
        </div>
      ))}
      <CardModal
        character={selected?.character ?? null}
        origin={selected?.origin ?? null}
        getLiveOrigin={() => (selected ? measureCard(selected.character.id) : null)}
        onClose={handleClose}
      />
    </div>
  );
}
