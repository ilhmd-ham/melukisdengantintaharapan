export default function CharacterCard({ character, onSelect }) {
  const { id, symbol, name, palette } = character;

  // Cards sit on a closed ring (see animations/introAnimations.js), each
  // meant to overlap its clockwise neighbor — one edge tucked under, the
  // other edge on top. Plain ascending z-index (1, 2, 3 … 36) gives that
  // consistently for every card EXCEPT right where the sequence wraps
  // back to the start: something there has to sit in front of both its
  // neighbors, and something else has to sit behind both of its
  // neighbors. That seam can't be removed, only placed somewhere — so
  // card 36 is sacrificed as the one tucked fully under both its
  // neighbors (35 and 01), keeping every other card correctly "one side
  // under, one side over".
  const zIndex = id === 36 ? 0 : id;

  const handleActivate = () => onSelect?.(character);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div className="card-slot" style={{ zIndex }}>
      {/* This is what the shuffle → grid → circle → orbit animation
          (x/y/rotation/opacity, all via GSAP) targets — see
          animations/introAnimations.js. Keeping it separate from
          .card-slot (a plain, never-transformed anchor point) means that
          animation never fights the perspective/preserve-3d chain those
          two elements exist to carry. */}
      <span className="card-anim">
        <div
          className="card"
          role="button"
          tabIndex={0}
          aria-label={`Lihat kartu ${symbol}, ${name}`}
          onClick={handleActivate}
          onKeyDown={handleKeyDown}
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
