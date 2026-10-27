/* NOCTURNE Detail Studio: the scroll story and the booking drawer. No libraries. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORE = 'nocturne-booking';

  /* ------------------------------------------------------------ the scroll story */
  var story = $('.story');
  var stages = $$('.stage');
  var UNITS = [1, 2.4, 1, 1, 1];                 // how much scroll each stage takes (screens)
  var STATUS = [['Studio open', 'Booking this week'], ['Step 1', 'Wash'], ['Step 2', 'Inspect'],
                ['Step 3', 'Polish + ceramic'], ['Ready', 'Pick-up']];
  var NAV_FOR = { 1: '1', 3: '3', 4: '4' };
  var starts = [];
  var total = UNITS.reduce(function (sum, u) { starts.push(sum); return sum + u; }, 0);
  var vh = window.innerHeight;
  var current = 0;
  var previous = -1;
  var clean = $('[data-clean]');
  var water = $('[data-water]');
  var statusA = $('[data-status-a]');
  var statusB = $('[data-status-b]');
  var ticking = false;

  function layout() {
    vh = window.innerHeight;
    story.style.height = ((total + 1) * vh) + 'px';
    update();
  }

  function setStage(i) {
    if (i === current) return;
    previous = current;
    current = i;
    stages.forEach(function (s, k) {
      s.classList.toggle('is-active', k === i);
      s.classList.toggle('is-under', k === previous);
    });
    statusA.textContent = STATUS[i][0];
    statusB.textContent = STATUS[i][1];
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === NAV_FOR[i]); });
    $$('[data-index]').forEach(function (a) {
      var on = Number(a.getAttribute('data-index')) === i;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
  }

  function update() {
    var max = story.offsetHeight - vh;
    var y = clamp(window.scrollY - story.offsetTop, 0, Math.max(max, 1));
    var u = (max > 0 ? y / max : 0) * total;
    var i = 0;
    for (var k = 0; k < UNITS.length; k++) if (u >= starts[k]) i = k;
    if (i === 0 && u >= starts[1] - 0.02) i = 1;        // the wash frame starts on the same photo
    setStage(i);
    var w = clamp((u - starts[1] - 0.15) / (UNITS[1] - 0.3), 0, 1);
    clean.style.clipPath = 'inset(0 ' + ((1 - w) * 100).toFixed(2) + '% 0 0)';
    water.style.left = (w * 100).toFixed(2) + '%';
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { update(); ticking = false; });
  }

  function scrollToStage(i, frac) {
    var max = story.offsetHeight - vh;
    var u = starts[i] + (frac || 0.04) * UNITS[i];
    window.scrollTo({ top: story.offsetTop + (u / total) * max, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function makeDrops() {
    var box = $('[data-drops]');
    if (!box) return;
    var html = '';
    for (var n = 0; n < 46; n++) {
      var d = [1.5, 2, 2, 2.5, 3, 3, 4, 5][n % 8];
      var x = 40 + (Math.sin(n * 12.9898) * 43758.5453 % 1) * 44 - 22;
      var y = (Math.cos(n * 78.233) * 9631.7 % 1) * 100;
      html += '<i style="width:' + d + 'px;height:' + d + 'px;left:' + Math.abs(x).toFixed(1) + 'px;top:' + Math.abs(y).toFixed(1) +
              '%;opacity:' + (0.5 + (n % 4) * 0.15) + ';--dx:' + ((n % 2 ? 1 : -1) * (4 + n % 7)) + 'px;animation-delay:' + (-(n % 9) * 0.37) + 's"></i>';
    }
    box.innerHTML = html;
  }

  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    var touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && window.innerWidth === lastW && Math.abs(window.innerHeight - vh) < 140) return;   // the phone's address bar
    lastW = window.innerWidth;
    layout();
  });
  window.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id === 'top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
    var i = stages.map(function (s) { return s.id; }).indexOf(id);
    if (i < 0) return;
    e.preventDefault();
    scrollToStage(i, id === 'wash' ? 0.42 : 0.04);
  });

  makeDrops();
  layout();
  if (location.hash) {
    var h = stages.map(function (s) { return s.id; }).indexOf(location.hash.slice(1));
    if (h >= 0) setTimeout(function () { scrollToStage(h, h === 1 ? 0.42 : 0.04); }, 60);
  }

  /* ------------------------------------------------------------ the booking drawer */
  var root = $('#booking');
  var drawer = $('.drawer', root);
  var form = $('#booking-form');
  var done = $('#booked');
  var progress = $$('[data-progress] i');
  var sms = $('[data-sms]');
  var opener = null;
  var smsTimer = null;
  var LEAD = { Wash: 0, Polish: 1, Ceramic: 2 };
  var LEAD_LABEL = { Wash: 'Same day', Polish: '1 day', Ceramic: '2 days' };

  function addDays(date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);    // closed on Sundays
    return d;
  }
  function openDays(n) {
    var out = [];
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    while (out.length < n) {
      d = new Date(d.getTime() + 864e5);
      if (d.getDay() !== 0) out.push(d);
    }
    return out;
  }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fromIso(s) { var p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12); }
  function fmt(d, opts) { return d.toLocaleDateString('en-US', opts); }

  function buildDays() {
    var box = $('[data-days]');
    var html = '';
    openDays(4).forEach(function (d, i) {
      html += '<label class="chip"><input type="radio" name="day" value="' + iso(d) + '"' + (i === 1 ? ' checked' : '') +
              '><span class="box"><b>' + fmt(d, { weekday: 'short' }) + '</b><small>' + fmt(d, { month: 'short', day: 'numeric' }) + '</small></span></label>';
    });
    box.innerHTML = html;
  }

  function read() {
    var f = new FormData(form);
    var o = {};
    ['kind', 'make', 'work', 'day', 'time', 'name', 'phone', 'email'].forEach(function (k) { o[k] = String(f.get(k) || '').trim(); });
    return o;
  }

  function carName(o) { return o.make ? o.make : (o.kind === 'SUV' ? 'SUV' : o.kind.toLowerCase()); }

  function summarise() {
    var o = read();
    var day = o.day ? fromIso(o.day) : null;
    $('[data-sum="car"]').textContent = o.kind + (o.make ? ' · ' + o.make : '');
    $('[data-sum="work"]').textContent = o.work + ' · ' + LEAD_LABEL[o.work];
    $('[data-sum="when"]').textContent = day ? fmt(day, { weekday: 'long' }) + ' ' + o.time : 'Pick a day';
    $('[data-sum="name"]').textContent = o.name || 'Add your name';
    var filled = 2 + (day ? 1 : 0) + (o.name && o.phone ? 1 : 0);
    progress.forEach(function (p, i) { p.classList.toggle('is-on', i < filled); });
  }

  function setError(name, msg) {
    var input = form.elements[name];
    var err = $('#err-' + name);
    if (err) err.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  function validate(o) {
    var first = null;
    var problems = {
      name: o.name.length < 2 ? 'Tell us your name.' : '',
      phone: o.phone.replace(/\D/g, '').length < 7 ? 'We need a phone number for the text.' : '',
      email: o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email) ? 'That email doesn\'t look right.' : ''
    };
    Object.keys(problems).forEach(function (k) {
      setError(k, problems[k]);
      if (problems[k] && !first) first = k;
    });
    if (!o.day) { first = first || 'day'; }
    return first;
  }

  function focusables() {
    return $$('a[href], button:not([disabled]), input:not([disabled]):not([type="radio"]), input[type="radio"]:checked, select, [tabindex="-1"]', drawer)
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function openDrawer(from, preset) {
    opener = from || null;
    if (preset) {
      if (preset.kind && form.elements.kind) form.elements.kind.value = preset.kind;
      if (preset.work && form.elements.work) form.elements.work.value = preset.work;
    }
    summarise();
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () {
      root.classList.add('is-open');
      $('[data-drawer-scroll]').scrollTop = 0;
      $('#drawer-title').focus({ preventScroll: true });
    });
  }

  function closeDrawer() {
    root.classList.remove('is-open');
    document.body.style.overflow = '';
    hideSms();
    window.setTimeout(function () { root.hidden = true; }, reduceMotion ? 0 : 420);
    if (opener && opener.focus) opener.focus();
  }

  function showSms(text) {
    $('[data-sms-text]').textContent = text;
    sms.hidden = false;
    window.clearTimeout(smsTimer);
    smsTimer = window.setTimeout(function () { sms.classList.add('is-on'); }, 650);
    smsTimer = window.setTimeout(hideSms, 9000);
  }
  function hideSms() {
    window.clearTimeout(smsTimer);
    sms.classList.remove('is-on');
    window.setTimeout(function () { if (!sms.classList.contains('is-on')) sms.hidden = true; }, 450);
  }

  function book(o) {
    var day = fromIso(o.day);
    var ready = addDays(day, LEAD[o.work]);
    var first = o.name.split(/\s+/)[0];
    var booking = {
      name: o.name, first: first, phone: o.phone, email: o.email, kind: o.kind, make: o.make, work: o.work,
      day: o.day, time: o.time, ready: iso(ready), at: new Date().toISOString()
    };
    try { window.localStorage.setItem(STORE, JSON.stringify(booking)); } catch (err) { /* private mode: the owner page shows its sample instead */ }

    $('[data-done-title]').innerHTML = 'You\'re booked,<br>' + escapeHtml(first) + '.';
    $('[data-done-when]').textContent = fmt(day, { weekday: 'long' }) + ' · ' + o.time + ' · ' + o.work;
    $('[data-next-drop]').textContent = 'Drop it off ' + fmt(day, { weekday: 'long' }) + ' at ' + o.time;
    $('[data-next-ready]').textContent = LEAD[o.work] === 0
      ? 'Ready the same day after 17:00'
      : 'Ready ' + fmt(ready, { weekday: 'long' }) + ' after 15:00';
    progress.forEach(function (p) { p.classList.add('is-on'); });
    form.hidden = true;
    done.hidden = false;
    $('[data-drawer-scroll]').scrollTop = 0;
    $('[data-done-title]').focus({ preventScroll: true });
    showSms('Hi ' + first + '! Your ' + carName(o) + ' is booked for ' + fmt(day, { weekday: 'long' }) + ' at ' + o.time + '. Reply here if you need anything.');
  }

  function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function resetDrawer() {
    form.reset();
    form.elements.kind.value = 'Coupe';
    form.elements.work.value = 'Ceramic';
    form.elements.time.value = '10:00';
    buildDays();
    ['name', 'phone', 'email'].forEach(function (k) { setError(k, ''); });
    form.hidden = false;
    done.hidden = true;
    summarise();
  }

  buildDays();
  summarise();
  form.addEventListener('input', summarise);
  form.addEventListener('change', summarise);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var o = read();
    var bad = validate(o);
    if (bad) {
      var el = form.elements[bad];
      if (el && el.focus) (el.length ? el[0] : el).focus();
      return;
    }
    book(o);
  });

  $$('[data-open-booking]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); openDrawer(b); });
  });
  $$('[data-quick]').forEach(function (q) {
    q.addEventListener('submit', function (e) {
      e.preventDefault();
      openDrawer($('button', q), { kind: q.elements.kind.value, work: q.elements.work.value });
    });
  });
  $$('[data-close]', root).forEach(function (b) { b.addEventListener('click', closeDrawer); });
  $('[data-done]').addEventListener('click', function () { closeDrawer(); window.setTimeout(resetDrawer, 450); });
  sms.addEventListener('click', hideSms);

  document.addEventListener('keydown', function (e) {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    var list = focusables();
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
