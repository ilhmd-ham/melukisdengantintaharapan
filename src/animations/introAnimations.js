import gsap from 'gsap';

const TWO_PI = Math.PI * 2;
const CARD_COUNT = 36;

function getRadius() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Leaves room for the center text block and stays clear of the
  // .intro's own edges — tuned as a fraction of the smaller viewport
  // dimension so it scales sensibly at every screen size.
  return Math.max(160, Math.min(vw, vh) * 0.4);
}

function getCardBox() {
  const styles = getComputedStyle(document.documentElement);
  return {
    w: parseFloat(styles.getPropertyValue('--card-w')) || 76,
    h: parseFloat(styles.getPropertyValue('--card-h')) || 100,
  };
}

// Card 01 sits at 12 o'clock, the rest follow clockwise in numeric order —
// so reading the ring clockwise from the top reads 01, 02, 03… Each card is
// also rotated to match its position on the ring (0° at 12 o'clock, 90° at
// 3 o'clock, and so on) so the whole set reads as a fanned-out circle of
// cards — like a spread deck — rather than a ring of upright cards.
function circlePoint(i, radius) {
  const angle = (i / CARD_COUNT) * TWO_PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rotation: (angle + Math.PI / 2) * (180 / Math.PI),
  };
}

// A loose, centered 9-column grid — the "dealt into neat rows" waypoint
// between the initial shuffle and the ring the cards curl into afterwards.
function gridPoint(i, cardW, cardH) {
  const cols = 9;
  const rows = Math.ceil(CARD_COUNT / cols);
  const col = i % cols;
  const row = Math.floor(i / cols);
  const colGap = cardW + 16;
  const rowGap = cardH + 18;
  return {
    x: (col - (cols - 1) / 2) * colGap,
    y: (row - (rows - 1) / 2) * rowGap,
  };
}

// Same seeded-random approach used elsewhere in the project, so the
// "shuffled deck" starting point is chaotic-looking but stable across
// re-renders rather than jumping around on every mount.
function seeded(i, salt) {
  const x = Math.sin((i + 1) * 999 + salt * 57) * 10000;
  return x - Math.floor(x);
}

function shufflePoint(i, radius) {
  const spread = radius * 1.15;
  return {
    x: (seeded(i, 11) - 0.5) * spread * 2,
    y: (seeded(i, 12) - 0.5) * spread * 2,
    rotate: (seeded(i, 13) - 0.5) * 130,
  };
}

// Plays the loading sequence once on mount: cards start as a shuffled
// deck, deal themselves into tidy rows, hold for a beat, then curl into a
// ring — after which a slow, continuous orbit takes over (see
// startOrbit()). Animates `.card-anim` — NEVER `.card-slot`, which stays a
// plain, untransformed anchor point (see CharacterCard.jsx / global.css) —
// so none of this fights the flip transition on `.card` or the
// perspective/preserve-3d chain those two elements exist to carry.
//
// Returns a controller object; call `.killOrbit()` to stop the idle
// rotation before anything else (e.g. the caller's own code) starts
// animating the same elements — most importantly right before the "wall
// opens" fly-away transition takes over.
export function playCardFormation({ entranceSelector, introTextEls, reduced }) {
  const controller = { killOrbit: () => {} };
  const radius = getRadius();
  const { w: cardW, h: cardH } = getCardBox();

  if (reduced) {
    gsap.set(entranceSelector, {
      x: (i) => circlePoint(i, radius).x,
      y: (i) => circlePoint(i, radius).y,
      rotation: (i) => circlePoint(i, radius).rotation,
      opacity: 1,
      scale: 1,
    });
    gsap.set(introTextEls, { opacity: 1, y: 0 });
    return controller;
  }

  gsap.set(entranceSelector, {
    x: (i) => shufflePoint(i, radius).x,
    y: (i) => shufflePoint(i, radius).y,
    rotation: (i) => shufflePoint(i, radius).rotate,
    opacity: 0,
    scale: 0.5,
  });
  gsap.set(introTextEls, { opacity: 0, y: 24 });

  gsap
    .timeline({ onComplete: () => startOrbit(entranceSelector, radius, controller) })
    .to(entranceSelector, {
      x: (i) => gridPoint(i, cardW, cardH).x,
      y: (i) => gridPoint(i, cardW, cardH).y,
      rotation: 0,
      opacity: 1,
      scale: 1,
      duration: 1,
      ease: 'back.out(1.5)',
      stagger: { each: 0.02, from: 'random' },
    })
    // Brief hold so the "dealt into rows" beat actually reads before it
    // curls up into a circle — without this the grid flashes past too
    // fast to register as its own step.
    .to({}, { duration: 0.3 })
    .to(
      entranceSelector,
      {
        x: (i) => circlePoint(i, radius).x,
        y: (i) => circlePoint(i, radius).y,
        rotation: (i) => circlePoint(i, radius).rotation,
        duration: 1.2,
        ease: 'power3.inOut',
        stagger: { each: 0.014, from: 'center' },
      },
      '>'
    )
    .to(introTextEls, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, '-=0.7');

  // Last-resort safety net — see the equivalent note this replaces further
  // down the file history: if the tween above never got to run for any
  // reason, the text must not stay invisible forever.
  setTimeout(() => gsap.set(introTextEls, { opacity: 1, y: 0 }), 4000);

  return controller;
}

// Continuous, very slow rotation once the ring has settled — cards
// translate along the circle AND spin with it, each staying pointed
// straight outward from the center (same fanned look as the initial
// formation), so the whole ring reads as one slowly turning wheel of
// cards rather than a set of upright cards sliding around a track.
function startOrbit(entranceSelector, initialRadius, controller) {
  const targets = gsap.utils.toArray(entranceSelector);
  const setX = targets.map((el) => gsap.quickSetter(el, 'x', 'px'));
  const setY = targets.map((el) => gsap.quickSetter(el, 'y', 'px'));
  const setRotation = targets.map((el) => gsap.quickSetter(el, 'rotation', 'deg'));
  const angularSpeed = TWO_PI / 150; // one full revolution every ~150s — slow and ambient
  const start = performance.now();
  let radius = initialRadius;

  const onResize = () => {
    radius = getRadius();
  };
  window.addEventListener('resize', onResize);

  const tick = () => {
    const t = (performance.now() - start) / 1000;
    for (let i = 0; i < targets.length; i++) {
      const baseAngle = (i / CARD_COUNT) * TWO_PI - Math.PI / 2;
      const angle = baseAngle + t * angularSpeed;
      setX[i](Math.cos(angle) * radius);
      setY[i](Math.sin(angle) * radius);
      setRotation[i]((angle + Math.PI / 2) * (180 / Math.PI));
    }
  };

  gsap.ticker.add(tick);
  controller.killOrbit = () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', onResize);
  };
}

// Cinematic hand-off from the card wall to the mural section. Cards break
// apart and drift outward, the intro copy dissolves upward, and the whole
// stage fades so the mural can rise from behind it. Calls onComplete once
// the visual beat has finished (used to trigger the smooth-scroll hand-off).
//
// Targets `.card-slot` (not `.card-anim`) on purpose: `.card-slot` has no
// transform of its own, so animating it adds a clean outward "fly" offset
// on top of wherever each card currently sits on the ring, rather than
// fighting over the same x/y that .card-anim's entrance/orbit animation
// already controls.
export function playWallOpenTransition({
  stageEl,
  cardsSelector,
  introTextEls,
  onComplete,
  reduced,
}) {
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    onComplete,
  });

  if (reduced) {
    onComplete?.();
    return tl;
  }

  const cards = gsap.utils.toArray(cardsSelector);

  tl.to(introTextEls, { opacity: 0, y: -30, duration: 0.5, stagger: 0.03 }, 0);

  // Distance is sized off the viewport itself (not a fixed pixel value) so
  // every card is guaranteed to clear the edge of the screen regardless of
  // how big the display is, rather than just drifting partway off.
  const escapeDist = Math.hypot(window.innerWidth, window.innerHeight) * 0.75;

  cards.forEach((card, i) => {
    // Each card gets its own random-but-stable direction, distance and
    // spin (seeded(), not Math.random(), so it doesn't reshuffle on every
    // re-render) — a real scatter, not a symmetric radial burst.
    const randAngle = seeded(i, 41) * TWO_PI;
    const randDist = escapeDist * (0.7 + seeded(i, 42) * 0.6);
    const randSpin = (seeded(i, 43) - 0.5) * 900;
    const randDelay = seeded(i, 44) * 0.35;
    const randDuration = 0.7 + seeded(i, 45) * 0.5;

    tl.to(
      card,
      {
        x: `+=${Math.cos(randAngle) * randDist}`,
        y: `+=${Math.sin(randAngle) * randDist}`,
        rotate: `+=${randSpin}`,
        opacity: 0,
        scale: 0.3,
        duration: randDuration,
        ease: 'power1.in',
      },
      randDelay
    );
  });

  tl.to(stageEl, { opacity: 0, duration: 0.6, ease: 'power1.in' }, '-=0.35');

  return tl;
}
