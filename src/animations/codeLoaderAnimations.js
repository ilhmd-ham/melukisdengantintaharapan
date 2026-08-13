import gsap from 'gsap';

// Minimal HTML escaping — the strings typed here are all fixed copy (not
// user input), but this keeps the innerHTML rebuild in renderTyped safe
// regardless.
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Rebuilds an element's innerHTML to show exactly `count` characters of a
// line made of multiple syntax-highlighted segments ({ t: text, c: css
// class }), each wrapped in its own <span>. Called on every tick of the
// typing tween below, so a real terminal-style "typewriter" reveal comes
// out of ordinary text content rather than an animated clip-path/width —
// simpler to keep in sync with a caret and with reduced-motion/skip.
function renderTyped(el, segments, count) {
  let remaining = count;
  let html = '';
  for (const seg of segments) {
    if (remaining <= 0) break;
    const take = Math.min(seg.t.length, remaining);
    html += `<span class="${seg.c}">${escapeHtml(seg.t.slice(0, take))}</span>`;
    remaining -= take;
  }
  el.innerHTML = html;
}

function totalChars(segments) {
  return segments.reduce((sum, seg) => sum + seg.t.length, 0);
}

// Adds one "typing" tween for a single line to the timeline. `charMs` is
// the average per-character delay; ease 'none' keeps it a constant typing
// speed rather than easing in/out, which is what actually reads as typed
// text rather than an animated reveal. A blinking caret is appended after
// the visible text on every frame while still typing, and cleanly dropped
// the instant the line finishes (its own onComplete re-renders without it).
function addTypingTween(tl, el, segments, charMs, position) {
  const total = totalChars(segments);
  if (total === 0 || !el) return;
  const proxy = { v: 0 };
  tl.to(
    proxy,
    {
      v: total,
      duration: (total * charMs) / 1000,
      ease: 'none',
      onUpdate: () => {
        const shown = Math.round(proxy.v);
        renderTyped(el, segments, shown);
        if (shown < total) {
          el.insertAdjacentHTML('beforeend', '<span class="cl-caret">▍</span>');
        }
      },
      onComplete: () => renderTyped(el, segments, total),
    },
    position
  );
}

// Measures the pixel width of one monospace character in the code
// block's actual font/size, via Canvas text metrics (no DOM layout
// involved, so this is cheap and doesn't force a reflow). Because the
// font is monospace, every character is exactly this wide, which is
// what makes the caret-tracking below able to compute the caret's
// position with plain arithmetic (origin + charsTyped * charWidth)
// instead of re-measuring the real DOM on every single animation frame.
function measureMonoCharWidth(referenceEl) {
  if (!referenceEl) return 0;
  const cs = window.getComputedStyle(referenceEl);
  const canvas = measureMonoCharWidth._canvas || (measureMonoCharWidth._canvas = document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return ctx.measureText('0').width;
}

// Gets a line's start-X / vertical-center-Y relative to zoomEl's own box
// (NOT el's offsetParent, which is .code-loader itself since that's
// position: fixed) — both elements need to still be unscaled when this
// is called (scale is reset to 1 right before the timeline is built),
// so a plain rect subtraction gives the right in-box pixel offset that
// transform-origin can then use directly.
function lineOrigin(zoomEl, el) {
  const zoomRect = zoomEl ? zoomEl.getBoundingClientRect() : null;
  const lineRect = el.getBoundingClientRect();
  return {
    x: zoomRect ? lineRect.left - zoomRect.left : 0,
    y: zoomRect ? lineRect.top - zoomRect.top + lineRect.height / 2 : 0,
  };
}

// Applies scale + a translate to zoomEl (transform-origin pinned at its
// own top-left, 0 0, always) such that the "anchor" point (anchorX,
// anchorY — the caret/line position in zoomEl's own unscaled coordinate
// space) lands at centerX once fully zoomed in, instead of staying put
// at its natural (often left-leaning) screen position the way a plain
// transform-origin scale would. `maxScale` is the sequence's peak zoom
// (ZOOM_SCALE below) — the pull toward centerX is scaled by how zoomed
// in we currently are (0 at scale 1, full at maxScale), so the camera
// starts drifting toward center as it zooms in and eases back out
// again as it zooms out, rather than snapping. Vertical position is
// left alone (the anchor's own Y — no recentering there), only the
// horizontal "too far left" drift this fixes.
function setZoomTransform(zoomEl, { scale, anchorX, anchorY, centerX, maxScale }) {
  const zoomFactor = maxScale > 1 ? Math.min(1, Math.max(0, (scale - 1) / (maxScale - 1))) : 1;
  const targetX = anchorX + (centerX - anchorX) * zoomFactor;
  gsap.set(zoomEl, {
    x: targetX - scale * anchorX,
    y: anchorY - scale * anchorY,
    scale,
    transformOrigin: '0 0',
  });
}

// A pure scale ramp on zoomEl, anchored at (x, y) and pulled toward
// centerX as it zooms in — used for the single zoom-in at the very
// start of the title line and the single zoom-out at the very end of
// the class line, so there's exactly one zoom-in and one zoom-out for
// the whole two-line sequence rather than one pair per line.
function addScaleRampTween(tl, { zoomEl, from, to, x, y, centerX, maxScale, duration, ease, position }) {
  if (!zoomEl) return;
  const proxy = { v: from };
  const easeFn = gsap.parseEase(ease);
  tl.to(
    proxy,
    {
      v: to,
      duration,
      ease: 'none',
      onUpdate: () => {
        const t = duration > 0 ? Math.min(1, Math.max(0, (proxy.v - from) / (to - from))) : 1;
        const scale = gsap.utils.interpolate(from, to, easeFn(t));
        setZoomTransform(zoomEl, { scale, anchorX: x, anchorY: y, centerX, maxScale });
      },
    },
    position
  );
}

// Types one line while the camera (already at its held zoom level, set
// by addScaleRampTween/addPanTween around this) tracks the caret across
// it — transform-origin walks from the line's start to its end in
// lockstep with shown/total, same tracking idea as before, just with no
// scale change of its own now (scale is owned by the ramp/pan tweens
// that bracket this).
//
// The caret's X is computed as `origin.x + proxy.v * charWidth` — plain
// arithmetic against the tween's own (continuous, sub-character)
// progress value, not the rounded character count and not a live DOM
// measurement. Two things this fixes:
//   1. "Patah-patah" (choppy) camera motion: the old version read the
//      caret's real screen position back off the DOM every frame via
//      getBoundingClientRect(), which forces a synchronous layout
//      reflow on top of the innerHTML rebuild already happening that
//      frame — expensive enough to drop frames. Plain arithmetic on a
//      smoothly-tweened proxy is instant and moves continuously between
//      characters instead of stepping.
//   2. The "jumps left" snap right after a line finishes: that origin.x
//      + total*charWidth endpoint is the exact same formula the
//      following pan/ramp tween's start point is built from (see
//      titleEnd/classEnd below), so there's no gap between "where the
//      camera ends up" and "where the next tween starts" the way there
//      was when one side came from a live measurement and the other
//      from a separately pre-measured (and occasionally stale/wrapped)
//      estimate.
function addTrackedTypingTween(tl, { el, segments, charMs, position, zoomEl, scale, origin, charWidth, centerX, maxScale }) {
  const total = totalChars(segments);
  if (total === 0 || !el) return;
  const proxy = { v: 0 };
  tl.to(
    proxy,
    {
      v: total,
      duration: (total * charMs) / 1000,
      ease: 'none',
      onUpdate: () => {
        const shown = Math.round(proxy.v);
        renderTyped(el, segments, shown);
        if (shown < total) {
          el.insertAdjacentHTML('beforeend', '<span class="cl-caret">▍</span>');
        }
        if (zoomEl) {
          setZoomTransform(zoomEl, {
            scale,
            anchorX: origin.x + proxy.v * charWidth,
            anchorY: origin.y,
            centerX,
            maxScale,
          });
        }
      },
      onComplete: () => renderTyped(el, segments, total),
    },
    position
  );
}

// Smoothly slides the still-zoomed-in camera from wherever the title
// line ended to where the class line starts — this is what replaces the
// old "zoom out after title, zoom back in for class" pair, so the two
// lines read as one continuous zoomed-in pass rather than two separate
// zoom cycles ("pas selesai ngetik isian variabel judul, tidak usah di
// zoom out, lanjutkan untuk mengetik kelasnya saja baru selesai di zoom
// out").
function addPanTween(tl, { zoomEl, scale, from, to, duration, ease, position, centerX, maxScale }) {
  if (!zoomEl) return;
  const proxy = { v: 0 };
  const easeFn = gsap.parseEase(ease);
  tl.to(
    proxy,
    {
      v: 1,
      duration,
      ease: 'none',
      onUpdate: () => {
        const eased = easeFn(proxy.v);
        setZoomTransform(zoomEl, {
          scale,
          anchorX: gsap.utils.interpolate(from.x, to.x, eased),
          anchorY: gsap.utils.interpolate(from.y, to.y, eased),
          centerX,
          maxScale,
        });
      },
    },
    position
  );
}

// Builds and plays the full loader sequence, then calls onComplete once the
// overlay has faded out. Returns { skip } so the caller can offer a "skip"
// button — skip just jumps the same timeline to progress 1, which GSAP
// resolves through every tween's final onUpdate/onComplete (so all text
// ends up fully typed, not abruptly hidden) and still fires onComplete.
export function playCodeLoaderSequence({ els, titleText, classText, reduced, onComplete, onRunSucceeded }) {
  const { rootEl, zoomEl, line1El, line2El, line3El, line5El, line6El, consoleEl, statusEl, checkEl } = els;

  const commentSegs = [{ t: '# memuat judul mural...', c: 'cl-comment' }];
  const titleAssignSegs = [
    { t: 'title', c: 'cl-var' },
    { t: ' = ', c: 'cl-op' },
    { t: `"${titleText}"`, c: 'cl-str' },
  ];
  const classAssignSegs = [
    { t: 'class', c: 'cl-var' },
    { t: ' = ', c: 'cl-op' },
    { t: `"${classText}"`, c: 'cl-str' },
  ];
  const printTitleSegs = [
    { t: 'print', c: 'cl-fn' },
    { t: '(', c: 'cl-op' },
    { t: 'title', c: 'cl-var' },
    { t: ')', c: 'cl-op' },
  ];
  const printClassSegs = [
    { t: 'print', c: 'cl-fn' },
    { t: '(', c: 'cl-op' },
    { t: 'class', c: 'cl-var' },
    { t: ')', c: 'cl-op' },
  ];

  if (reduced) {
    // No motion: render every line in its final state immediately, hold
    // just long enough to be legible, then hand off — mirrors how the
    // rest of the app collapses its animations under reduced-motion. No
    // printed "output" lines here either — the run just resolves to a
    // checkmark, then the curtain clears straight onto the page's own
    // full-size title.
    renderTyped(line1El, commentSegs, totalChars(commentSegs));
    renderTyped(line2El, titleAssignSegs, totalChars(titleAssignSegs));
    renderTyped(line3El, classAssignSegs, totalChars(classAssignSegs));
    renderTyped(line5El, printTitleSegs, totalChars(printTitleSegs));
    renderTyped(line6El, printClassSegs, totalChars(printClassSegs));
    if (zoomEl) gsap.set(zoomEl, { scale: 1, x: 0, y: 0 });
    gsap.set(consoleEl, { opacity: 1, y: 0 });
    gsap.set(statusEl, { opacity: 0 });
    if (checkEl) gsap.set(checkEl, { opacity: 1, scale: 1 });
    onRunSucceeded?.();
    const t = gsap.timeline({ onComplete });
    t.to(rootEl, { opacity: 0, duration: 0.5, delay: 0.5, ease: 'power1.inOut' });
    return { skip: () => t.progress(1) };
  }

  if (zoomEl) gsap.set(zoomEl, { scale: 1, x: 0, y: 0, transformOrigin: '0 0' });

  const tl = gsap.timeline({ onComplete });

  // 1. Type the code lines (the blank line between the assignments and
  //    the print() calls is static — nothing to type). The title and
  //    class assignments are the two lines "layar ngezoom pada ketikan
  //    ... dan mengikuti teks yang sedang diketik" was asked for, so
  //    those two go through the zoom-in/track/pan/track/zoom-out
  //    sequence below instead of plain typing — everything else just
  //    types normally.
  addTypingTween(tl, line1El, commentSegs, 26, 0.15);

  // Title + class: one continuous zoomed-in pass across both lines —
  // zoom in once before "title" starts, hold+track through "title",
  // pan across to "class" while staying zoomed (no zoom-out/back-in in
  // between), hold+track through "class", then zoom out once at the
  // very end. 58ms/char (vs 34 for everything else) keeps the actual
  // typed values legible now that the zoom is drawing extra attention
  // to them.
  const ZOOM_SCALE = 1.9;
  const titleTotal = totalChars(titleAssignSegs);
  const classTotal = totalChars(classAssignSegs);
  if (zoomEl && line2El && line3El && titleTotal > 0 && classTotal > 0) {
    // One monospace char-width measurement stands in for per-frame DOM
    // measurement of every line — see measureMonoCharWidth above for why
    // that's both faster (no forced layout every tick — fixes the
    // choppy/"patah-patah" motion) and exact (no gap between where a
    // line's typing tween ends and where the following pan/ramp tween
    // starts — fixes the snap-back-left jump between lines).
    const charWidth = measureMonoCharWidth(line2El);
    const titleOrigin = lineOrigin(zoomEl, line2El);
    const classOrigin = lineOrigin(zoomEl, line3El);
    const titleEnd = { x: titleOrigin.x + titleTotal * charWidth, y: titleOrigin.y };
    const classEnd = { x: classOrigin.x + classTotal * charWidth, y: classOrigin.y };
    // Horizontal target the caret gets pulled toward as it zooms in —
    // the actual horizontal center of the viewport (rootEl is the
    // fixed, inset:0 curtain, so its rect IS the viewport), converted
    // into zoomEl's own local coordinate space. Using zoomEl's own box
    // width here previously wasn't reliable — it still left the caret
    // well off the true screen center, cropping the start of the line
    // off the left edge. Anchoring to the viewport directly fixes that
    // regardless of how the code block itself is sized/positioned.
    const zoomRectNow = zoomEl.getBoundingClientRect();
    const rootRect = rootEl ? rootEl.getBoundingClientRect() : zoomRectNow;
    const centerX = rootRect.left + rootRect.width / 2 - zoomRectNow.left;

    addScaleRampTween(tl, {
      zoomEl,
      from: 1,
      to: ZOOM_SCALE,
      x: titleOrigin.x,
      y: titleOrigin.y,
      centerX,
      maxScale: ZOOM_SCALE,
      duration: 0.45,
      ease: 'sine.out',
      position: '+=0.25',
    });
    addTrackedTypingTween(tl, {
      el: line2El,
      segments: titleAssignSegs,
      charMs: 58,
      zoomEl,
      scale: ZOOM_SCALE,
      origin: titleOrigin,
      charWidth,
      centerX,
      maxScale: ZOOM_SCALE,
    });
    addPanTween(tl, {
      zoomEl,
      scale: ZOOM_SCALE,
      from: titleEnd,
      to: classOrigin,
      duration: 0.5,
      ease: 'sine.inOut',
      position: '+=0.2',
      centerX,
      maxScale: ZOOM_SCALE,
    });
    addTrackedTypingTween(tl, {
      el: line3El,
      segments: classAssignSegs,
      charMs: 58,
      zoomEl,
      scale: ZOOM_SCALE,
      origin: classOrigin,
      charWidth,
      centerX,
      maxScale: ZOOM_SCALE,
    });
    addScaleRampTween(tl, {
      zoomEl,
      from: ZOOM_SCALE,
      to: 1,
      x: classEnd.x,
      y: classEnd.y,
      centerX,
      maxScale: ZOOM_SCALE,
      duration: 0.45,
      ease: 'sine.in',
      position: '+=0.15',
    });
  } else {
    // No zoom container available (shouldn't normally happen) — fall
    // back to plain typing so the lines still appear.
    addTypingTween(tl, line2El, titleAssignSegs, 58, '+=0.25');
    addTypingTween(tl, line3El, classAssignSegs, 58, '+=0.2');
  }

  addTypingTween(tl, line5El, printTitleSegs, 34, '+=0.4');
  addTypingTween(tl, line6El, printClassSegs, 34, '+=0.2');

  // 2. Console panel (the "$ python judul.py" prompt + run status) fades
  //    in below the code once typing is done.
  tl.to(consoleEl, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '+=0.35');

  // 3. "Running" status with its spinner (the spinner itself is a plain
  //    CSS animation — no need to drive it from JS) — held briefly to
  //    sell the idea that something is being loaded/computed, exactly
  //    the "loading, so it doesn't feel heavy" framing this is modelled
  //    on, then swapped for a checkmark.
  tl.to(statusEl, { opacity: 1, duration: 0.3 }, '+=0.1');
  tl.to({}, { duration: 0.85 }); // hold — the run "happens" here
  tl.to(statusEl, { opacity: 0, duration: 0.2 });
  if (checkEl) {
    tl.fromTo(checkEl, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' }, '<');
  }
  // The instant the checkmark pops is also "the program succeeded" —
  // that's the cue the persistent top-left terminal line (rendered
  // outside this whole curtain, in MuralSection, so it survives after
  // this curtain fades away and unmounts) waits for. See
  // handleRunSucceeded in MuralSection.jsx.
  if (onRunSucceeded) tl.call(onRunSucceeded, null, '<');

  // 4. No printed "output" lines anymore — the run itself resolving to a
  //    checkmark IS the payoff now. Hold just long enough for the
  //    checkmark to register, then the whole overlay releases — a
  //    gentle fade — revealing the real page underneath, where the
  //    mural's own full-size hero title is what actually displays the
  //    title. That hero-title reveal is deliberately NOT played while
  //    this curtain is up (see setupMuralScroll's playHeroTitle in
  //    muralAnimations.js) — the caller triggers that explicitly once
  //    this onComplete fires, so the title visibly rises up right as
  //    this curtain clears rather than already sitting there.
  tl.to({}, { duration: 0.6 });
  tl.to(rootEl, { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, '+=0.1');

  return { skip: () => tl.progress(1) };
}
