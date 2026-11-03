/*
 * Calm scroll: controlled, eased scrolling for the sample sites (Sir, 2026-10-31: "the scrolling is too fast and not
 * eased in or out ... some time goes too fast, it has to be really controlled").
 *  - In the story: one wheel move, one swipe or one arrow key = one stop, a slow ease-in-out glide. Nothing is ever
 *    skipped: a fast flick or a long trackpad swipe is still one stop; a new move during a glide waits for it to end.
 *  - The rest of the page: the wheel glides smoothly (eased) instead of jumping; phones keep their own touch scrolling.
 *  - Menu links glide the same way (CalmScroll.to).
 *  - Reduced motion: nothing changes, the browser scrolls as usual.
 * A page with a story says where its stops are:
 *   CalmScroll.story(function () { return [y0, y1, ..., yEnd]; });
 * absolute page positions, read fresh on every move (so resizes are fine); the last one is where the story hands over
 * to the rest of the page. No libraries. Master copy: tools\calm-scroll.js - copy it as it is into each site's
 * assets\js\ and load it before main.js.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stopsOf = null;

  var QUIET_MS = 220;      // a wheel move counts as new after this much quiet (a trackpad's long tail is one move)
  var SWIPE_PX = 45;       // a swipe this long moves one stop (a short fast flick does too)
  var WHEEL_EASE = 0.09;   // below the story: share of the way left that the page moves each frame
  var GAP = 2;             // px: "at" a stop

  function maxY() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  function clampY(y) { return Math.max(0, Math.min(maxY(), y)); }
  var lastSet = null;
  function setY(y) {
    lastSet = y;
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }   // in and out
  function glideMs(px) { var d = px / window.innerHeight; return Math.min(1700, Math.max(650, 600 + 450 * d)); }

  function stops() {
    var s = stopsOf ? stopsOf() : null;
    return s && s.length ? s.map(clampY).sort(function (a, b) { return a - b; }) : null;
  }
  // Step by step inside the story; at its end only a move back steps in again.
  function inStory(s, y, dir) {
    var end = s[s.length - 1];
    return y < end - GAP || (dir < 0 && y <= end + GAP);
  }
  function nextStop(s, y, dir) {
    var i;
    if (dir > 0) { for (i = 0; i < s.length; i++) if (s[i] > y + GAP) return s[i]; return s[s.length - 1]; }
    for (i = s.length - 1; i >= 0; i--) if (s[i] < y - GAP) return s[i];
    return 0;
  }

  /* ---------------------------------------------------------------- the glide */
  var anim = null;
  var queued = 0;
  function glide(to, ms) {
    stopWheel();
    to = clampY(to);
    var from = window.scrollY;
    if (Math.abs(to - from) < 1) { anim = null; return; }
    var a = anim = { from: from, to: to, start: performance.now(), ms: ms || glideMs(Math.abs(to - from)) };
    lastSet = from;
    function frame(now) {
      if (anim !== a) return;
      if (lastSet !== null && Math.abs(window.scrollY - lastSet) > 3) { anim = null; queued = 0; return; }   // the scrollbar took over
      var p = Math.min(1, (now - a.start) / a.ms);
      setY(a.from + (a.to - a.from) * ease(p));
      if (p < 1) { window.requestAnimationFrame(frame); return; }
      anim = null;
      if (queued) { var d = queued; queued = 0; step(d); }
    }
    window.requestAnimationFrame(frame);
  }
  // One stop on; while a glide runs, one more is kept for when it ends (never a burst).
  function step(dir) {
    var s = stops();
    if (!s) return false;
    var y = anim ? anim.to : window.scrollY;
    if (!inStory(s, y, dir)) return false;
    if (anim) { queued = dir; return true; }
    glide(nextStop(s, y, dir));
    return true;
  }

  /* ---------------------------------------------------------------- below the story: a smooth wheel */
  var wheelTo = null, wheelAt = 0, wheelRaf = 0, wheelLast = 0;
  function stopWheel() { wheelTo = null; if (wheelRaf) window.cancelAnimationFrame(wheelRaf); wheelRaf = 0; }
  function wheelFrame(now) {
    wheelRaf = 0;
    if (wheelTo === null) return;
    if (lastSet !== null && Math.abs(window.scrollY - lastSet) > 3) { wheelTo = null; return; }   // the scrollbar took over
    var dt = Math.min(64, now - (wheelLast || now - 16.7));
    wheelLast = now;
    var k = 1 - Math.pow(1 - WHEEL_EASE, dt / 16.7);
    wheelTo = clampY(wheelTo);
    wheelAt += (wheelTo - wheelAt) * k;
    if (Math.abs(wheelTo - wheelAt) < 0.5) { setY(wheelTo); wheelTo = null; return; }
    setY(wheelAt);
    wheelRaf = window.requestAnimationFrame(wheelFrame);
  }

  /* ---------------------------------------------------------------- input */
  // The move is for a box that scrolls by itself (a sheet, a list): leave it alone.
  function ownScroll(el) {
    for (; el && el.nodeType === 1 && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      var o = window.getComputedStyle(el).overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  }
  // A sheet or lightbox is open and the page itself doesn't scroll.
  function locked() {
    return window.getComputedStyle(document.body).overflowY === 'hidden' || window.getComputedStyle(document.documentElement).overflowY === 'hidden';
  }

  var lastWheel = 0;
  function onWheel(e) {
    if (e.ctrlKey || e.defaultPrevented) return;   // a trackpad pinch is zoom
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    if (Math.abs(dy) < 1 || Math.abs(dy) < Math.abs(e.deltaX)) return;
    if (locked() || ownScroll(e.target)) return;
    var now = performance.now();
    var fresh = now - lastWheel > QUIET_MS;
    lastWheel = now;
    var dir = dy > 0 ? 1 : -1;
    var s = stops();
    var y = anim ? anim.to : wheelTo !== null ? wheelTo : window.scrollY;
    e.preventDefault();
    if (s && inStory(s, y, dir)) {
      if (fresh) step(dir);
      return;
    }
    if (anim) return;
    var to = clampY(y + dy);
    if (s && dir < 0 && to < s[s.length - 1]) to = s[s.length - 1];   // stop where the story hands over; the next move steps in
    if (wheelTo === null) { wheelAt = window.scrollY; wheelLast = 0; lastSet = wheelAt; }
    wheelTo = to;
    if (!wheelRaf) wheelRaf = window.requestAnimationFrame(wheelFrame);
  }

  var touch = null;
  function onTouchStart(e) {
    touch = null;
    if (e.touches.length !== 1 || locked() || ownScroll(e.target)) return;
    var s = stops();
    if (!s) return;
    var y = anim ? anim.to : window.scrollY;
    var end = s[s.length - 1];
    if (y > end + GAP) return;   // below the story: the phone's own scrolling
    var p = e.touches[0];
    touch = { x0: p.clientX, y0: p.clientY, last: p.clientY, lastAt: performance.now(), v: 0, from: y, s: s, edge: y >= end - GAP, decided: false };
  }
  function onTouchMove(e) {
    if (!touch) return;
    var p = e.touches[0];
    var dy = touch.y0 - p.clientY;   // > 0: the finger goes up = forward
    if (!touch.decided) {
      var dx = touch.x0 - p.clientX;
      if (!dx && !dy) return;
      touch.decided = true;
      if (Math.abs(dx) > Math.abs(dy)) { touch = null; return; }   // a sideways swipe (photos, cards)
      if (touch.edge && dy > 0) { touch = null; return; }          // at the end, going on: the phone scrolls the page
    }
    if (e.cancelable) e.preventDefault();
    var now = performance.now();
    touch.v = (touch.last - p.clientY) / Math.max(1, now - touch.lastAt);
    touch.last = p.clientY;
    touch.lastAt = now;
    if (anim) return;   // a glide is on its way; the finger only asks for the next one
    var lo = nextStop(touch.s, touch.from, -1), hi = nextStop(touch.s, touch.from, 1);
    setY(Math.max(lo, Math.min(hi, touch.from + dy)));   // follows the finger, never past the next stop
  }
  function onTouchEnd() {
    if (!touch || !touch.decided) { touch = null; return; }
    var t = touch;
    touch = null;
    var moved = t.y0 - t.last;
    var dir = Math.abs(moved) > SWIPE_PX || (Math.abs(t.v) > 0.35 && Math.abs(moved) > 12) ? (moved > 0 ? 1 : -1) : 0;
    if (anim) { if (dir) queued = dir; return; }
    if (!dir) { glide(t.from, 420); return; }   // too small a move: back to where it was
    glide(nextStop(t.s, t.from, dir));
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || locked()) return;
    var el = e.target;
    var tag = el && el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (el && el.isContentEditable)) return;
    var k = e.key;
    if (k === ' ' && (tag === 'button' || tag === 'a')) return;
    var dir = k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey) ? 1 : k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey) ? -1 : 0;
    if (!dir) return;
    if (e.repeat && anim) { e.preventDefault(); return; }
    if (step(dir)) e.preventDefault();
  }

  window.CalmScroll = {
    /** fn() -> absolute page positions of the story's stops, the last one where the story ends. */
    story: function (fn) { stopsOf = fn; },
    /** The stops now (for checks). */
    stops: function () { return stops(); },
    /** A link's jump: the same slow glide (the browser's own jump with reduced motion). */
    to: function (y) {
      if (reduce) { window.scrollTo({ top: y, behavior: 'auto' }); return; }
      queued = 0;
      glide(y);
    }
  };

  if (reduce) return;
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  document.addEventListener('keydown', onKey);
})();
