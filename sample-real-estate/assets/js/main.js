/* COME ON UP: the elevator walk-through, the search bar and the request sheets. No libraries. */
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
  var PHONE = '+12125550192';
  var BUSINESS = 'Stoopline';

  /* ------------------------------------------------------------ mood: ?mood=day swaps the picture set */
  if (/[?&]mood=day\b/.test(location.search)) {
    $$('img[src*="-twilight"], source[srcset*="-twilight"]').forEach(function (el) {
      if (el.src) el.src = el.getAttribute('src').replace('-twilight', '-day');
      if (el.srcset) el.srcset = el.getAttribute('srcset').replace('-twilight', '-day');
    });
  }

  /* ------------------------------------------------------------ the next four days (chips) */
  var DAYS = (function () {
    var out = [];
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    for (var i = 0; i < 4; i++) { d = new Date(d.getTime() + 864e5); out.push(d); }
    return out;
  })();
  function fmt(d, o) { return d.toLocaleDateString('en-US', o); }
  function iso(d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function dayLabel(d) { return fmt(d, { weekday: 'short' }) + ' ' + d.getDate(); }
  var pickedDay = 2;
  $$('[data-days]').forEach(function (box) {
    $$('input', box).forEach(function (input, i) { input.value = String(i); input.nextElementSibling.textContent = dayLabel(DAYS[i]); });
    $$('.chip-btn', box).forEach(function (b, i) {
      b.textContent = dayLabel(DAYS[i]);
      b.addEventListener('click', function () { pickedDay = i; $$('.chip-btn', box).forEach(function (x) { x.classList.toggle('is-on', x === b); }); });
    });
  });
  $$('[data-units-quick] .chip-btn').forEach(function (b, i, all) {
    b.addEventListener('click', function () { all.forEach(function (x) { x.classList.toggle('is-on', x === b); }); });
  });
  $$('.card .chips').forEach(function (box) { $$('.chip', box).forEach(function (c, i) { c.style.setProperty('--n', i); }); });

  /* ------------------------------------------------------------ office open now (New York time) */
  var HOURS = { 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [10, 17] };   // Sunday: by appointment
  function hourText(h) { return (h > 12 ? h - 12 : h) + (h >= 12 ? ' PM' : ' AM'); }
  function openNow() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    var now = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
    var today = HOURS[day];
    if (today && now >= today[0] && now < today[1]) return { open: true, text: 'Office open · until ' + hourText(today[1]) };
    if (today && now < today[0]) return { open: false, text: 'Office closed · opens ' + hourText(today[0]) };
    for (var k = 1; k <= 7; k++) {
      var n = (day + k) % 7;
      if (HOURS[n]) return { open: false, text: 'Office closed · opens ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][n] + ' ' + hourText(HOURS[n][0]) };
    }
    return { open: false, text: 'Call to book a time' };
  }
  try {
    var st = openNow();
    $$('[data-open-now]').forEach(function (p) { p.classList.toggle('is-closed', !st.open); $('span', p).textContent = st.text; });
  } catch (err) { /* old browser without time zones: the pill keeps its printed hours */ }

  /* ------------------------------------------------------------ word-by-word lines */
  $$('[data-words]').forEach(function (el) {
    el.innerHTML = el.textContent.split(' ').map(function (w, n) { return '<span class="w" style="--n:' + n + '">' + w + '</span>'; }).join(' ');
    el.classList.add('words');
  });

  /* ------------------------------------------------------------ the search bar */
  var bar = $('[data-bar]');
  var barMode = 'buy';
  var listMode = 'buy';
  function placePill() {
    if (!bar) return;
    var on = $('.bar-tabs button.is-on', bar);
    var pill = $('[data-bar-pill]', bar);
    if (!on || !pill) return;
    pill.style.width = on.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + on.offsetLeft + 'px)';
  }
  function setBar(mode) {
    if (!bar || mode === barMode) return;
    barMode = mode;
    $$('.bar-tabs button', bar).forEach(function (b) {
      var on = b.getAttribute('data-tab') === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var panel = mode === 'sell' ? 'sell' : mode === 'owners' ? 'owners' : 'find';
    $$('.bar-panel', bar).forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-panel') === panel); });
    if (mode === 'buy' || mode === 'rent') listMode = mode;
    placePill();
  }
  if (bar) {
    $$('.bar-tabs button', bar).forEach(function (b) { b.addEventListener('click', function () { setBar(b.getAttribute('data-tab')); }); });
    bar.addEventListener('submit', function (e) {
      e.preventDefault();
      var beds = bar.elements.beds.value;
      setList(barMode === 'rent' ? 'rent' : 'buy');
      var area = $('[data-f-area]'); if (area) area.textContent = bar.elements.area.value;
      var bedsChip = $('[data-f-beds]'); if (bedsChip) bedsChip.textContent = beds === 'Any' ? 'Any beds' : beds + (beds === 'Studio' ? '' : ' beds');
      if (!goTo('#listings')) location.href = 'index.html#listings';
    });
    window.addEventListener('resize', placePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);
    placePill();
  }

  /* listings Buy / Rent */
  function setList(mode) {
    listMode = mode;
    $$('[data-list-mode], [data-quick-mode]').forEach(function (b) {
      var on = (b.getAttribute('data-list-mode') || b.getAttribute('data-quick-mode')) === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  $$('[data-list-mode], [data-quick-mode]').forEach(function (b) {
    b.addEventListener('click', function () { setList(b.getAttribute('data-list-mode') || b.getAttribute('data-quick-mode')); markNav(); });
  });
  $$('.save').forEach(function (b) {
    b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
  });

  /* ------------------------------------------------------------ the story: seven stops, one still each */
  var story = $('[data-story]');
  function glideTo(y) {
    if (window.CalmScroll) CalmScroll.to(y);
    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  // Calm scroll (tools/calm-scroll.js): one move = one floor, a slow eased glide; the last stop opens the paper part.
  if (window.CalmScroll && story) CalmScroll.story(function () {
    var top = story.offsetTop, s = [top];
    for (var i = 1; i < 7; i++) s.push(top + (i + 0.08) * PER * vh);
    var after = paper ? paper.getBoundingClientRect().top + window.scrollY : top + story.offsetHeight;
    s.push(after - (phoneMq.matches ? 70 : 92));
    return s;
  });
  var stills = $$('[data-still]');
  var steps = $$('.step');
  var current = -1;
  var vh = window.innerHeight;
  var PER = 1;
  var ROOMS = ['Midtown · The view', 'Living room', 'Hall · Front door', 'Kitchen', 'Bathroom', 'Bedroom 2', 'Bedroom 1'];
  var FLOORS = ['L', '2', '3', '4', '5', '6', 'PH'];
  var NAMES = ['Lobby', 'Listings', 'Viewings', 'Sellers', 'Owners', 'Mortgage', 'Talk to us'];
  var NAV_FOR = [null, 'buy', null, 'sell', 'owners', 'mortgage', 'about'];
  var PUSH = [0, .015, .02, .015, .02, .015, .015];
  var INTO = [null, 'zoom', 'side', 'door', 'door', 'rack', 'sideBack'];
  function fx(name) {
    var phone = phoneMq.matches;
    var side = phone ? '8%' : '6%';
    var blur = saveData ? 0 : 1;
    var F = {
      zoom: { ms: phone ? 700 : 900,
        out: [{ transform: 'scale(1)', filter: 'blur(0px)', opacity: 1 }, { transform: 'scale(' + (phone ? 1.3 : 1.35) + ')', filter: 'blur(' + (16 * blur) + 'px)', opacity: 0 }],
        in: [{ transform: 'scale(' + (phone ? 1.08 : 1.1) + ')', filter: 'blur(' + ((phone ? 12 : 16) * blur) + 'px)', opacity: 0 }, { transform: 'scale(1)', filter: 'blur(0px)', opacity: 1 }] },
      side: { ms: phone ? 550 : 700,
        out: [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-' + side + ')', opacity: 0 }],
        in: [{ transform: 'translateX(' + side + ')', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }] },
      sideBack: { ms: phone ? 550 : 700,
        out: [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + side + ')', opacity: 0 }],
        in: [{ transform: 'translateX(-' + side + ')', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }] },
      door: { ms: phone ? 450 : 650,
        out: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.06)', opacity: 0 }],
        in: [{ transform: 'scale(' + (phone ? 1.06 : 1.08) + ')', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }] },
      rack: { ms: phone ? 500 : 600,
        out: [{ filter: 'blur(0px)', opacity: 1 }, { filter: 'blur(' + ((phone ? 12 : 18) * blur) + 'px)', opacity: 0 }],
        in: [{ filter: 'blur(' + ((phone ? 12 : 18) * blur) + 'px)', opacity: 0 }, { filter: 'blur(0px)', opacity: 1 }] },
      fade: { ms: reduceMotion ? 150 : 350, out: [{ opacity: 1 }, { opacity: 0 }], in: [{ opacity: 0 }, { opacity: 1 }] }
    };
    return F[reduceMotion ? 'fade' : name] || F.fade;
  }

  function markNear(list) {
    stills.forEach(function (s, k) { s.classList.toggle('is-near', list.indexOf(k) >= 0); });
  }

  function moveStills(from, to) {
    var a = stills[from], b = stills[to];
    stills.forEach(function (s) { s.getAnimations && s.getAnimations().forEach(function (an) { an.cancel(); }); s.style.zIndex = ''; });
    markNear([from, to, to - 1, to + 1]);
    stills.forEach(function (s, k) { s.classList.toggle('is-active', k === to); });
    if (!a || !b || !b.animate) { markNear([to - 1, to, to + 1]); return; }
    var forward = to > from;
    var name = Math.abs(to - from) > 1 ? 'fade' : INTO[forward ? to : from];
    var f = fx(name);
    var opts = { duration: f.ms, easing: name === 'zoom' || name === 'side' || name === 'sideBack' || name === 'door' || name === 'rack' ? INOUT : 'ease' };
    b.style.zIndex = 2;
    a.style.zIndex = 1;
    var anim;
    if (forward) {
      a.animate(f.out, opts);
      anim = b.animate(f.in, opts);
    } else {
      a.animate(f.in, Object.assign({ direction: 'reverse' }, opts));
      anim = b.animate(f.out, Object.assign({ direction: 'reverse' }, opts));
    }
    anim.onfinish = function () { a.style.zIndex = ''; b.style.zIndex = ''; if (current === to) markNear([to - 1, to, to + 1]); };
  }

  function roll(box, text, up) {
    var old = $('b', box);
    if (old && old.textContent === text) return;
    var nu = document.createElement('b');
    nu.textContent = text;
    box.appendChild(nu);
    if (!old || reduceMotion || !nu.animate) { if (old) old.remove(); return; }
    old.style.position = 'absolute';
    old.style.left = '0';
    old.style.top = '0';
    old.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (up ? '-100%' : '100%') + ')', opacity: 0 }], { duration: 320, easing: OUT }).onfinish = function () { old.remove(); };
    nu.animate([{ transform: 'translateY(' + (up ? '100%' : '-100%') + ')' }, { transform: 'translateY(0)' }], { duration: 320, easing: OUT });
  }

  function setStep(i) {
    if (i === current) return;
    var from = current;
    var up = i > from;
    current = i;
    steps.forEach(function (s, k) {
      s.classList.toggle('is-leaving', k === from);
      s.classList.toggle('is-active', k === i);
    });
    if (from >= 0) moveStills(from, i);
    $$('.lift-list a').forEach(function (a, k) {
      a.classList.toggle('is-on', k === i);
      if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    var lift = $('.lift');
    if (lift && from >= 0) {
      lift.classList.toggle('is-down', !up);
      roll($('[data-lift-num]'), FLOORS[i], up);
      $('[data-lift-name]').textContent = NAMES[i];
      $('[data-lift-dir]').textContent = up ? 'Going up' : 'Going down';
      if (i === 6 && !reduceMotion) $('[data-lift-num]').animate([{ textShadow: '0 0 0 rgba(240,164,60,0)' }, { textShadow: '0 0 18px rgba(240,164,60,.95)' }, { textShadow: '0 0 8px rgba(240,164,60,.55)' }], { duration: 600, easing: OUT });
    }
    var fn = $('[data-floor-num]');
    if (fn) { fn.textContent = FLOORS[i]; $('[data-floor-name]').textContent = NAMES[i]; }
    $$('.floors-row i').forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
    var room = $('[data-room-text]');
    if (room && room.textContent !== ROOMS[i]) {
      room.textContent = ROOMS[i];
      if (!reduceMotion && room.parentNode.animate) room.parentNode.animate([{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: OUT });
    }
    if (bar && !bar.contains(document.activeElement)) setBar(i === 3 ? 'sell' : i === 4 ? 'owners' : listMode);
    markNav();
  }

  function layout() {
    if (!story) return;
    vh = window.innerHeight;
    PER = phoneMq.matches ? 0.8 : 1;
    story.style.height = Math.round((7 * PER + 1) * vh) + 'px';
    update();
  }

  var onPaper = false;
  var paper = $('[data-paper]');
  function update() {
    if (story) {
      var y = window.scrollY - story.offsetTop;
      var u = clamp(y / (PER * vh), 0, 6.999);
      var i = Math.floor(u);
      setStep(i);
      var push = $('.still-push', stills[i]);
      if (push && !reduceMotion) push.style.setProperty('--push', (1 + (u - i) * PUSH[i]).toFixed(4));
    }
    var paperTop = paper ? paper.getBoundingClientRect().top : Infinity;
    document.body.classList.toggle('bar-on-paper', paperTop < vh - 110 || !story);
    var paperNow = paperTop < 92;
    if (paperNow !== onPaper) { onPaper = paperNow; document.body.classList.toggle('on-paper', onPaper); markNav(); }
    else if (onPaper) markNav();
  }

  var navSection = null;
  function markNav() {
    var key = null;
    if (onPaper) {
      var team = $('#team');
      key = team && team.getBoundingClientRect().top < vh * 0.5 ? 'about' : listMode;
    } else if (story && current >= 0) key = NAV_FOR[current];
    if (key === navSection) return;
    navSection = key;
    $$('.nav [data-nav]').forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('data-nav') === key); });
  }

  function scrollToStep(i) {
    if (!story) return;
    var y = story.offsetTop + (i + 0.08) * PER * vh;
    glideTo(Math.ceil(y));
  }
  function goTo(hash) {
    var stepIdx = steps.map(function (s) { return '#' + s.id; }).indexOf(hash);
    if (stepIdx >= 0) { scrollToStep(stepIdx); return true; }
    if (hash === '#top') { glideTo(0); return true; }
    var el = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (!el) return false;
    var top = el.getBoundingClientRect().top + window.scrollY - (phoneMq.matches ? 70 : 92);
    glideTo(top);
    return true;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-open')) return;
    var mode = a.getAttribute('data-mode');
    if (mode) setList(mode);
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
    steps[0].classList.remove('is-active');
    layout();
    if (current === 0) { current = -1; window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { setStep(0); }); }); }
    if (location.hash) setTimeout(function () { goTo(location.hash); }, 80);
  } else {
    window.addEventListener('scroll', function () { markNav(); }, { passive: true });
  }

  /* ------------------------------------------------------------ the paper part: things arrive as they come into view */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    [['.lcard', 60], ['.agent-card', 80], ['.reviews li', 80], ['.hoods li', 70]].forEach(function (g) {
      $$(g[0]).forEach(function (el, k) { el.classList.add('reveal'); el.style.transitionDelay = ((k % 6) * g[1]) + 'ms'; io.observe(el); });
    });
    $$('.office-pin, .points').forEach(function (el) { io.observe(el); });
  } else {
    $$('.office-pin, .points').forEach(function (el) { el.classList.add('is-in'); });
  }
  $$('.points li').forEach(function (li, k) { li.style.transitionDelay = (k * 90) + 'ms'; });

  /* ------------------------------------------------------------ request sheets */
  var root = $('[data-sheets]');
  if (!root) return;
  var sheet = $('[data-sheet]', root);
  var opener = null;
  var openKind = null;
  var THANKS = {
    value: 'An agent will get back to you with a price range based on nearby sales.',
    proposal: 'We\'ll look at the building and send you a written proposal.',
    mortgage: 'A mortgage broker will call you to go through it.',
    question: 'The agent for this listing will get back to you.'
  };

  function formOf(kind) { return $('[data-form="' + kind + '"]', root); }
  function showOnly(el) {
    $$('.sheet-form, .sheet-done', root).forEach(function (x) { x.hidden = x !== el; x.classList.remove('is-shown'); });
    if (el) window.requestAnimationFrame(function () { el.classList.add('is-shown'); });
  }
  function pick(form, name, value) {
    $$('input[name="' + name + '"]', form).forEach(function (r) { r.checked = r.value === value; });
  }

  function openSheet(kind, from, preset) {
    var form = formOf(kind);
    if (!form) return;
    opener = from || document.activeElement;
    openKind = kind;
    form.reset();
    $$('[aria-invalid]', form).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    var err = $('[data-error]', form); if (err) err.textContent = '';
    if (form.elements.day && form.elements.day.length) form.elements.day[pickedDay].checked = true;
    if (preset) Object.keys(preset).forEach(function (k) {
      var el = form.elements[k];
      if (!el || preset[k] == null) return;
      if (el.length && el[0] && el[0].type === 'radio') pick(form, k, String(preset[k])); else el.value = preset[k];
    });
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
    window.setTimeout(function () { root.hidden = true; }, reduceMotion ? 0 : 400);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  function read(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = String(v).trim(); });
    return o;
  }
  function invalid(form, name, bad) {
    var el = form.elements[name];
    if (!el || el.length) return;
    if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function check(form, o, kind) {
    var problems = [];
    if (kind === 'alerts') {
      var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email || '');
      invalid(form, 'email', !okMail);
      if (!okMail) problems.push(['email', 'Add an email so we can send new listings.']);
    } else {
      var okName = (o.name || '').length >= 2;
      var okPhone = (o.mobile || '').replace(/\D/g, '').length >= 7;
      var okMail2 = !o.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email);
      invalid(form, 'name', !okName);
      invalid(form, 'mobile', !okPhone);
      invalid(form, 'email', !okMail2);
      if (!okName) problems.push(['name', 'Add your name.']);
      if (!okPhone) problems.push(['mobile', 'Add a mobile number so we can text you.']);
      if (!okMail2) problems.push(['email', 'That email doesn\'t look right.']);
    }
    var err = $('[data-error]', form);
    if (err) err.textContent = problems.map(function (p) { return p[1]; }).join(' ');
    if (problems.length) { form.elements[problems[0][0]].focus(); return false; }
    return true;
  }

  function first(o) { return (o.name || '').split(/\s+/)[0] || ''; }
  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var booked = null;
  function done(kind, o) {
    if (kind === 'viewing') {
      var d = DAYS[Number(o.day) || 0];
      booked = { day: d, time: o.time, how: o.how };
      var box = $('[data-done="viewing"]', root);
      $('[data-done-title]', box).innerHTML = 'See you there, ' + esc(first(o)) + '.';
      $('[data-sum-when]', box).textContent = fmt(d, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + o.time;
      $('[data-sum-how]', box).textContent = o.how === 'video' ? 'Video tour, we send you a link' : 'In person, at the door';
      showOnly(box);
      $('[data-done-title]', box).focus({ preventScroll: true });
      return;
    }
    var thanks = $('[data-done="thanks"]', root);
    $('[data-thanks-title]', thanks).textContent = kind === 'alerts' ? 'You\'re on the list.' : 'Thanks, ' + first(o) + '.';
    $('[data-thanks-text]', thanks).textContent = kind === 'alerts' ? 'New ' + (o.mode === 'Rent' ? 'rentals' : 'homes for sale') + ' go to ' + o.email + ' the day they go up.' : THANKS[kind];
    showOnly(thanks);
    $('[data-thanks-title]', thanks).focus({ preventScroll: true });
  }

  $$('.sheet-form', root).forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = form.getAttribute('data-form');
      var o = read(form);
      if (!check(form, o, kind)) return;
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      window.setTimeout(function () { btn.disabled = false; done(kind, o); }, reduceMotion ? 0 : 600);
    });
  });

  var icsBtn = $('[data-ics]', root);
  if (icsBtn) icsBtn.addEventListener('click', function () {
    if (!booked) return;
    var m = /(\d+):(\d+)\s*(AM|PM)/.exec(booked.time) || [0, 11, 0, 'AM'];
    var h = Number(m[1]) % 12 + (m[3] === 'PM' ? 12 : 0);
    var start = iso(booked.day) + 'T' + ('0' + h).slice(-2) + m[2] + '00';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + BUSINESS + '//Viewing//EN', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@sample', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;TZID=America/New_York:' + start, 'DURATION:PT30M', 'SUMMARY:Viewing with ' + BUSINESS,
      'LOCATION:' + (viewingAt || 'E 36th St, Apt 4F') + ', New York, NY', 'DESCRIPTION:' + (booked.how === 'video' ? 'Video tour' : 'In person') + '. Need to change it? Call ' + PHONE, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'viewing.ics';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  var listingCards = $$('.lcard [data-listing-addr]');
  var viewingAt = null;
  function setListing(src) {
    if (!src || !src.getAttribute('data-listing-addr')) return;
    var img = src.getAttribute('data-listing-img'), addr = src.getAttribute('data-listing-addr'), meta = src.getAttribute('data-listing-meta');
    viewingAt = addr;
    $$('[data-box-img]').forEach(function (el) { el.src = img; });
    $$('[data-box-addr]').forEach(function (el) { el.textContent = addr; });
    $$('[data-box-meta]').forEach(function (el) { el.textContent = meta; });
    $$('[data-sum-where]').forEach(function (el) { el.textContent = addr; });
  }
  var pickSel = $('[data-pick]');
  if (pickSel) pickSel.addEventListener('change', function () {
    var src = listingCards[Number(pickSel.value)];
    if (src) $('[data-pick-img]').src = src.getAttribute('data-listing-img');
  });

  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var kind = b.getAttribute('data-open');
      var preset = null;
      if (kind === 'viewing') setListing(b);
      if (kind === 'value' && bar && bar.elements.home && bar.elements.home.value) preset = { address: bar.elements.home.value };
      if (kind === 'proposal') {
        var units = $('[data-units-quick] .is-on');
        preset = { building: bar && bar.elements.building ? bar.elements.building.value : '', units: units ? units.textContent : (bar && bar.elements.units ? bar.elements.units.value.replace(/\s/g, '') : null) };
      }
      openSheet(kind, b, preset);
    });
  });

  /* the step cards hand their choices to the full sheet */
  var cardFor = { '[data-viewing-card]': 'viewing', '[data-value-card]': 'value', '[data-proposal-card]': 'proposal', '[data-mortgage-card]': 'mortgage' };
  Object.keys(cardFor).forEach(function (sel) {
    var card = $(sel);
    if (!card) return;
    card.addEventListener('submit', function (e) {
      e.preventDefault();
      var o = read(card);
      if (o.day != null) pickedDay = Number(o.day);
      if (o.listing != null) setListing(listingCards[Number(o.listing)]);
      openSheet(cardFor[sel], $('button[type="submit"]', card), o);
    });
  });

  $$('[data-close]', root).forEach(function (b) { b.addEventListener('click', closeSheet); });

  /* drag the phone sheet down to close it */
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

  /* listing page: photos and floor plan open full screen */
  var box = $('[data-lightbox]');
  if (box) {
    var boxOpener = null;
    var shut = function () { box.classList.remove('is-open'); window.setTimeout(function () { box.hidden = true; }, 250); if (boxOpener) boxOpener.focus(); };
    $$('[data-light]').forEach(function (b) {
      b.addEventListener('click', function () {
        boxOpener = b;
        var want = b.getAttribute('data-light');
        $$('[data-lb]', box).forEach(function (el) { el.hidden = el.getAttribute('data-lb') !== want; });
        box.hidden = false;
        window.requestAnimationFrame(function () { box.classList.add('is-open'); $('.close', box).focus(); });
      });
    });
    $$('[data-light-close]', box).forEach(function (b) { b.addEventListener('click', shut); });
    document.addEventListener('keydown', function (e) { if (!box.hidden && e.key === 'Escape') shut(); });
  }
})();
