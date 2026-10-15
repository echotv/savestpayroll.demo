/* ==========================================================================
   SAVEST-HRIS Demo Slides — App Engine
   Plain script (no modules, no deps) so the deck runs by double-clicking
   index.html — no server required. Builds the thumbnail rail and drives
   navigation + fullscreen Present mode with a genuinely responsive,
   zoomable canvas.

   Sizing itself is no longer JS's job: .stage and its content use CSS
   container query units (see css/style.css — .stage's `width: min(...)`
   formula and .slide's `--su`), so the whole canvas reacts live to window
   resizes, sidebar show/hide, and the zoom level below with zero JS
   recalculation needed.
   ========================================================================== */
(function () {
  'use strict';

  var track = document.getElementById('slideTrack');
  var slides = Array.prototype.slice.call(track.querySelectorAll('.slide'));
  var total = slides.length;
  var current = 0;

  var stage = document.getElementById('stage');
  var stageWrap = document.getElementById('stageWrap');
  var sidebar = document.getElementById('sidebar');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var dotsWrap = document.getElementById('stageDots');
  var counterEl = document.getElementById('topbarCounter');
  var presentBtn = document.getElementById('presentBtn');
  var printBtn = document.getElementById('printBtn');
  var exitHint = document.getElementById('presentExitHint');
  var zoomControls = document.getElementById('zoomControls');
  var zoomInBtn = document.getElementById('zoomInBtn');
  var zoomOutBtn = document.getElementById('zoomOutBtn');
  var zoomPct = document.getElementById('zoomPct');

  /* ---------------------------------------------------------------- */
  /* Build thumbnail rail — live clones of each slide, re-scaled only   */
  /* by virtue of .thumb-frame establishing its own (much smaller)      */
  /* container-query context; no transform math needed here at all.    */
  /* ---------------------------------------------------------------- */
  function buildThumbnails() {
    slides.forEach(function (slide, i) {
      var thumb = document.createElement('button');
      thumb.className = 'thumb';
      thumb.type = 'button';
      thumb.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      thumb.dataset.index = i;

      var idx = document.createElement('div');
      idx.className = 'thumb-index';
      idx.textContent = i + 1;

      var frame = document.createElement('div');
      frame.className = 'thumb-frame';

      var clone = slide.cloneNode(true);
      // Keep the original "slide" class (theme tokens, --su, base layout
      // all key off it) and layer the thumbnail-specific positioning on
      // top via the more specific ".thumb-frame .thumb-slide-clone" rule.
      clone.className += ' thumb-slide-clone';
      clone.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });

      frame.appendChild(clone);
      thumb.appendChild(idx);
      thumb.appendChild(frame);
      thumb.addEventListener('click', function () { goTo(i); });

      sidebar.appendChild(thumb);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Build progress dots                                               */
  /* ---------------------------------------------------------------- */
  function buildDots() {
    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Slide ' + (i + 1));
      b.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Manual zoom (presentation mode only) — a single CSS custom         */
  /* property feeds .stage's width formula directly, so the content's   */
  /* own container-query-based sizing reacts automatically. Resets to   */
  /* 100% every time Present mode is (re-)entered.                      */
  /* ---------------------------------------------------------------- */
  // .stage itself never resizes with zoom (see css/style.css) — zoom is
  // real browser `zoom` applied to the active .slide, so it behaves like
  // zooming a responsive webpage: width can never overflow, and taller
  // content just needs more (locally scrollable) height.
  var ZOOM_MIN = 0.7, ZOOM_MAX = 1.6, ZOOM_STEP = 0.1;
  var zoomLevel = 1;

  function updateZoomUI() {
    zoomPct.textContent = Math.round(zoomLevel * 100) + '%';
    zoomInBtn.disabled = zoomLevel >= ZOOM_MAX - 1e-9;
    zoomOutBtn.disabled = zoomLevel <= ZOOM_MIN + 1e-9;
  }
  function setZoom(z) {
    zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    updateZoomUI();
    stage.style.setProperty('--zoom', zoomLevel);
  }
  zoomInBtn.addEventListener('click', function () { setZoom(zoomLevel + ZOOM_STEP); });
  zoomOutBtn.addEventListener('click', function () { setZoom(zoomLevel - ZOOM_STEP); });

  /* ---------------------------------------------------------------- */
  /* Navigation                                                         */
  /* ---------------------------------------------------------------- */
  function render() {
    track.style.transform = 'translateX(-' + (current * 100) + '%)';
    counterEl.innerHTML = '<b>' + (current + 1) + '</b> / ' + total;

    var thumbs = sidebar.querySelectorAll('.thumb');
    thumbs.forEach(function (t, i) {
      t.classList.toggle('is-active', i === current);
      if (i === current) {
        t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    var dots = dotsWrap.querySelectorAll('button');
    dots.forEach(function (d, i) { d.classList.toggle('is-active', i === current); });

    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
  }

  function goTo(i) {
    current = Math.max(0, Math.min(total - 1, i));
    render();
  }
  function next() { if (current < total - 1) goTo(current + 1); }
  function prev() { if (current > 0) goTo(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  /* ---------------------------------------------------------------- */
  /* Keyboard controls                                                  */
  /* ---------------------------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    var presenting = document.body.classList.contains('is-presenting');
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(total - 1); }
    else if (e.key === 'f' || e.key === 'F') { togglePresent(); }
    else if (e.key === 'Escape' && document.fullscreenElement) { document.exitFullscreen(); }
    else if (presenting && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom(zoomLevel + ZOOM_STEP); }
    else if (presenting && (e.key === '-' || e.key === '_')) { e.preventDefault(); setZoom(zoomLevel - ZOOM_STEP); }
    else if (presenting && e.key === '0') { e.preventDefault(); setZoom(1); }
  });

  /* ---------------------------------------------------------------- */
  /* Click left/right thirds of the stage to navigate (presentation feel) */
  /* ---------------------------------------------------------------- */
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.stage-nav')) return;
    var rect = stage.getBoundingClientRect();
    var x = e.clientX - rect.left;
    if (x < rect.width * 0.5) prev(); else next();
  });

  /* ---------------------------------------------------------------- */
  /* Present mode (true browser fullscreen)                            */
  /* ---------------------------------------------------------------- */
  function togglePresent() {
    if (!document.fullscreenElement) {
      (stageWrap.requestFullscreen || stageWrap.webkitRequestFullscreen || function () {}).call(stageWrap);
    } else {
      document.exitFullscreen();
    }
  }
  presentBtn.addEventListener('click', togglePresent);

  document.addEventListener('fullscreenchange', function () {
    var presenting = !!document.fullscreenElement;
    document.body.classList.toggle('is-presenting', presenting);
    setZoom(1); // always re-enter at 100%
    if (presenting) showChrome();
  });

  /* ---------------------------------------------------------------- */
  /* Presentation chrome (exit hint, nav arrows, zoom controls) —       */
  /* hidden by default while presenting, revealed on mouse activity     */
  /* and auto-hidden again after a short idle period (video-player-     */
  /* style). Hovering the controls themselves pauses the hide timer so  */
  /* they don't vanish mid-click.                                       */
  /* ---------------------------------------------------------------- */
  var chromeEls = [exitHint, prevBtn, nextBtn, zoomControls];
  var hintTimer = null;
  var hoveringChrome = false;
  function showChrome() {
    chromeEls.forEach(function (el) { el.classList.add('is-visible'); });
    scheduleHide();
  }
  function scheduleHide() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      // the pointer bubbling a mousemove through a chrome element keeps
      // rescheduling this timer on every move, but not while it sits
      // still mid-hover — so the timer still needs to check, at the
      // moment it actually fires, whether the pointer is still resting
      // on one of these controls before hiding them out from under it.
      if (!hoveringChrome) hideChrome();
    }, 2600);
  }
  function hideChrome() {
    chromeEls.forEach(function (el) { el.classList.remove('is-visible'); });
  }
  stageWrap.addEventListener('mousemove', function () {
    if (document.body.classList.contains('is-presenting')) showChrome();
  });
  chromeEls.forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      hoveringChrome = true;
      if (document.body.classList.contains('is-presenting')) clearTimeout(hintTimer);
    });
    el.addEventListener('mouseleave', function () {
      hoveringChrome = false;
      if (document.body.classList.contains('is-presenting')) scheduleHide();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Print / export to PDF                                             */
  /* ---------------------------------------------------------------- */
  printBtn.addEventListener('click', function () { window.print(); });

  /* ---------------------------------------------------------------- */
  /* Boot                                                               */
  /* ---------------------------------------------------------------- */
  buildThumbnails();
  buildDots();
  render();
  updateZoomUI();
})();
