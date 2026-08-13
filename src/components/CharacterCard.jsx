export default function CharacterCard({ character, isLifted, onSelect, registerRef }) {
  const { id, symbol, name, palette } = character;

  // Cards sit on a closed ring (see animations/introAnimations.js), each
  // meant to overlap its clockwise neighbor — one edge tucked under, the
  // other edge on top. Walking the ring in ascending z-index gives that
  // consistently for every card EXCEPT right where the walk wraps back
  // to its own start: something there has to sit in front of both its
  // neighbors, and something else has to sit behind both of its
  // neighbors. That seam can't be removed, only placed somewhere — so
  // one card is sacrificed as the one tucked fully under both its
  // neighbors. SACRIFICED_ID controls which card that is; the walk is
  // just re-started right after it (START_ID) so the seam lands exactly
  // on either side of that one card instead of at the fixed 36→01 wrap.
  const SACRIFICED_ID = 4;
  const START_ID = (SACRIFICED_ID % 36) + 1;
  const zIndex =
    id === SACRIFICED_ID ? 0 : ((id - START_ID + 36) % 36) + 1;

  const handleActivate = () => onSelect?.(character);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div className={`card-slot ${isLifted ? 'is-lifted' : ''}`} style={{ zIndex }}>
      {/* This is what the shuffle → grid → circle → orbit animation
          (x/y/rotation/opacity, all via GSAP) targets — see
          animations/introAnimations.js. Keeping it separate from
          .card-slot (a plain, never-transformed anchor point) means that
          animation never fights the perspective/preserve-3d chain those
          two elements exist to carry. It's also what CardModal reads
          gsap.getProperty(el, 'rotation') from to know this card's exact
          live orbit angle when flying the modal to/from it. */}
      <span className="card-anim">
        <div
          className="card"
          role="button"
          tabIndex={0}
          aria-label={`Lihat kartu ${symbol}, ${name}`}
          onClick={handleActivate}
          onKeyDown={handleKeyDown}
          ref={(el) => registerRef?.(id, el)}
          style={{
            background: palette.back,
            color: palette.ink,
            "--card-outline": palette.outline,
          }}
        >
          <span className="card-symbol">{symbol}</span>
          <span className="card-name-mark">{name}</span>
        </div>
      </span>
    </div>
  );
}
