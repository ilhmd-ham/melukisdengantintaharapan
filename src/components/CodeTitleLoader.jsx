import { useEffect, useRef, useState } from 'react';
import { playCodeLoaderSequence } from '../animations/codeLoaderAnimations.js';

// `active` flips true the instant the intro's wall-open transition has
// collapsed it out of the way (see App.jsx / handleEnterMural) — that's
// the first moment this section is actually the thing on screen, so the
// typing sequence only ever starts then, never while the intro is still
// showing. `onComplete` is how this tells App.jsx it's safe to unlock
// scrolling — see the scroll-lock comment in App.jsx for why that gate
// exists at all.
//
// No window/card chrome here on purpose — just the code and console text
// sitting directly on the page's own background, centered on screen, per
// "tidak usah memakai garis card terminal, tanpa loader, jadi buat emang
// ditengahnya saja".
//
// There is no small printed "output" line anymore — once the run
// finishes (checkmark shown), this curtain fades straight away and the
// page's own full-size hero title (already playing underneath, see
// handleLoaderComplete in MuralSection.jsx) is what shows the title —
// per "outputnya disitu hapus saja, ... outputnya kan tertampil judul
// besar".
export default function CodeTitleLoader({ active, titleText, classText, onComplete, onRunSucceeded }) {
  const rootRef = useRef(null);
  const zoomRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const line3Ref = useRef(null);
  const line5Ref = useRef(null);
  const line6Ref = useRef(null);
  const consoleRef = useRef(null);
  const statusRef = useRef(null);
  const checkRef = useRef(null);
  const controllerRef = useRef(null);
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  // Once the fade-out finishes, this unmounts the loader entirely
  // (rather than just leaving it sitting at opacity: 0). A full-screen,
  // position:fixed, z-index:150 element left in the DOM at opacity 0
  // still sits on top of everything and still captures clicks — that
  // was the cause of the reported bug where buttons on the page below
  // (e.g. the language-translate toggle) stopped being clickable after
  // this had already finished playing.
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!active || startedRef.current) return undefined;
    startedRef.current = true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    controllerRef.current = playCodeLoaderSequence({
      els: {
        rootEl: rootRef.current,
        zoomEl: zoomRef.current,
        line1El: line1Ref.current,
        line2El: line2Ref.current,
        line3El: line3Ref.current,
        line5El: line5Ref.current,
        line6El: line6Ref.current,
        consoleEl: consoleRef.current,
        statusEl: statusRef.current,
        checkEl: checkRef.current,
      },
      titleText,
      classText,
      reduced,
      onRunSucceeded,
      onComplete: () => {
        doneRef.current = true;
        onComplete?.();
        setFinished(true);
      },
    });

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || finished) return null;

  return (
    <div className="code-loader" ref={rootRef}>
      {/* One static announcement rather than aria-live on the typing
          animation itself — the latter would fire on every character and
          spam assistive tech. The visible title is announced properly a
          moment later anyway, once the curtain lifts and the real
          .mural-hero-title (a plain heading) takes over. */}
      <p className="visually-hidden">
        Memuat judul mural: {titleText}, {classText}
      </p>

      <div className="code-loader-content" aria-hidden="true">
        {/* Wraps just the code lines — scaled/panned as the title and
            class lines type (see addZoomTypingTween in
            codeLoaderAnimations.js) so the screen zooms in on and
            tracks whatever's currently being typed, then eases back out
            to scale 1 once each of those two lines is done. */}
        <div className="code-loader-zoom" ref={zoomRef}>
          <pre className="code-loader-code">
            <code>
              <span className="cl-line" ref={line1Ref} />
              <span className="cl-line" ref={line2Ref} />
              <span className="cl-line" ref={line3Ref} />
              <span className="cl-line" aria-hidden="true">
                &nbsp;
              </span>
              <span className="cl-line" ref={line5Ref} />
              <span className="cl-line" ref={line6Ref} />
            </code>
          </pre>
        </div>

        <div className="code-loader-console" ref={consoleRef}>
          <div className="code-loader-console-prompt">
            <span className="cl-prompt-sym">$</span> python judul.py
          </div>
          <div className="code-loader-console-status" ref={statusRef}>
            <span className="code-loader-spinner" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Menjalankan…</span>
            <span className="code-loader-check" ref={checkRef} aria-hidden="true">
              ✓
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
