import gsap from 'gsap';

const TWO_PI = Math.PI * 2;
const CARD_COUNT = 36;
const MOBILE_BREAKPOINT = 900;

function isMobileViewport() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

export function getRadius() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (isMobileViewport()) {
    // Previously sized off viewport WIDTH alone (vw * 0.86), which is why
    // the ring reached almost to the very top and bottom edges of the
    // screen on tall phones — its vertical reach (±radius from the
    // vertical center) had no relationship to how much vertical room was
    // actually free. Budgeting off viewport HEIGHT instead keeps the ring
    // clear of both the year label pinned above it and the CTA pinned
    // below it (see .intro-year / .intro-copy in global.css), landing it
    // in the middle band of the screen as in the sketch. Still capped by
    // width too, so it doesn't balloon past a sensible size on short,
    // wide screens.
    return Math.max(150, Math.min(vh * 0.3, vw * 0.85));
  }
  // Leaves room for the center text block and stays clear of the
  // .intro's own edges — tuned as a fraction of the smaller viewport
  // dimension so it scales sensibly at every screen size.
  return Math.max(160, Math.min(vw, vh) * 0.4);
}

// On mobile, the ring's own center is pushed off the left edge of the
// screen so only its near, right-facing half-arc actually falls inside
// the viewport — matching the sketch (a half-circle bulging right, its
// open/flat edge near the screen's left side). The far half of the ring
// still exists and keeps animating exactly as before, just off-screen —
// reachable by dragging the ring to rotate it (see startOrbit's
// pointer-drag handling), which is what brings those hidden cards into
// view. Desktop is untouched: offset (0, 0) keeps the full circle
// centered, same as before this change.
export function getCenterOffset(radius) {
  if (!isMobileViewport()) {
    setRingOffsetVar(0);
    return { cx: 0, cy: 0 };
  }
  const r = radius ?? getRadius();
  const vw = window.innerWidth;

  // Two competing goals, resolved by taking whichever pushes further
  // left: (a) the right edge of the ring should land close to the
  // screen's own right edge (~42% of vw out from center) — this is what
  // makes the arc actually reach the edge instead of floating with a gap
  // — and (b) the LEFT edge of the ring must land off-screen (past -50%
  // of vw, with a small buffer) so the far half genuinely never shows —
  // this is the actual fix for it rendering as a near-complete circle:
  // a fixed "-radius * 0.62" offset (the previous approach) only
  // satisfies (b) for some radius/width combinations, not all of them.
  const forRightEdge = vw * 0.09 - r;
  const forHiddenLeftEdge = r - vw * 0.5 - 12;
  const cx = Math.min(forRightEdge, forHiddenLeftEdge);
  setRingOffsetVar(cx);
  return { cx, cy: 0 };
}

// Exposes the ring's horizontal center offset as a CSS custom property so
// plain CSS (the name text, see .intro-copy-center in global.css) can
// shift to match it without duplicating this math there.
function setRingOffsetVar(cx) {
  document.documentElement.style.setProperty('--ring-cx', `${cx}px`);
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
// `spin` is the live drag/orbit angle added on top of each card's fixed
// slot angle (0 for the static formation steps, live-updating in
// startOrbit's tick loop); `offset` is the mobile off-screen-center shift.
function circlePoint(i, radius, spin = 0, offset = { cx: 0, cy: 0 }) {
  const angle = (i / CARD_COUNT) * TWO_PI - Math.PI / 2 + spin;
  return {
    x: Math.cos(angle) * radius + offset.cx,
    y: Math.sin(angle) * radius + offset.cy,
    rotation: (angle + Math.PI / 2) * (180 / Math.PI),
  };
}

// All whole-number divisors of 36, largest first — every option here
// divides evenly, so however many columns end up chosen, the resulting
// rows are always exactly full (36 / cols is always a whole number) and
// no card is ever left sitting alone on its own row.
const GRID_COLUMN_OPTIONS = [9, 6, 4, 3, 2, 1];

// Picks the most columns that still fit comfortably within the actual
// viewport width. Previously fixed at 9 regardless of screen size — fine
// on desktop, but on narrow phones 9 × (card width + gap) is wider than
// the screen, which is why the leftmost and rightmost cards clipped off
// during this step. A small safety margin (8% of the viewport) keeps the
// outermost cards from ever touching the very edge.
function pickGridColumns(cardW) {
  const vw = window.innerWidth;
  const colGap = cardW + 16;
  const safeWidth = vw * 0.96;
  for (const cols of GRID_COLUMN_OPTIONS) {
    if (cols * colGap <= safeWidth) return cols;
  }
  return 1;
}

// A loose, centered grid — the "dealt into neat rows" waypoint between the
// initial shuffle and the ring the cards curl into afterwards. `cols` is
// computed per-viewport by pickGridColumns() (see above) rather than
// hardcoded, so this always lays out as full rows that fit on-screen.
// `scale` (see getGridScale() below) uniformly shrinks both the spacing
// AND the cards' own rendered size (applied via the `scale:` tween in
// playCardFormation), so tall grids (many rows) always fit within the
// visible viewport — as large as the screen allows, never overlapping.
function gridPoint(i, cardW, cardH, cols, scale = 1) {
  const rows = Math.ceil(CARD_COUNT / cols);
  const col = i % cols;
  const row = Math.floor(i / cols);
  const colGap = (cardW + 16) * scale;
  const rowGap = (cardH + 18) * scale;
  return {
    x: (col - (cols - 1) / 2) * colGap,
    y: (row - (rows - 1) / 2) * rowGap,
  };
}

// pickGridColumns() only ever budgeted for the grid's WIDTH fitting the
// screen — it picks the most columns that fit horizontally, but however
// many columns come out of that, the resulting row count (36 / cols) was
// never checked against the viewport's actual HEIGHT. On tall-but-narrow
// phone screens that's exactly backwards: fewer columns (forced by a
// narrow width) means MORE rows, and that taller grid routinely grew past
// the top and bottom edges of .intro — which clips with overflow:hidden —
// so the top and bottom rows of cards simply never appeared during the
// loading sequence. Rather than fight the width/height budgets against
// each other by changing the column count (which would just trade the
// clipping from one axis to the other), this keeps pickGridColumns' column
// choice as-is and instead computes a single uniform scale-down factor,
// applied to BOTH the spacing AND the cards' own rendered size (see the
// `scale:` tween in playCardFormation) so cards actually shrink together
// with the gaps between them — shrinking spacing alone while leaving the
// cards at full size is what previously made a tall grid (many rows, e.g.
// 9×4 on a narrow phone) render as overlapping tiles instead of a tidy,
// gapped grid. Because both axes shrink in lockstep now, there's no floor
// needed to protect against overlap — this always fits exactly.
function getGridScale(cols, cardW, cardH) {
  const rows = Math.ceil(CARD_COUNT / cols);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const colGap = cardW + 16;
  const rowGap = cardH + 18;
  // Cards are allowed to run almost edge-to-edge horizontally — only a
  // thin safety margin so the outermost column never visibly clips.
  const safeWidth = vw * 0.97;
  // On mobile this still has to clear the year label pinned near the top
  // of the screen and the CTA pinned near the bottom (~120px combined,
  // see .intro-copy's padding in global.css) — that space isn't free —
  // but otherwise fills as much of the remaining height as it can.
  const safeHeight = isMobileViewport() ? vh * 0.82 : vh * 0.94;
  const rawWidth = cols * colGap;
  const rawHeight = rows * rowGap;
  // Small floor purely so the brief "grid" beat never shrinks to an
  // illegibly tiny flash on extreme (very short/square) viewports — not a
  // guard against overlap, since card size and spacing now shrink together.
  return Math.max(0.4, Math.min(1, safeWidth / rawWidth, safeHeight / rawHeight));
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
// `dragEl`, if given, is the DOM element that becomes draggable once the
// ring settles — swiping/dragging it manually rotates the ring, which on
// mobile is how the hidden (off-screen) half of the ring gets pulled into
// view. Optional so callers that don't need dragging (there aren't any
// today, but keeps this function reusable) can omit it.
//
// Returns a controller object; call `.killOrbit()` to stop the idle
// rotation AND remove the drag listeners before anything else (e.g. the
// caller's own code) starts animating the same elements — most
// importantly right before the "wall opens" fly-away transition takes
// over.
export function playCardFormation({ entranceSelector, introTextEls, nameEl, dragEl, reduced }) {
  const controller = { killOrbit: () => {} };
  const radius = getRadius();
  const offset = getCenterOffset(radius);
  const { w: cardW, h: cardH } = getCardBox();
  const gridCols = pickGridColumns(cardW);
  const gridScale = getGridScale(gridCols, cardW, cardH);
  const mobile = isMobileViewport();

  if (reduced) {
    gsap.set(entranceSelector, {
      x: (i) => circlePoint(i, radius, 0, offset).x,
      y: (i) => circlePoint(i, radius, 0, offset).y,
      rotation: (i) => circlePoint(i, radius, 0, offset).rotation,
      opacity: 1,
      scale: 1,
    });
    gsap.set(introTextEls, { opacity: 1, y: 0 });
    if (nameEl) gsap.set(nameEl, { clipPath: 'none', opacity: 1, y: 0 });
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

  // Desktop: the name appears from behind a circular mask anchored at its
  // own bottom edge, similar in spirit to the "YOUR BEAUTY" reveal on
  // grigoriak.doctor. Mobile: a straight left-to-right wipe instead (a
  // circular mask reads poorly on the much narrower column "RPL C" sits
  // in there). No vertical rise on either — that's what previously made
  // the reveal feel like a long wait; the mask growing is motion enough
  // on its own.
  if (nameEl) {
    gsap.set(
      nameEl,
      mobile ? { clipPath: 'inset(0% 100% 0% 0%)', opacity: 1 } : { clipPath: 'circle(0% at 50% 100%)', opacity: 1 }
    );
  }

  const tl = gsap.timeline();

  tl.to(entranceSelector, {
    x: (i) => gridPoint(i, cardW, cardH, gridCols, gridScale).x,
    y: (i) => gridPoint(i, cardW, cardH, gridCols, gridScale).y,
    rotation: 0,
    opacity: 1,
    // Cards shrink together with the grid's spacing (both driven by the
    // same gridScale) — on a tall, narrow phone this is what keeps the
    // full 4×9 grid inside the screen with real gaps between cards
    // instead of full-size cards overlapping each other. Restored to 1
    // right below as the cards curl into the ring.
    scale: gridScale,
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
        x: (i) => circlePoint(i, radius, 0, offset).x,
        y: (i) => circlePoint(i, radius, 0, offset).y,
        rotation: (i) => circlePoint(i, radius, 0, offset).rotation,
        scale: 1,
        duration: 1.2,
        ease: 'power3.inOut',
        stagger: { each: 0.014, from: 'center' },
      },
      '>'
    )
    // Marks the moment the ring has actually finished arriving. Two
    // things key off this: the name reveal (right below) starts exactly
    // here rather than earlier — starting it while cards were still
    // mid-flight was what made even a fast reveal read as "covered by
    // the cards" — and the idle orbit (further below) also starts here,
    // rather than waiting for the name reveal to finish playing out, so
    // the cards begin drifting again right away instead of sitting still
    // through however long the reveal takes.
    .addLabel('settled')
    .to(introTextEls, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 'settled-=0.3')
    .call(() => startOrbit(entranceSelector, radius, controller, dragEl), [], 'settled+=0.05');

  // Quick — a mask that grows into place, not a slow crawl. Reads clearly
  // because it's the only thing moving at this point (cards have already
  // settled, per the 'settled' label above), so it doesn't need to be
  // slow to be noticed.
  if (nameEl) {
    tl.to(
      nameEl,
      mobile
        ? { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power2.out' }
        : { clipPath: 'circle(140% at 50% 100%)', duration: 2.0, ease: 'power2.out' },
      'settled+=0.05'
    );
  }

  // Last-resort safety net — if the tweens above never got to run for any
  // reason, the text must not stay invisible forever. 8s (not the previous
  // 4s) because the name's own slow-motion reveal alone now runs ~3s,
  // starting only after the ~3.5s formation sequence ahead of it — a
  // shorter timeout here would cut that reveal short mid-play.
  setTimeout(() => {
    gsap.set(introTextEls, { opacity: 1, y: 0 });
    if (nameEl) gsap.set(nameEl, { clipPath: 'none', opacity: 1, y: 0 });
  }, 8000);

  return controller;
}

// Continuous, very slow rotation once the ring has settled — cards
// translate along the circle AND spin with it, each staying pointed
// straight outward from the center (same fanned look as the initial
// formation), so the whole ring reads as one slowly turning wheel of
// cards rather than a set of upright cards sliding around a track.
//
// On top of that ambient rotation, `dragEl` (if given) becomes
// draggable/swipeable: a manual angular offset accumulates from
// pointer-drag distance and is added to every card's angle every frame,
// so dragging the ring actually spins it — this is how cards that are
// off-screen (see getCenterOffset(), mobile only) get pulled into view.
// A drag that moves more than a few pixels also suppresses the click that
// would otherwise follow on release, so swiping the ring never
// accidentally opens whatever card happened to be under the finger.
function startOrbit(entranceSelector, initialRadius, controller, dragEl) {
  const targets = gsap.utils.toArray(entranceSelector);
  const setX = targets.map((el) => gsap.quickSetter(el, 'x', 'px'));
  const setY = targets.map((el) => gsap.quickSetter(el, 'y', 'px'));
  const setRotation = targets.map((el) => gsap.quickSetter(el, 'rotation', 'deg'));
  const angularSpeed = TWO_PI / 150; // one full revolution every ~150s — slow and ambient
  const start = performance.now();
  let radius = initialRadius;
  let offset = getCenterOffset(radius);
  let manualOffset = 0; // radians, accumulated from dragging — persists across frames

  const onResize = () => {
    radius = getRadius();
    offset = getCenterOffset(radius);
  };
  window.addEventListener('resize', onResize);

  const tick = () => {
    const t = (performance.now() - start) / 1000;
    const spin = t * angularSpeed + manualOffset;
    for (let i = 0; i < targets.length; i++) {
      const p = circlePoint(i, radius, spin, offset);
      setX[i](p.x);
      setY[i](p.y);
      setRotation[i](p.rotation);
    }
  };

  gsap.ticker.add(tick);

  // --- Drag-to-rotate ---------------------------------------------------
  let cleanupDrag = () => {};
  if (dragEl) {
    let dragging = false;
    let moved = false;
    let pointerId = null;
    let startClientY = 0;
    let startOffsetAtDrag = 0;
    let suppressNextClick = false;

    const onPointerDown = (e) => {
      // Only the primary button/touch/pen contact starts a drag.
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      startClientY = e.clientY;
      startOffsetAtDrag = manualOffset;
      // Pointer capture is NOT taken here — see onPointerMove for why.
    };

    const onPointerMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dy = e.clientY - startClientY;
      if (!moved && Math.abs(dy) > 5) {
        moved = true;
        // Only take pointer capture once this has actually become a
        // drag (past the 5px threshold) — capturing unconditionally on
        // every pointerdown (the previous version) retargets ALL
        // subsequent pointer events, including the pointerup a plain tap
        // ends with, to dragEl instead of whichever card was actually
        // touched. That silently ate every tap's click, since the
        // browser then had nothing to fire it on — cards stopped opening
        // even though nothing else looked wrong. Capturing only once a
        // real drag is confirmed leaves plain taps completely untouched.
        dragEl.setPointerCapture?.(pointerId);
      }
      // Vertical drag distance converted to an angle via the ring's own
      // radius (arc length ≈ radius × angle) — matches the visible arc on
      // mobile, which curves top-to-bottom along the screen's right side,
      // so dragging up/down feels like directly spinning that curve.
      manualOffset = startOffsetAtDrag + dy / radius;
    };

    const endDrag = (e) => {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
      dragging = false;
      if (moved) {
        suppressNextClick = true;
        // Safety net: on many mobile browsers, a pointerup that follows
        // real movement never fires a click at all (there's nothing left
        // for onClickCapture below to intercept and clear the flag on).
        // Without this, suppressNextClick stayed stuck at true until
        // whatever the NEXT tap happened to be — which is what silently
        // ate the first tap on a card right after every drag, and only
        // the second tap (which found the flag already cleared) actually
        // opened it. Clearing it on the next tick either way — whether a
        // click showed up to consume it or not — means it can never
        // outlive the gesture that set it.
        setTimeout(() => {
          suppressNextClick = false;
        }, 0);
      }
      pointerId = null;
    };

    // Capture phase, so this runs before the click ever reaches a card's
    // own onClick handler (added by React in the bubble phase).
    const onClickCapture = (e) => {
      if (suppressNextClick) {
        e.stopPropagation();
        e.preventDefault();
        suppressNextClick = false;
      }
    };

    dragEl.style.touchAction = 'none';
    dragEl.style.cursor = 'grab';
    dragEl.addEventListener('pointerdown', onPointerDown);
    dragEl.addEventListener('pointermove', onPointerMove);
    dragEl.addEventListener('pointerup', endDrag);
    dragEl.addEventListener('pointercancel', endDrag);
    dragEl.addEventListener('click', onClickCapture, true);

    cleanupDrag = () => {
      dragEl.removeEventListener('pointerdown', onPointerDown);
      dragEl.removeEventListener('pointermove', onPointerMove);
      dragEl.removeEventListener('pointerup', endDrag);
      dragEl.removeEventListener('pointercancel', endDrag);
      dragEl.removeEventListener('click', onClickCapture, true);
    };
  }

  controller.killOrbit = () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', onResize);
    cleanupDrag();
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