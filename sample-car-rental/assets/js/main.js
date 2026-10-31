/* WHERE TO?: the rental day on scroll, the dates, the lot and the reservation request. No libraries. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phoneMq = window.matchMedia('(max-width: 860px)');
  var WA = '17185550144';

  /* ------------------------------------------------------------ the cars (read from the lot cards) */
  var CARS = {};
  var ORDER = ['tesla', 'porsche', 'gclass', 'defender', 'charger', 'civic'];   // the scroll's order on the Choose step
  $$('.ccard').forEach(function (c) {
    CARS[c.getAttribute('data-car')] = {
      id: c.getAttribute('data-car'), name: c.getAttribute('data-name'), cat: c.getAttribute('data-cat'),
      price: c.getAttribute('data-price'), seats: c.getAttribute('data-seats'), bags: c.getAttribute('data-bags'),
      gear: c.getAttribute('data-gear'), age: c.getAttribute('data-age'), img: 'assets/img/car-' + c.getAttribute('data-car') + '.webp'
    };
  });
  var SHORT = { gclass: 'G 63', porsche: '911', defender: 'Defender', tesla: 'Model 3', civic: 'Civic', charger: 'Charger' };
  var TYPE_CAR = { everyday: 'tesla', exotic: 'porsche', vans: 'defender', driver: 'gclass' };
  var CAR_TYPE = { tesla: 'everyday', civic: 'everyday', charger: 'everyday', porsche: 'exotic', gclass: 'exotic', defender: 'vans' };

  /* ------------------------------------------------------------ dates */
  var TIMES = [];
  for (var h = 8; h <= 20; h++) TIMES.push(h);
  function timeLabel(hh) { return (hh % 12 || 12) + ':00 ' + (hh >= 12 ? 'PM' : 'AM'); }
  function day0(d) { var x = new Date(d.getTime()); x.setHours(12, 0, 0, 0); return x; }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return day0(x); }
  function fmt(d, o) { return d.toLocaleDateString('en-US', o); }
  function shortDay(d) { return fmt(d, { weekday: 'short', month: 'short', day: 'numeric' }); }
  function isoDay(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fromIso(s) { var p = s.split('-'); return day0(new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))); }
  var today = day0(new Date());
  var first = addDays(today, 1);
  while (first.getDay() !== 5) first = addDays(first, 1);   // the coming Friday
  var state = { pickup: first, pickupTime: 10, ret: addDays(first, 2), returnTime: 18, car: '', where: 'lot', picking: 'start', whereTouched: false };

  $$('select[data-time]').forEach(function (s) {
    s.innerHTML = TIMES.map(function (t) { return '<option value="' + t + '">' + timeLabel(t) + '</option>'; }).join('');
    s.addEventListener('change', function () {
      if (s.getAttribute('data-time') === 'pickup') state.pickupTime = Number(s.value); else state.returnTime = Number(s.value);
      renderDates();
    });
  });
  $$('select[data-date-sel]').forEach(function (s) {
    var html = '';
    for (var dd = 0; dd < 45; dd++) { var d = addDays(today, dd); html += '<option value="' + isoDay(d) + '">' + shortDay(d) + '</option>'; }
    s.innerHTML = html;
    s.addEventListener('change', function () {
      var d = fromIso(s.value);
      if (s.getAttribute('data-date-sel') === 'pickup') { state.pickup = d; if (state.ret <= d) state.ret = addDays(d, 1); }
      else if (d > state.pickup) state.ret = d;
      renderDates();
    });
  });

  var cal = $('[data-cal]');
  var calStart = addDays(today, -((today.getDay() + 6) % 7));    // Monday of this week
  function buildCal() {
    if (!cal) return;
    var html = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<span class="dow" aria-hidden="true">' + d + '</span>'; }).join('');
    for (var i = 0; i < 14; i++) {
      var d = addDays(calStart, i);
      html += '<button type="button" data-day="' + isoDay(d) + '"' + (d < today ? ' disabled' : '') + ' aria-label="' + fmt(d, { weekday: 'long', month: 'long', day: 'numeric' }) + '"><span>' + d.getDate() + '</span></button>';
    }
    cal.innerHTML = html;
    var last = addDays(calStart, 13);
    var m1 = fmt(calStart, { month: 'short' }), m2 = fmt(last, { month: 'short' });
    $('[data-cal-month]').textContent = (m1 === m2 ? m1 : m1 + ' – ' + m2) + ' ' + last.getFullYear();
    cal.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-day]');
      if (!b || b.disabled) return;
      var d = fromIso(b.getAttribute('data-day'));
      if (state.picking === 'start' || d <= state.pickup) { state.pickup = d; state.ret = addDays(d, 1); state.picking = 'end'; }
      else { state.ret = d; state.picking = 'start'; }
      renderDates();
    });
  }

  function renderDates() {
    var p = state.pickup, r = state.ret;
    $$('[data-date-text="pickup"]').forEach(function (el) { el.textContent = shortDay(p).replace(',', ','); });
    $$('[data-date-text="return"]').forEach(function (el) { el.textContent = shortDay(r); });
    $$('[data-time-text="pickup"]').forEach(function (el) { el.textContent = timeLabel(state.pickupTime); });
    $$('[data-time-text="return"]').forEach(function (el) { el.textContent = timeLabel(state.returnTime); });
    $$('[data-bar-text="pickup"]').forEach(function (el) { el.textContent = shortDay(p) + ' · ' + timeLabel(state.pickupTime); });
    $$('[data-bar-text="return"]').forEach(function (el) { el.textContent = shortDay(r) + ' · ' + timeLabel(state.returnTime); });
    $$('[data-pbar-text]').forEach(function (el) { el.textContent = fmt(p, { month: 'short', day: 'numeric' }) + ' – ' + fmt(r, { month: 'short', day: 'numeric' }); });
    $$('select[data-time="pickup"]').forEach(function (s) { s.value = String(state.pickupTime); });
    $$('select[data-time="return"]').forEach(function (s) { s.value = String(state.returnTime); });
    $$('select[data-date-sel="pickup"]').forEach(function (s) { s.value = isoDay(p); });
    $$('select[data-date-sel="return"]').forEach(function (s) { s.value = isoDay(r); $$('option', s).forEach(function (o) { o.disabled = o.value <= isoDay(p); }); });
    var days = Math.round((r - p) / 864e5) + 1;
    var note = $('[data-days-note]');
    if (note) note.textContent = days + ' days. You see the price for your dates when we reply.';
    if (cal) $$('button[data-day]', cal).forEach(function (b) {
      var d = fromIso(b.getAttribute('data-day'));
      var s = +d === +p, e = +d === +r;
      b.classList.toggle('is-start', s);
      b.classList.toggle('is-end', e);
      b.classList.toggle('in-range', d >= p && d <= r);
      if (s || e) b.setAttribute('aria-pressed', 'true'); else b.removeAttribute('aria-pressed');
    });
    renderWa();
  }

  /* WhatsApp links carry the car and the dates */
  function waLink(carName) {
    var line = 'Hi KEYHOUSE, I\'d like ' + (carName || 'a car') + ' from ' + shortDay(state.pickup) + ' to ' + shortDay(state.ret);
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(line);
  }
  function renderWa() {
    $$('[data-wa]').forEach(function (a) { a.href = waLink(state.car ? CARS[state.car].name : ''); });
    $$('[data-wa-car]').forEach(function (a) { a.href = waLink(a.getAttribute('data-wa-car')); });
    var f = $('[data-wa-fleet]');
    if (f) f.href = waLink(CARS[fleetCar] ? CARS[fleetCar].name : '');
  }

  /* bar selects */
  var barCar = $('[data-bar-car]'), barWhere = $('[data-bar-where]'), sheetCar = $('[data-sheet-car]');
  [barCar, sheetCar].forEach(function (s) {
    if (!s) return;
    s.innerHTML = '<option value="">Any car</option>' + ['gclass', 'porsche', 'defender', 'tesla', 'civic', 'charger'].map(function (id) {
      return '<option value="' + id + '">' + CARS[id].name + '</option>';
    }).join('');
  });
  function setCar(id) {
    state.car = id || '';
    if (barCar) barCar.value = state.car;
    if (sheetCar) sheetCar.value = state.car;
    var c = CARS[state.car];
    var img = $('[data-box-img]');
    if (img) { img.src = c ? c.img : 'assets/img/car-tesla.webp'; img.style.opacity = c ? 1 : .5; }
    var n = $('[data-box-name]'); if (n) n.textContent = c ? c.name : 'Any car';
    var pr = $('[data-box-price]'); if (pr) pr.textContent = c ? '$' + c.price + '/day · ' + c.seats + ' seats' : 'Tell us what you need';
    var age = $('[data-min-age]'); if (age) age.textContent = c ? c.age : '21';
    var k = $('[data-pbar-k]'); if (k) k.textContent = 'Dates · ' + (c ? SHORT[c.id] : (state.where === 'deliver' ? 'Delivery' : 'Any car'));
    renderWa();
    progress();
  }
  if (barCar) barCar.addEventListener('change', function () { setCar(barCar.value); });
  if (sheetCar) sheetCar.addEventListener('change', function () { setCar(sheetCar.value); });
  if (barWhere) barWhere.addEventListener('change', function () { state.where = barWhere.value; state.whereTouched = true; setCar(state.car); });

  /* ------------------------------------------------------------ office hours (New York time) */
  var HOURS = { 0: [10, 16], 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [9, 18] };
  function hourText(hh) { return (hh % 12 || 12) + ' ' + (hh >= 12 ? 'PM' : 'AM'); }
  try {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var get = function (t) { var x = parts.filter(function (q) { return q.type === t; })[0]; return x ? x.value : ''; };
    var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    var now = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
    var H = HOURS[wd], text, open = false;
    if (now >= H[0] && now < H[1]) { open = true; text = 'Open today · till ' + hourText(H[1]); }
    else if (now < H[0]) text = 'Closed · opens ' + hourText(H[0]);
    else { var n2 = HOURS[(wd + 1) % 7]; text = 'Closed · opens ' + hourText(n2[0]) + ' tomorrow'; }
    $$('[data-open-now]').forEach(function (p) { p.classList.toggle('is-closed', !open); $('span', p).textContent = text; });
    $$('[data-open-text]').forEach(function (s) { s.textContent = text; });
  } catch (err) { /* old browser without time zones: the printed hours stay */ }

  /* ------------------------------------------------------------ the story: the rental day */
  var story = $('[data-story]');
  function glideTo(y) {
    if (window.CalmScroll) CalmScroll.to(y);
    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  // Calm scroll (tools/calm-scroll.js): one move = one stop, a slow eased glide - each stop rests where its own picture
  // has fully come in (every car of the fleet too), so the words and the picture always match; the last stop opens the page.
  if (window.CalmScroll && story) CalmScroll.story(function () {
    var top = story.offsetTop, s = [top];
    keys.forEach(function (k, i) { if (i) s.push(top + (k.at + k.w / 2 + 0.04) * vh); });
    for (var i = 1; i < UNITS.length; i++) {
      var own = keys.some(function (k) { return k.at >= starts[i] && k.at < starts[i] + UNITS[i]; });
      if (!own) s.push(top + (starts[i] + 0.06 * UNITS[i]) * vh);
    }
    s.push(top + story.offsetHeight - (phoneMq.matches ? 64 : 92));
    return s;
  });
  var steps = $$('.step');
  var layers = {};
  $$('[data-layer]').forEach(function (l) { layers[l.getAttribute('data-layer')] = l; });
  var DESK = [1, 1, 2, 1.4, 1, 1.4, 1];
  var PHONE = [.8, .8, .9, 1, .8, 1, .8];
  var UNITS = DESK, starts = [], total = 0, vh = window.innerHeight, current = -1, keys = [];
  var NAMES = ['Pick up', 'Keys', 'Choose', 'Drive', 'Arrive', 'Night', 'Return'];
  var TIMEOFDAY = ['Morning', 'Morning', 'Midday', 'Afternoon', 'Golden hour', 'Night', 'Next morning'];
  var NAV_FOR = [null, null, 'cars', 'rules', 'driver', null, null];
  var fleetCar = phoneMq.matches ? 'porsche' : 'tesla';

  function buildKeys() {
    var s = starts, U = UNITS, k = [];
    var at = function (step, frac) { return s[step] + frac * U[step]; };
    k.push({ at: 0, layer: 'morning', w: 0 });
    k.push({ at: at(1, .4), layer: 'detail', w: .14 });
    if (phoneMq.matches) k.push({ at: at(2, 0), layer: 'porsche', w: .12 });
    else ORDER.forEach(function (id, i) { k.push({ at: at(2, i / 6), layer: id, w: i ? .12 : .14 }); });
    k.push({ at: at(3, .15), layer: 'rear', w: .14 });   // the day passes: midday to golden hour (real photos: a quick swap, never a long blend of two cars)
    k.push({ at: at(4, .02), layer: 'front', w: .12 });
    k.push({ at: at(5, .15), layer: 'nightrear', w: .14 });   // and dusk to night
    k.push({ at: at(6, .02), layer: 'high', w: .1 });
    keys = k;
  }

  function layout() {
    if (!story) return;
    vh = window.innerHeight;
    UNITS = phoneMq.matches ? PHONE : DESK;
    starts = []; total = 0;
    UNITS.forEach(function (u) { starts.push(total); total += u; });
    story.style.height = Math.round((total + 1) * vh) + 'px';
    buildKeys();
    update();
  }

  function paint(u) {
    var idx = 0;
    for (var i = 0; i < keys.length; i++) if (u >= keys[i].at - keys[i].w / 2) idx = i;
    var cur = keys[idx];
    var t = cur.w ? clamp((u - (cur.at - cur.w / 2)) / cur.w, 0, 1) : 1;
    var top = cur.layer, base = idx > 0 && t < 1 ? keys[idx - 1].layer : null;
    if (base === top) base = null;
    var near = {};
    for (var j = Math.max(0, idx - 1); j <= Math.min(keys.length - 1, idx + 2); j++) near[keys[j].layer] = true;
    Object.keys(layers).forEach(function (name) {
      var l = layers[name];
      var op = name === top ? (base ? t : 1) : name === base ? 1 : 0;
      l.style.opacity = op;
      l.style.zIndex = name === top ? 2 : name === base ? 1 : 0;
      l.classList.toggle('is-near', !!near[name] || op > 0);
    });
    // a slow push-in on whatever is on screen; on Keys the morning shot zooms toward the headlamp first
    var next = keys[idx + 1] ? keys[idx + 1].at : total;
    var local = clamp((u - cur.at) / Math.max(next - cur.at, .01), 0, 1);
    var push = $('.push', layers[top]);
    if (!reduceMotion && push) {
      if (top === 'morning' && u > starts[1] && u < starts[2]) {
        var z = clamp((u - starts[1]) / (UNITS[1] * .4), 0, 1);
        push.style.setProperty('--o', phoneMq.matches ? '63% 24%' : '47% 58%');   // the G 63's lit headlamp
        push.style.setProperty('--s', (1 + .25 * z).toFixed(4));
      } else {
        push.style.setProperty('--o', '60% 55%');
        push.style.setProperty('--s', (1 + .03 * local).toFixed(4));
      }
    }
  }

  function setStep(i, frac) {
    if (i !== current) {
      var from = current;
      current = i;
      steps.forEach(function (s, k) {
        s.classList.toggle('is-leaving', k === from);
        s.classList.toggle('is-active', k === i);
      });
      $$('.timeline a').forEach(function (a, k) {
        a.classList.toggle('is-on', k === i);
        a.classList.toggle('is-done', k < i);
        if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      });
      var lab = $('[data-dial-label]'); if (lab) lab.textContent = TIMEOFDAY[i];
      var pl = $('[data-phone-label]'); if (pl) pl.textContent = ('0' + (i + 1)) + ' · ' + TIMEOFDAY[i] + ' · ' + NAMES[i];
      document.body.classList.toggle('glow', i === 6 && !phoneMq.matches);
      if (barWhere && !state.whereTouched) { barWhere.value = i === 5 ? 'deliver' : 'lot'; state.where = barWhere.value; setCar(state.car); }
      if (i === 6 && from === 5 && !reduceMotion) {
        var fl = $('[data-flash]');
        if (fl && fl.animate) fl.animate([{ opacity: 0 }, { opacity: .25 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
        if (layers.high.animate) layers.high.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 900, easing: 'cubic-bezier(.65,0,.35,1)' });
      }
      markNav();
    }
    // Choose: the second half swaps the headline; on desktop each sixth of the step is another car
    var choose = $('#choose');
    if (choose) choose.classList.toggle('is-b', i === 2 && frac >= .5 && !phoneMq.matches);
    if (i === 2 && !phoneMq.matches) showFleet(ORDER[clamp(Math.floor(frac * 6), 0, 5)]);
    // the timeline fills with the scroll
    var tl = $('[data-timeline]'), links = $$('.timeline a');
    if (tl && links[i]) {
      var a = links[i].offsetTop + 9, b = links[i + 1] ? links[i + 1].offsetTop + 9 : a;
      tl.style.setProperty('--fill', (a + (b - a) * frac - 8) + 'px');
    }
    $$('.progress i').forEach(function (bar, k) { bar.style.setProperty('--f', k < i ? 1 : k === i ? frac.toFixed(3) : 0); });
    // the sun travels the arc from morning to golden hour; the moon is out at night
    var sun = $('[data-sun]');
    if (sun) {
      var x, y;
      if (i === 5) { x = 74; y = 40; } else if (i === 6) { x = 6; y = 40; }
      else {
        var p = clamp((starts[i] + frac * UNITS[i]) / starts[5], 0, 1) * .96;
        var th = Math.PI * (1 - p);
        x = 40 + 34 * Math.cos(th); y = 40 - 34 * Math.sin(th);
      }
      sun.style.setProperty('--x', x.toFixed(1) + 'px');
      sun.style.setProperty('--y', y.toFixed(1) + 'px');
      sun.classList.toggle('is-moon', i === 5);
    }
  }

  function update() {
    if (story) {
      var y = window.scrollY - story.offsetTop;
      var u = clamp(y / vh, 0, total - .001);
      var i = 0;
      for (var k = 0; k < UNITS.length; k++) if (u >= starts[k]) i = k;
      setStep(i, clamp((u - starts[i]) / UNITS[i], 0, .999));
      paint(u);
      document.body.classList.toggle('past', story.getBoundingClientRect().bottom < window.innerHeight - 2);
    }
    var foot = $('.foot');
    if (foot) document.body.classList.toggle('at-foot', foot.getBoundingClientRect().top < window.innerHeight - 40);
    markNav();
  }

  var navKey;
  function markNav() {
    var key = null;
    var cars = $('#cars'), visit = $('#visit');
    if (visit && visit.getBoundingClientRect().top < vh * .5) key = 'visit';
    else if (cars && cars.getBoundingClientRect().top < vh * .5) key = 'cars';
    else if (current >= 0) key = NAV_FOR[current];
    if (key === navKey) return;
    navKey = key;
    $$('.nav [data-nav]').forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('data-nav') === key); });
  }

  function scrollToStep(i, frac) {
    var y = story.offsetTop + (starts[i] + (frac || .06) * UNITS[i]) * vh;
    glideTo(Math.ceil(y));
  }
  function goTo(hash) {
    var idx = steps.map(function (s) { return '#' + s.id; }).indexOf(hash);
    if (idx >= 0 && story) { scrollToStep(idx, .06); return true; }
    if (hash === '#top') { glideTo(0); return true; }
    var el = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (!el) return false;
    glideTo(el.getBoundingClientRect().top + window.scrollY - (phoneMq.matches ? 64 : 92));
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-open')) return;
    closeMenu();
    if (goTo(a.getAttribute('href'))) e.preventDefault();
  });

  /* ------------------------------------------------------------ the fleet card */
  function showFleet(id) {
    if (!CARS[id]) return;
    var c = CARS[id];
    var phone = phoneMq.matches;
    if (!phone && id === fleetCar && $('[data-fleet-name]').textContent === c.name) return;
    fleetCar = id;
    var img = $(phone ? '[data-fleet-img-q]' : '[data-fleet-img]');
    if (img) { img.src = c.img; img.alt = c.name; }
    var set = function (sel, v) { var el = $(sel); if (el) el.textContent = v; };
    set('[data-fleet-name]', c.name); set('[data-fleet-name-q]', c.name);
    set('[data-fleet-price]', '$' + c.price); set('[data-fleet-price-q]', '$' + c.price);
    set('[data-fleet-cat]', c.cat);
    var specs = $('[data-fleet-specs]');
    if (specs) {
      var sp = $$('span', specs);
      sp[0].lastChild.textContent = c.seats + ' seats';
      sp[1].lastChild.textContent = c.bags + ' bags';
      sp[2].lastChild.textContent = c.gear;
    }
    var type = CAR_TYPE[id];
    $$('[data-type]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-type') === type ? 'true' : 'false'); b.classList.toggle('is-on', b.getAttribute('data-type') === type); });
    renderWa();
  }
  $$('[data-type]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = TYPE_CAR[b.getAttribute('data-type')];
      if (phoneMq.matches || !story) { showFleet(id); return; }
      // desktop: ride the scroll to that car so the big picture changes with it
      scrollToStep(2, (ORDER.indexOf(id) + .5) / 6);
    });
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
    layout();
    var s0 = current;
    if (s0 >= 0) { steps[s0].classList.remove('is-active'); current = -1; window.requestAnimationFrame(function () { window.requestAnimationFrame(update); }); }
    if (location.hash && location.hash !== '#reserve') setTimeout(function () { goTo(location.hash); }, 80);
  } else {
    window.addEventListener('scroll', update, { passive: true });
  }
  buildCal();
  showFleet(fleetCar);
  setCar('');
  renderDates();

  /* ------------------------------------------------------------ the lot */
  $$('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter');
      $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var shown = 0;
      $$('.ccard').forEach(function (c) {
        var on = f === 'all' || (' ' + c.getAttribute('data-types') + ' ').indexOf(' ' + f + ' ') >= 0;
        c.classList.toggle('is-out', !on);
        if (on) shown++;
      });
      var lot = $('[data-lot]'), empty = $('.lot-empty', lot);
      if (!shown && !empty) { empty = document.createElement('li'); empty.className = 'lot-empty'; empty.textContent = 'Nothing in this tab right now. Ask on WhatsApp and we\'ll find one.'; lot.appendChild(empty); }
      if (empty) empty.hidden = shown > 0;
    });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    [['.ccard', 60], ['.reviews li', 80]].forEach(function (g) {
      $$(g[0]).forEach(function (el, k) { el.classList.add('reveal'); el.style.transitionDelay = (k % 6) * g[1] + 'ms'; io.observe(el); });
    });
    $$('.map-pin, .points').forEach(function (el) { io.observe(el); });
  } else {
    $$('.map-pin, .points').forEach(function (el) { el.classList.add('is-in'); });
  }
  $$('.points li').forEach(function (li, k) { li.style.transitionDelay = k * 80 + 'ms'; });

  /* ------------------------------------------------------------ driver "when" choices */
  var whenOpts = [];
  for (var dd = 1; dd <= 10; dd++) [11, 15, 19].forEach(function (hh) { var d = addDays(today, dd); whenOpts.push({ v: isoDay(d) + 'T' + hh, t: shortDay(d) + ' · ' + hourText(hh), sat: d.getDay() === 6 && hh === 15 }); });
  $$('[data-driver-when]').forEach(function (s) {
    s.innerHTML = whenOpts.map(function (o) { return '<option value="' + o.v + '"' + (o.sat ? ' selected' : '') + '>' + o.t + '</option>'; }).join('');
  });
  $$('[data-occasion-quick] .chip-btn').forEach(function (b, i, all) {
    b.addEventListener('click', function () { all.forEach(function (x) { x.classList.toggle('is-on', x === b); }); });
  });
  $$('[data-where]').forEach(function (b, i, all) {
    b.addEventListener('click', function () {
      all.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    });
  });

  /* ------------------------------------------------------------ the phone menu */
  var menu = $('[data-menu]');
  var menuBtn = $('[data-open="menu"]');
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    window.setTimeout(function () { menu.hidden = true; }, 300);
  }
  if (menuBtn) menuBtn.addEventListener('click', function () {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    window.requestAnimationFrame(function () { menu.classList.add('is-open'); $('a', menu).focus(); });
  });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', closeMenu); });

  /* ------------------------------------------------------------ the reservation drawer */
  var root = $('[data-sheets]');
  if (!root) return;
  var sheet = $('[data-sheet]', root);
  var form = $('[data-form]', root);
  var done = $('[data-done]', root);
  var mode = 'rent';
  var opener = null;

  function setMode(m) {
    mode = m;
    $$('[data-only]', form).forEach(function (el) { el.hidden = el.getAttribute('data-only') !== m; });
    form.elements.age.required = m === 'rent';
    $('[data-mode-title]').textContent = m === 'driver' ? 'A car with a driver' : 'Where to?';
  }
  function setWhere(w) {
    state.where = w;
    $$('input[name="where"]', form).forEach(function (r) { r.checked = r.value === w; });
    $('[data-deliver-only]', form).hidden = w !== 'deliver';
  }
  $$('input[name="where"]', form).forEach(function (r) { r.addEventListener('change', function () { setWhere(r.value); setCar(state.car); }); });

  function progress() {
    if (!form) return;
    var o = 0, n = 0;
    var add = function (ok) { n++; if (ok) o++; };
    if (mode === 'rent') { add(!!state.car); add(true); add(form.elements.age.checked); }
    else { add(!!form.elements.address.value.trim()); add(true); }
    add(form.elements.name.value.trim().length > 1);
    add(form.elements.phone.value.replace(/\D/g, '').length >= 7);
    $('[data-fill]', form).parentNode.style.setProperty('--p', Math.round(100 * o / n) + '%');
    $('[data-fill]', form).style.width = Math.max(8, Math.round(100 * o / n)) + '%';
  }
  form.addEventListener('input', progress);
  form.addEventListener('change', progress);

  function openSheet(m, from, preset) {
    opener = from || document.activeElement;
    form.reset();
    setMode(m);
    $$('[aria-invalid]', form).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    $('[data-error]', form).textContent = '';
    renderDates();
    setCar(preset && preset.car != null ? preset.car : state.car);
    setWhere(preset && preset.where ? preset.where : (barWhere ? barWhere.value : 'lot'));
    if (preset) ['occasion', 'when', 'passengers', 'address', 'deliverAddress'].forEach(function (k) {
      if (preset[k] == null || !form.elements[k]) return;
      var el = form.elements[k];
      if (el.length && el[0].type === 'radio') $$('input[name="' + k + '"]', form).forEach(function (r) { r.checked = r.value === preset[k]; });
      else el.value = preset[k];
    });
    form.hidden = false;
    done.hidden = true;
    done.classList.remove('is-shown');
    progress();
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () {
      root.classList.add('is-open');
      $('[data-sheet-scroll]', root).scrollTop = 0;
      var focusOn = preset && preset.focus ? $('select[data-date-sel="' + preset.focus + '"]', form) : null;
      (focusOn || $('[data-mode-title]')).focus({ preventScroll: true });
    });
  }
  function closeSheet() {
    if (root.hidden) return;
    root.classList.remove('is-open');
    document.body.style.overflow = '';
    window.setTimeout(function () { root.hidden = true; }, reduceMotion ? 0 : 450);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  $$('[data-open]').forEach(function (b) {
    var m = b.getAttribute('data-open');
    if (m === 'menu') return;
    b.addEventListener('click', function (e) {
      e.preventDefault();
      closeMenu();
      var preset = {};
      if (b.hasAttribute('data-car-pick')) preset.car = b.getAttribute('data-car-pick');
      if (b.hasAttribute('data-car-from-fleet')) preset.car = fleetCar;
      if (b.hasAttribute('data-focus')) preset.focus = b.getAttribute('data-focus');
      if (m === 'driver') {
        var oc = $('[data-occasion-quick] .is-on');
        if (oc) preset.occasion = oc.textContent;
      }
      openSheet(m, b, preset);
    });
  });
  var driverCard = $('[data-driver-card]');
  if (driverCard) driverCard.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = driverCard.elements;
    var occ = $$('input[name="occasion"]', driverCard).filter(function (r) { return r.checked; })[0];
    openSheet('driver', $('button[type="submit"]', driverCard), { occasion: occ ? occ.value : 'Wedding', address: f.address.value, when: f.when.value, passengers: f.passengers.value });
  });
  var deliverCard = $('[data-deliver-card]');
  if (deliverCard) deliverCard.addEventListener('submit', function (e) {
    e.preventDefault();
    var on = $('[data-where].is-on', deliverCard);
    var w = on ? on.getAttribute('data-where') : 'deliver';
    state.whereTouched = true;
    if (barWhere) barWhere.value = w;
    openSheet('rent', $('button[type="submit"]', deliverCard), { where: w, deliverAddress: deliverCard.elements.address.value });
  });
  $$('[data-close]', root).forEach(function (b) { b.addEventListener('click', closeSheet); });

  function invalid(name, bad) {
    var el = form.elements[name];
    if (!el || el.length) return;
    if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim(), phone = form.elements.phone.value.trim();
    var problems = [];
    invalid('name', name.length < 2); invalid('phone', phone.replace(/\D/g, '').length < 7);
    if (name.length < 2) problems.push(['name', 'Add your name.']);
    if (phone.replace(/\D/g, '').length < 7) problems.push(['phone', 'Add a phone number so we can reply.']);
    if (mode === 'rent' && !form.elements.age.checked) problems.push(['age', 'Tick the age and licence box.']);
    if (mode === 'rent' && state.where === 'deliver' && !form.elements.deliverAddress.value.trim()) problems.push(['deliverAddress', 'Add the address we deliver to.']);
    $('[data-error]', form).textContent = problems.map(function (p) { return p[1]; }).join(' ');
    if (problems.length) { form.elements[problems[0][0]].focus(); return; }
    var reply = $$('input[name="reply"]', form).filter(function (r) { return r.checked; })[0].value;
    var firstName = name.split(/\s+/)[0];
    var rows;
    if (mode === 'rent') {
      rows = [['Car', state.car ? CARS[state.car].name : 'Any car'], ['Pick-up', shortDay(state.pickup) + ' · ' + timeLabel(state.pickupTime)],
        ['Return', shortDay(state.ret) + ' · ' + timeLabel(state.returnTime)],
        ['Where', state.where === 'deliver' ? 'Delivered to ' + form.elements.deliverAddress.value.trim() : 'At the lot, 88 Canal Row'], ['Reply by', reply + ' · ' + phone]];
    } else {
      var occ = $$('input[name="occasion"]', form).filter(function (r) { return r.checked; })[0].value;
      var whenSel = form.elements.when;
      rows = [['Occasion', occ], ['When', whenSel.options[whenSel.selectedIndex].text], ['Pick-up', form.elements.address.value.trim() || 'We\'ll ask you'],
        ['Passengers', form.elements.passengers.value], ['Reply by', reply + ' · ' + phone]];
    }
    $('[data-summary]', done).innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd></dd></div>'; }).join('');
    $$('[data-summary] dd', done).forEach(function (dd, k) { dd.textContent = rows[k][1]; });
    $('[data-done-title]', done).textContent = 'Request sent, ' + firstName + '.';
    $('[data-done-sub]', done).textContent = reply === 'WhatsApp' ? 'We\'ll reply on WhatsApp to confirm.' : 'We\'ll text you to confirm.';
    form.hidden = true;
    done.hidden = false;
    window.requestAnimationFrame(function () { done.classList.add('is-shown'); });
    $('[data-sheet-scroll]', root).scrollTop = 0;
    $('[data-done-title]', done).focus({ preventScroll: true });
  });

  if (location.hash === '#reserve') window.setTimeout(function () { openSheet('rent'); }, 300);

  var startY = null;
  sheet.addEventListener('touchstart', function (e) { if ($('[data-sheet-scroll]', root).scrollTop <= 0) startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', function (e) { if (startY != null && e.touches[0].clientY - startY > 90) { startY = null; closeSheet(); } }, { passive: true });
  sheet.addEventListener('touchend', function () { startY = null; });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closeSheet(); return; }
    if (root.hidden || e.key !== 'Tab') return;
    var list = $$('a[href], button:not([disabled]), input:not([type="radio"]):not([type="checkbox"]), input[type="radio"]:checked, input[type="checkbox"], select, [tabindex="-1"]', sheet)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!list.length) return;
    var a = list[0], z = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === a || !sheet.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
})();
