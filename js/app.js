/* ==========================================================================
   SAVEST-HRIS Demo Slides — App Engine
   Plain script (no modules, no deps) so the deck runs by double-clicking
   index.html — no server required. Builds the thumbnail rail, scales the
   canvas to fit the window, and drives navigation + fullscreen Present mode
   (with manual zoom controls while presenting).
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
  var zoomInBtn = document.getElementById('zoomInBtn');
  var zoomOutBtn = document.getElementById('zoomOutBtn');
  var zoomPct = document.getElementById('zoomPct');

  var SLIDE_W = 1280;
  var SLIDE_H = 720;

  /* ---------------------------------------------------------------- */
  /* Build thumbnail rail — live scaled clones of each slide           */
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
      clone.className = 'thumb-slide-clone';
      clone.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });

      var scale = 164 / SLIDE_W; // matches .thumb-frame width in CSS
      clone.style.transform = 'scale(' + scale + ')';

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
  /* Manual zoom (presentation mode only — resets to fit-to-screen      */
  /* every time Present mode is entered)                                */
  /* ---------------------------------------------------------------- */
  var ZOOM_MIN = 0.5, ZOOM_MAX = 2, ZOOM_STEP = 0.1;
  var zoomLevel = 1;

  function updateZoomUI() {
    zoomPct.textContent = Math.round(zoomLevel * 100) + '%';
    zoomInBtn.disabled = zoomLevel >= ZOOM_MAX - 1e-9;
    zoomOutBtn.disabled = zoomLevel <= ZOOM_MIN + 1e-9;
  }
  function setZoom(z) {
    zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    updateZoomUI();
    fitStage();
  }
  zoomInBtn.addEventListener('click', function () { setZoom(zoomLevel + ZOOM_STEP); });
  zoomOutBtn.addEventListener('click', function () { setZoom(zoomLevel - ZOOM_STEP); });

  /* ---------------------------------------------------------------- */
  /* Scale the fixed-resolution stage to fit the available space       */
  /* ---------------------------------------------------------------- */
  function fitStage() {
    var presenting = document.body.classList.contains('is-presenting');
    var padding = presenting ? 0 : (stageWrap.clientWidth < 700 ? 16 : 48);
    var availW = stageWrap.clientWidth - padding * 2;
    var availH = stageWrap.clientHeight - padding * 2;
    var scale = Math.min(availW / SLIDE_W, availH / SLIDE_H) * (presenting ? zoomLevel : 1);
    stage.style.transform = 'scale(' + scale + ')';
  }

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
    zoomLevel = 1; // always re-enter at fit-to-screen
    updateZoomUI();
    fitStage();
    if (presenting) flashExitHint();
  });

  var hintTimer = null;
  function flashExitHint() {
    exitHint.classList.add('is-visible');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { exitHint.classList.remove('is-visible'); }, 2600);
  }
  stageWrap.addEventListener('mousemove', function () {
    if (document.body.classList.contains('is-presenting')) flashExitHint();
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
  fitStage();
  window.addEventListener('resize', fitStage);
})();
