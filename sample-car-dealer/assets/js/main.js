/* THE GATE: the roll-up gate, the turntable story, the money dock and the request sheets. No libraries. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var phoneMq = window.matchMedia('(max-width: 860px)');
  var OUT = 'cubic-bezier(.2,.7,.2,1)';
  var INOUT = 'cubic-bezier(.65,0,.35,1)';
  var CARS = {
    defender: { name: 'Defender', full: '2021 Land Rover Defender 110 SE', meta: '$61,900 · 31,400 mi', img: 'assets/img/c-defender.webp' },
    porsche: { name: '911', full: '2020 Porsche 911 Turbo S', meta: '$189,500 · 12,800 mi', img: 'assets/img/c-porsche.webp' },
    civic: { name: 'Civic', full: '2019 Honda Civic EX', meta: '$18,900 · 48,200 mi', img: 'assets/img/c-civic.webp' },
    gclass: { name: 'G 500', full: '2019 Mercedes-Benz G 500', meta: '$119,000 · 26,500 mi', img: 'assets/img/c-gclass.webp' },
    tesla: { name: 'Model 3', full: '2022 Tesla Model 3 Long Range', meta: '$31,400 · 24,700 mi', img: 'assets/img/c-tesla.webp' },
    charger: { name: 'Charger', full: '2020 Dodge Charger SRT Hellcat', meta: '$54,800 · 19,600 mi', img: 'assets/img/c-charger.webp' }
  };
  var ORDER = ['defender', 'porsche', 'civic', 'gclass', 'tesla', 'charger'];

  /* ------------------------------------------------------------ days and hours (New York) */
  var DAYS = (function () {
    var out = [], d = new Date();
    d.setHours(12, 0, 0, 0);
    for (var i = 0; i < 4; i++) { out.push(new Date(d.getTime() + i * 864e5)); }
    return out;
  })();
  function fmt(d, o) { return d.toLocaleDateString('en-US', o); }
  function shortDay(d) { return fmt(d, { weekday: 'short' }) + ', ' + fmt(d, { month: 'short', day: 'numeric' }); }
  $$('[data-day-select]').forEach(function (sel) {
    sel.innerHTML = DAYS.map(function (d, i) { return '<option value="' + i + '"' + (i === 1 ? ' selected' : '') + '>' + shortDay(d) + '</option>'; }).join('');
  });
  $$('[data-days="sheet"] .box').forEach(function (box, i) {
    $('b', box).textContent = fmt(DAYS[i], { weekday: 'short' });
    $('small', box).textContent = fmt(DAYS[i], { month: 'short', day: 'numeric' });
  });

  var HOURS = { 0: [11, 17], 1: [10, 19], 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 18] };
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function hourText(h) { return (h > 12 ? h - 12 : h) + (h >= 12 ? ' PM' : ' AM'); }
  try {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
    var today = WD.indexOf(get('weekday'));
    var now = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
    var h = HOURS[today];
    var open = now >= h[0] && now < h[1];
    var text = open ? 'Open today · till ' + hourText(h[1]) : now < h[0] ? 'Closed · opens ' + hourText(h[0]) : 'Closed · opens ' + WD[(today + 1) % 7] + ' ' + hourText(HOURS[(today + 1) % 7][0]);
    $$('[data-open-now]').forEach(function (p) { p.classList.toggle('is-closed', !open); $('span', p).textContent = text; });
    $$('[data-hours] [data-days]').forEach(function (row) { row.classList.toggle('is-today', row.getAttribute('data-days').split(' ').indexOf(String(today)) >= 0); });
  } catch (err) { /* no time zone support: the printed hours stay */ }

  /* ------------------------------------------------------------ the story */
  var story = $('[data-story]');
  function glideTo(y) {
    if (window.CalmScroll) CalmScroll.to(y);
    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  // Calm scroll (tools/calm-scroll.js): one move = one stop, a slow eased glide - the gate rolls all the way up, then
  // each of the six cars on its own, then the rest of the story; the last stop opens the page below.
  if (window.CalmScroll && story) CalmScroll.story(function () {
    var top = story.offsetTop, unit = PER * vh, u = [0, 1.8, 2.08];
    for (var k = 0; k < 6; k++) u.push(3 + (k + 0.5) / 6);
    u.push(4.08, 5.08, 6.08, 7.08);
    var s = u.map(function (x) { return top + x * unit; });
    s.push(top + story.offsetHeight - (phoneMq.matches ? 60 : 80));
    return s;
  });
  var stills = {};
  $$('[data-still]').forEach(function (el) { stills[el.getAttribute('data-still')] = el; });
  var steps = $$('.step');
  var shows = $$('[data-show]');
  var railLinks = $$('.rail a');
  var bars = $$('.progress-row i');
  var dock = $('[data-dock]');
  var pbar = $('.pbar');
  var shutter = $('[data-shutter]');
  var vh = window.innerHeight;
  var PER = 1;
  var state = -1;
  var car = 'defender';
  var carChosen = false;
  var scrollCar = -1;
  var shown = null;
  var RAIL_OF = [0, 0, 1, 1, 2, 3, 4, 5];
  var RAIL_START = [0, 2, 4, 5, 6, 7];
  var RAIL_END = [2, 4, 5, 6, 7, 8];
  var NAV_OF = [null, null, 'lot', 'lot', null, 'drive', 'trade', 'drive'];
  var UNIT_OF = { open: 0.02, choose: 2.05, look: 4.05, sit: 5.05, trade: 6.05, drive: 7.05 };
  var lite = reduceMotion || saveData;

  function stillFor(t) {
    if (t <= 1) return 'gate';
    if (t === 2) return carChosen && car !== 'defender' ? 'car-' + car : 'gate';
    if (t === 3) return car === 'defender' ? 'gate' : 'car-' + car;
    return ['look', 'sit', 'trade', 'drive'][t - 4];
  }

  function markNear() {
    var want = [stillFor(state - 1), stillFor(state), stillFor(state + 1), shown];
    if (state >= 1 && state <= 3) ORDER.forEach(function (c) { want.push('car-' + c); });
    Object.keys(stills).forEach(function (k) { stills[k].classList.toggle('is-near', want.indexOf(k) >= 0); });
  }

  function showStill(name, kind, back) {
    if (name === shown) return;
    var a = stills[shown], b = stills[name];
    var from = shown;
    shown = name;
    markNear();
    Object.keys(stills).forEach(function (k) {
      var s = stills[k];
      if (s.getAnimations) s.getAnimations().forEach(function (an) { an.cancel(); });
      s.classList.toggle('is-active', k === name);
      s.style.zIndex = '';
    });
    if (!a || !b || !b.animate || from == null) return;
    var ms = reduceMotion ? 150 : { quick: 300, fade: 400, cross: 500, zoom: 700 }[kind] || 400;
    b.style.zIndex = 2;
    a.style.zIndex = 1;
    if (kind === 'zoom' && !reduceMotion && !back) {
      a.style.transformOrigin = '30% 72%';
      a.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.35)', opacity: 1, offset: .7 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: ms, easing: INOUT });
      b.animate([{ opacity: 0 }, { opacity: 0, offset: .6 }, { opacity: 1 }], { duration: ms, easing: 'linear' });
    } else {
      a.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: INOUT });
      b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: INOUT });
    }
  }

  function setCar(id, manual) {
    if (!CARS[id]) return;
    car = id;
    if (manual) carChosen = true;
    $$('[data-tiles] .tile').forEach(function (t) {
      var on = t.getAttribute('data-car') === id;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var i = ORDER.indexOf(id);
    var line = $('[data-switch-line]');
    if (line) line.textContent = (i <= 0 ? 'Defender or 911?' : CARS[ORDER[i - 1]].name + ' or ' + CARS[id].name + '?');
    if (state === 2 || state === 3) showStill(stillFor(state), 'fade');
    if (dock && dock.elements.car && manual) dock.elements.car.value = id;
  }

  function setState(t) {
    if (t === state) return;
    var from = state;
    state = t;
    steps.forEach(function (s, k) {
      s.classList.toggle('is-leaving', k === from);
      s.classList.toggle('is-active', k === t);
    });
    shows.forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-show').split(' ').indexOf(String(t)) >= 0); });
    var r = RAIL_OF[t];
    railLinks.forEach(function (a, k) {
      a.classList.toggle('is-on', k === r);
      a.classList.toggle('is-done', k < r);
      if (k === r) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    bars.forEach(function (b, k) { b.classList.toggle('is-on', k <= r); });
    var kind = t === 2 && from < 2 ? 'quick' : t === 4 && from === 3 ? 'zoom' : t >= 6 ? 'cross' : 'fade';
    showStill(stillFor(t), kind, t < from);
    var glow = t === 5 || t === 7;
    if (dock) {
      dock.classList.toggle('is-glow', glow);
      if (t === 5 && from !== 5 && !reduceMotion) { var go = $('[data-dock-book]'); go.classList.remove('pulse'); void go.offsetWidth; go.classList.add('pulse'); }
    }
    if (pbar) pbar.classList.toggle('is-glow', t === 5);
    document.body.classList.toggle('strip-on', t <= 1);
    document.body.classList.toggle('trade-on', t === 6 && phoneMq.matches);
    markNav();
  }

  /* the gate: a roll-up shutter over the real photo, scrubbed by scroll */
  function setGate(g) {
    if (!shutter) return;
    var gate = stills.gate;
    gate.style.setProperty('--g', g.toFixed(4));
    gate.classList.toggle('is-up', g >= 0.999);
  }

  function layout() {
    if (!story) return;
    vh = window.innerHeight;
    PER = phoneMq.matches ? 0.8 : 1;
    story.style.height = Math.round((8 * PER + 1) * vh) + 'px';
    update();
  }

  function update() {
    if (!story) { markNav(); return; }
    var y = window.scrollY - story.offsetTop;
    var u = clamp(y / (PER * vh), 0, 7.999);
    var t = u < 1 ? 0 : u < 2 ? 1 : u < 3 ? 2 : u < 4 ? 3 : Math.floor(u);
    setState(t);
    setGate(t >= 2 ? 1 : lite ? (t >= 1 ? 1 : 0) : clamp((u - 0.3) / 1.5, 0, 1));
    if (t === 3) {
      var ci = clamp(Math.floor((u - 3) * 6), 0, 5);
      if (ci !== scrollCar) { scrollCar = ci; setCar(ORDER[ci]); }
    } else scrollCar = -1;
    if (t === 5) {
      var push = $('.still-push', stills.sit);
      if (push && !reduceMotion) push.style.setProperty('--push', (1 + (u - 5) * 0.04).toFixed(4));
    }
    var r = RAIL_OF[t];
    var link = railLinks[r];
    if (link) {
      var frac = clamp((u - RAIL_START[r]) / (RAIL_END[r] - RAIL_START[r]), 0, 1);
      var next = railLinks[r + 1];
      var base = link.offsetTop + link.offsetHeight / 2 - 8;
      var fill = base + (next ? (next.offsetTop - link.offsetTop) * frac : 0);
      link.parentNode.parentNode.style.setProperty('--fill', Math.max(0, fill) + 'px');
    }
    var past = story.getBoundingClientRect().bottom < window.innerHeight - 2;   // the stage has started to scroll away
    document.body.classList.toggle('on-sections', past);
    if (past) document.body.classList.remove('strip-on');
    markNav();
  }

  var navKey;
  function markNav() {
    var key = null;
    var lot = $('#lot'), visit = $('#visit');
    if (visit && visit.getBoundingClientRect().top < vh * 0.5) key = 'visit';
    else if (lot && lot.getBoundingClientRect().top < vh * 0.5) key = 'lot';
    else if (state >= 0 && story) key = NAV_OF[state];
    if (document.body.classList.contains('page-car')) key = 'lot';
    if (key === navKey) return;
    navKey = key;
    $$('.nav [data-nav]').forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('data-nav') === key); });
  }

  function goUnit(unit) {
    if (!story) return;
    glideTo(Math.ceil(story.offsetTop + unit * PER * vh));
  }
  function goTo(hash) {
    var id = hash.slice(1);
    if (id === 'top') { glideTo(0); return true; }
    if (story && UNIT_OF[id] != null) { goUnit(UNIT_OF[id]); return true; }
    var el = id ? document.getElementById(id) : null;
    if (!el) return false;
    glideTo(el.getBoundingClientRect().top + window.scrollY - (phoneMq.matches ? 60 : 80));
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-open')) return;
    if (goTo(a.getAttribute('href'))) e.preventDefault();
  });

  if (story) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      var touch = window.matchMedia('(pointer: coarse)').matches;
      if (touch && window.innerWidth === lastW && Math.abs(window.innerHeight - vh) < 140) return;   // the phone's address bar
      lastW = window.innerWidth;
      layout();
    });
    shown = 'gate';
    steps[0].classList.remove('is-active');
    var poster = $('img', stills.gate);
    if (poster && !reduceMotion) poster.classList.add('breathe');
    layout();
    if (state === 0) { state = -1; window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { setState(0); }); }); }
    if (location.hash) setTimeout(function () { goTo(location.hash); }, 80);
    $$('[data-tiles] .tile').forEach(function (t) { t.addEventListener('click', function () { setCar(t.getAttribute('data-car'), true); }); });
  } else {
    window.addEventListener('scroll', markNav, { passive: true });
    markNav();
  }

  /* the dock hides while the footer is in view */
  var foot = $('[data-foot]');
  if (dock && foot && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { dock.classList.toggle('is-hidden', en[0].isIntersecting); }).observe(foot);
  }

  /* ------------------------------------------------------------ the lot */
  function filterLot(body) {
    $$('[data-bodies] .pill').forEach(function (p) {
      var on = p.getAttribute('data-body') === body;
      p.classList.toggle('is-on', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var shownCars = 0;
    $$('[data-cars] .car').forEach(function (c) {
      var hit = body === 'all' || c.getAttribute('data-body') === body;
      c.classList.toggle('is-out', !hit);
      if (hit) { shownCars++; if (c.animate && !reduceMotion) c.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: OUT }); }
    });
    var empty = $('[data-empty]');
    if (empty) empty.hidden = shownCars > 0;
  }
  $$('[data-bodies] .pill').forEach(function (p) { p.addEventListener('click', function () { filterLot(p.getAttribute('data-body')); }); });
  var find = $('[data-find]');
  if (find) find.addEventListener('submit', function (e) {
    e.preventDefault();
    filterLot(find.elements.body ? find.elements.body.value : 'all');
    goTo('#lot');
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    [['.cars .car', 60], ['.reviews li', 80]].forEach(function (g) {
      $$(g[0]).forEach(function (el, k) { el.classList.add('reveal'); el.style.transitionDelay = ((k % 6) * g[1]) + 'ms'; io.observe(el); });
    });
    $$('[data-pin], .points').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-pin], .points').forEach(function (el) { el.classList.add('is-in'); });
  }
  $$('.points li').forEach(function (li, k) { li.style.transitionDelay = (k * 70) + 'ms'; });

  /* ------------------------------------------------------------ one car page: photos */
  var main = $('[data-main]');
  $$('.cp-thumb').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.cp-thumb').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      if (main.animate && !reduceMotion) main.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 200 });
      main.src = b.getAttribute('data-src');
      main.alt = b.getAttribute('data-alt');
    });
  });
  var swipe = $('[data-swipe]');
  if (swipe) swipe.addEventListener('scroll', function () {
    var i = Math.round(swipe.scrollLeft / Math.max(1, swipe.clientWidth));
    $$('[data-dots] i').forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
  }, { passive: true });
  var light = $('[data-lightbox]');
  if (light) {
    var lightFrom = null;
    var shut = function () { light.hidden = true; if (lightFrom) lightFrom.focus(); };
    $$('[data-light]').forEach(function (b) {
      b.addEventListener('click', function () { lightFrom = b; $('[data-light-img]', light).src = main.src; $('[data-light-img]', light).alt = main.alt; light.hidden = false; $('.close', light).focus(); });
    });
    $$('[data-light-close]', light).forEach(function (b) { b.addEventListener('click', shut); });
    light.addEventListener('click', function (e) { if (e.target === light) shut(); });
    document.addEventListener('keydown', function (e) { if (!light.hidden && e.key === 'Escape') shut(); });
  }

  $$('.photos input').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var t = $('[data-photos-text]', inp.parentNode);
      if (t) t.textContent = inp.files.length ? inp.files.length + ' photo' + (inp.files.length > 1 ? 's' : '') + ' added' : 'Front, back, inside, the dash. From your phone.';
    });
  });

  /* ------------------------------------------------------------ request sheets */
  var root = $('[data-sheets]');
  if (!root) return;
  var sheet = $('[data-sheet]', root);
  var opener = null;
  var sheetCar = car;
  var sms = $('[data-sms]');
  var smsTimer = null;

  function formOf(kind) { return $('[data-form="' + kind + '"]', root); }
  function showOnly(el) {
    $$('.sheet-form, .sheet-done', root).forEach(function (x) { x.hidden = x !== el; x.classList.remove('is-shown'); });
    if (el) window.requestAnimationFrame(function () { el.classList.add('is-shown'); });
  }
  function pick(form, name, value) { $$('input[name="' + name + '"]', form).forEach(function (r) { r.checked = r.value === String(value); }); }
  function digits(s) { return (s || '').replace(/\D/g, '').length; }
  function read(form) { var o = {}; new FormData(form).forEach(function (v, k) { if (typeof v === 'string') o[k] = v.trim(); }); return o; }
  function first(name) { return (name || '').split(/\s+/)[0]; }

  function setSheetCar(id) {
    if (!CARS[id]) return;
    sheetCar = id;
    $$('[data-car-thumb]', root).forEach(function (img) { img.src = CARS[id].img; });
    $$('[data-car-name]', root).forEach(function (el) { el.textContent = CARS[id].full; });
    $$('[data-car-meta]', root).forEach(function (el) { el.textContent = CARS[id].meta; });
    $$('[data-pick]', root).forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-pick') === id); });
  }

  function summarise() {
    var f = formOf('drive');
    if (!f) return;
    var o = read(f);
    var d = DAYS[Number(o.day) || 0];
    $('[data-sum="when"]', f).textContent = shortDay(d) + ' · ' + (o.time || '');
    $('[data-sum="who"]', f).textContent = o.name || 'Your name';
    $('[data-sum="trade"]', f).textContent = o.trade === 'no' ? 'No' : 'Yes, ask me';
    var b = $$('[data-bars] i', f);
    b[0].classList.add('is-on');
    b[1].classList.toggle('is-on', !!(o.day && o.time));
    b[2].classList.toggle('is-on', (o.name || '').length >= 2 && digits(o.phone) >= 7);
    b[3].classList.remove('is-on');
  }

  function openSheet(kind, from, preset) {
    var form = formOf(kind);
    if (!form) return;
    opener = from || document.activeElement;
    if (form.tagName === 'FORM') form.reset();
    $$('[aria-invalid]', form).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    var err = $('[data-error]', form); if (err) err.textContent = '';
    if (kind === 'drive' || kind === 'ask') setSheetCar(preset && CARS[preset.car] ? preset.car : car);
    if (kind === 'drive') {
      var mini = $('[data-mini]', form); if (mini) mini.hidden = true;
      if (preset && preset.day != null) pick(form, 'day', preset.day); else pick(form, 'day', 1);
      if (preset && preset.time) pick(form, 'time', preset.time);
    }
    if (preset) Object.keys(preset).forEach(function (k) {
      if (k === 'car' || k === 'day' || k === 'time' || preset[k] == null || !form.elements) return;
      var el = form.elements[k];
      if (!el) return;
      if (el.length && el[0] && el[0].type === 'radio') pick(form, k, preset[k]); else if (el.type !== 'file') el.value = preset[k];
    });
    summarise();
    showOnly(form);
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () {
      root.classList.add('is-open');
      $('[data-sheet-scroll]', root).scrollTop = 0;
      var t = $('.sheet-title', form);
      if (t) t.focus({ preventScroll: true });
    });
  }

  function closeSheet() {
    if (root.hidden) return;
    root.classList.remove('is-open');
    document.body.style.overflow = '';
    window.setTimeout(function () { root.hidden = true; }, reduceMotion ? 0 : 420);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  function mark(el, bad) { if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
  function check(form, o, kind) {
    var problems = [];
    var phoneOk = digits(o.phone) >= 7;
    if (kind === 'drive') {
      var nameOk = (o.name || '').length >= 2;
      mark(form.elements.name, !nameOk);
      if (!nameOk) problems.push(['name', 'Add your name.']);
    }
    mark(form.elements.phone, !phoneOk);
    if (!phoneOk) problems.push(['phone', 'Add a mobile number so we can text you.']);
    var err = $('[data-error]', form);
    if (err) err.textContent = problems.map(function (p) { return p[1]; }).join(' ');
    if (problems.length) { form.elements[problems[0][0]].focus(); return false; }
    return true;
  }

  function showSms(text) {
    if (!sms) return;
    $('[data-sms-text]', sms).textContent = text;
    sms.hidden = false;
    window.clearTimeout(smsTimer);
    window.requestAnimationFrame(function () { sms.classList.add('is-on'); });
    smsTimer = window.setTimeout(function () { sms.classList.remove('is-on'); window.setTimeout(function () { sms.hidden = true; }, 450); }, 6000);
  }

  function done(kind, o) {
    if (kind === 'drive') {
      var d = DAYS[Number(o.day) || 0];
      var box = $('[data-done="drive"]', root);
      var name = first(o.name);
      $('[data-done-title]', box).textContent = 'You\'re booked, ' + name + '.';
      $('[data-done-when]', box).textContent = shortDay(d) + ' · ' + o.time + ' · test drive';
      $('[data-next-trade]', box).hidden = o.trade === 'no';
      showOnly(box);
      $('[data-done-title]', box).focus({ preventScroll: true });
      window.setTimeout(function () {
        showSms('Hi ' + name + '! Your test drive is booked for ' + fmt(d, { weekday: 'long' }) + ' at ' + o.time + '. Reply here if you need to change it.');
      }, reduceMotion ? 0 : 400);
      return;
    }
    var thanks = $('[data-done="thanks"]', root);
    $('[data-thanks-title]', thanks).textContent = kind === 'trade' ? 'Got it.' : 'Sent.';
    $('[data-thanks-text]', thanks).textContent = kind === 'trade'
      ? 'Oakline Motors looks at your car and replies by text.'
      : 'Your question went to Oakline Motors with this car attached. We answer by text.';
    showOnly(thanks);
    $('[data-thanks-title]', thanks).focus({ preventScroll: true });
  }

  $$('form.sheet-form', root).forEach(function (form) {
    form.addEventListener('input', summarise);
    form.addEventListener('change', summarise);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = form.getAttribute('data-form');
      var o = read(form);
      if (!check(form, o, kind)) return;
      if (kind === 'drive') $$('[data-bars] i', form).forEach(function (b) { b.classList.add('is-on'); });
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      window.setTimeout(function () { btn.disabled = false; done(kind, o); }, reduceMotion ? 0 : 500);
    });
  });

  var change = $('[data-change]', root);
  if (change) change.addEventListener('click', function () { var m = $('[data-mini]', root); m.hidden = !m.hidden; });
  $$('[data-pick]', root).forEach(function (b) {
    b.addEventListener('click', function () { setSheetCar(b.getAttribute('data-pick')); $('[data-mini]', root).hidden = true; });
  });

  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var kind = b.getAttribute('data-open');
      var q = b.getAttribute('data-question');
      var cardEl = b.closest('.car');
      openSheet(kind, b, q ? { question: q, car: 'porsche' } : cardEl ? { car: cardEl.getAttribute('data-car') } : null);
    });
  });

  if (dock) dock.addEventListener('submit', function (e) {
    e.preventDefault();
    var o = read(dock);
    openSheet('drive', $('[data-dock-book]'), { car: o.car || car, day: o.day, time: o.time });
  });

  /* the cards in the story hand straight to the sheet: complete = sent, else the sheet asks for the rest */
  [['[data-ask-card]', 'ask'], ['[data-trade-card]', 'trade']].forEach(function (pair) {
    var cardForm = $(pair[0]);
    if (!cardForm) return;
    cardForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var o = read(cardForm);
      if (pair[1] === 'ask') o.car = 'porsche';
      openSheet(pair[1], $('button[type="submit"]', cardForm), o);
      if (digits(o.phone) >= 7) done(pair[1], o);
    });
  });

  $$('[data-close]', root).forEach(function (b) { b.addEventListener('click', closeSheet); });
  $$('[data-close-go]', root).forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href.charAt(0) !== '#') { closeSheet(); return; }
      e.preventDefault();
      e.stopPropagation();
      closeSheet();
      window.setTimeout(function () { goTo(href); }, 60);
    });
  });
  if (sms) sms.addEventListener('click', function () { sms.classList.remove('is-on'); sms.hidden = true; });

  var startY = null;
  sheet.addEventListener('touchstart', function (e) { if ($('[data-sheet-scroll]', root).scrollTop <= 0) startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', function (e) { if (startY != null && e.touches[0].clientY - startY > 90) { startY = null; closeSheet(); } }, { passive: true });
  sheet.addEventListener('touchend', function () { startY = null; });

  document.addEventListener('keydown', function (e) {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var list = $$('a[href], button:not([disabled]), input:not([type="radio"]), input[type="radio"]:checked, select, [tabindex="-1"]', sheet)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!list.length) return;
    var a = list[0], z = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === a || !sheet.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
})();
