/* Sample-site engine: the story on scroll (one stop per step, calm-scroll.js), the sheets, the forms, open now.
   No libraries. Reads its settings from <script id="cfg">. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfgEl = $('#cfg');
  var cfg = cfgEl ? JSON.parse(cfgEl.textContent) : {};
  var phoneMq = window.matchMedia(cfg.phone || '(max-width: 900px)');
  var state = {};

  /* ------------------------------------------------------------ time in the shop's city */
  function nowThere() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: cfg.tz || 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
        .formatToParts(new Date());
      var get = function (t) { var x = p.filter(function (q) { return q.type === t; })[0]; return x ? x.value : ''; };
      var wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
      return { day: wd, h: Number(get('hour')) % 24, m: Number(get('minute')) };
    } catch (e) { var d = new Date(); return { day: (d.getDay() + 6) % 7, h: d.getHours(), m: d.getMinutes() }; }
  }
  function clockText(v) {
    var h = Math.floor(v) % 24, m = Math.round((v - Math.floor(v)) * 60);
    return (h % 12 || 12) + (m ? ':' + ('0' + m).slice(-2) : '') + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  var DAYNAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  function openNow() {
    var H = cfg.hours;
    if (!H) return;
    var n = nowThere(), t = n.h + n.m / 60, today = H[n.day], yest = H[(n.day + 6) % 7], text, open = false;
    if (yest && yest[1] > 24 && t < yest[1] - 24) { open = true; text = 'Open now · until ' + clockText(yest[1] - 24); }   // still last night's late hours
    else if (today && t >= today[0] && t < today[1]) { open = true; text = 'Open now · until ' + clockText(today[1]); }
    else if (today && t < today[0]) text = 'Closed now · opens ' + clockText(today[0]);
    else {
      for (var k = 1; k <= 7; k++) {
        var d = (n.day + k) % 7;
        if (H[d]) { text = 'Closed now · opens ' + (k === 1 ? 'tomorrow ' : DAYNAME[d] + ' ') + clockText(H[d][0]); break; }
      }
    }
    $$('[data-open]').forEach(function (p) { p.classList.toggle('is-closed', !open); $('span', p).textContent = text || ''; });
    $$('[data-hours] li').forEach(function (li) {
      li.classList.toggle('is-today', (li.getAttribute('data-days') || '').split(',').indexOf(String(n.day)) >= 0);
    });
  }

  /* ------------------------------------------------------------ day chips: the next open days, from the real date */
  function drawDays() {
    var H = cfg.hours;
    if (!H) return;
    $$('.chips[data-days]').forEach(function (g) {
      var n = Number(g.getAttribute('data-days')), other = g.getAttribute('data-other'), out = [];
      var d = new Date();
      d.setHours(12, 0, 0, 0);
      for (var guard = 0; out.length < n && guard < 21; guard++) {
        d.setDate(d.getDate() + 1);
        if (H[(d.getDay() + 6) % 7]) out.push(new Date(d.getTime()));
      }
      var html = out.map(function (x, i) {
        var label = x.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + x.getDate();
        var value = x.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return '<button type="button" class="chip" role="radio" aria-checked="' + (i ? 'false' : 'true') + '" data-value="' + value + '">' + label + '</button>';
      }).join('');
      if (other) html += '<button type="button" class="chip" role="radio" aria-checked="false" data-value="' + other + '">' + other + '</button>';
      g.innerHTML = html;
    });
  }

  /* ------------------------------------------------------------ chips and the bar's selects share one state */
  function setState(name, value, from) {
    state[name] = value;
    $$('.chips[data-group="' + name + '"]').forEach(function (g) {
      if (g === from) return;
      var hit = $$('.chip', g).filter(function (c) { return c.getAttribute('data-value') === value; })[0];
      if (hit) $$('.chip', g).forEach(function (c) { c.setAttribute('aria-checked', c === hit ? 'true' : 'false'); });
    });
    $$('select[data-bind="' + name + '"]').forEach(function (s) {
      if (s !== from && $$('option', s).some(function (o) { return o.value === value; })) s.value = value;
    });
  }
  function initChips() {
    $$('.chips[data-group]').forEach(function (g) {
      var name = g.getAttribute('data-group');
      var on = $('.chip[aria-checked="true"]', g);
      if (on && state[name] === undefined) state[name] = on.getAttribute('data-value');
      $$('.chip', g).forEach(function (c) { c.tabIndex = c.getAttribute('aria-checked') === 'true' ? 0 : -1; });
    });
    $$('select[data-bind]').forEach(function (s) {
      var name = s.getAttribute('data-bind');
      if (state[name] !== undefined) setState(name, state[name]); else state[name] = s.value;
      s.addEventListener('change', function () { setState(name, s.value, s); });
    });
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('.chips[data-group] .chip');
    if (!c) return;
    var g = c.parentNode;
    $$('.chip', g).forEach(function (x) { x.setAttribute('aria-checked', x === c ? 'true' : 'false'); x.tabIndex = x === c ? 0 : -1; });
    setState(g.getAttribute('data-group'), c.getAttribute('data-value'), g);
  });
  // capture phase: arrows on a chip move the choice, before calm-scroll can read them as "next step"
  window.addEventListener('keydown', function (e) {
    var c = e.target.closest && e.target.closest('.chips[data-group] .chip');
    if (!c || ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
    var all = $$('.chip', c.parentNode), i = all.indexOf(c), dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    var next = all[(i + dir + all.length) % all.length];
    e.preventDefault();
    next.focus();
    next.click();
  }, true);

  /* ------------------------------------------------------------ sheets */
  var openSheet = null, opener = null;
  function focusables(el) {
    return $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', el).filter(function (x) { return x.offsetParent !== null; });
  }
  function showSheet(id, from, opts) {
    var w = $('[data-sheet-wrap="' + id + '"]');
    if (!w) return;
    if (openSheet && openSheet !== w) closeSheet(true);
    opener = from || document.activeElement;
    var form = $('form[data-form]', w), sent = $('.sent', w);
    if (form && sent) { form.hidden = false; sent.hidden = true; sent.classList.remove('is-in'); form.classList.remove('is-sending'); }
    w.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    void w.offsetWidth;
    w.classList.add('is-open');
    w.classList.remove('is-closing');
    openSheet = w;
    var bar = $('[data-bar]');
    if (bar) bar.classList.add('is-away');
    var f = $('[data-filter]', w);
    if (f) {
      f.value = (opts && opts.q) || '';
      filterList(w);
      setTimeout(function () { f.focus(); }, 60);
    } else setTimeout(function () { var x = $('.sheet', w); (focusables(x)[1] || x).focus(); }, 60);
  }
  function closeSheet(now) {
    var w = openSheet;
    if (!w) return;
    openSheet = null;
    w.classList.remove('is-open');
    w.classList.add('is-closing');
    var done = function () { w.hidden = true; w.classList.remove('is-closing'); };
    if (now || reduce) done(); else setTimeout(done, 360);
    document.documentElement.style.overflow = '';
    syncBar();
    if (opener && opener.focus && !now) opener.focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sheet]');
    if (t) {
      e.preventDefault();
      if (t.hasAttribute('data-preset')) setState('visit', t.getAttribute('data-preset'));
      showSheet(t.getAttribute('data-sheet'), t);
      return;
    }
    if (e.target.closest('[data-close]') && openSheet) { e.preventDefault(); closeSheet(); }
  });
  document.addEventListener('keydown', function (e) {
    if (!openSheet) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables($('.sheet', openSheet));
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  $$('form[data-search]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); showSheet(f.getAttribute('data-search'), f, { q: $('input', f).value }); });
  });

  /* the list sheet: filter as you type, the first match on top */
  function filterList(w) {
    var inp = $('[data-filter]', w);
    if (!inp) return;
    var q = inp.value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean), first = null, any = false;
    $$('[data-list] li', w).forEach(function (li) {
      var keys = li.getAttribute('data-keys') || '';
      var hit = !words.length || words.every(function (wd) { return keys.split(' ').some(function (k) { return k.indexOf(wd) === 0; }) || keys.indexOf(wd) >= 0; });
      li.hidden = !hit;
      li.classList.toggle('is-hit', hit && words.length > 0);
      if (hit) { any = true; if (!first && words.length) first = li; }
    });
    var m = $('[data-match]', w);
    if (m) {
      m.hidden = !first;
      if (first) {
        $('b', m).textContent = $('b', m).getAttribute('data-tpl').replace('[for]', first.getAttribute('data-for'));
        $('[data-match-name]', m).textContent = first.getAttribute('data-name');
      }
    }
    var em = $('[data-empty]', w);
    if (em) em.hidden = any;
  }
  $$('[data-filter]').forEach(function (inp) {
    inp.addEventListener('input', function () { filterList(inp.closest('[data-sheet-wrap]')); });
  });

  /* the request forms: check, a short send, then the sent state filled from what was typed */
  function fill(tpl, vals) {
    var s = (tpl || '').replace(/\[([a-z_]+)\]/g, function (_, k) { return vals[k] || ''; });
    return s.split(' · ').map(function (x) { return x.trim(); }).filter(Boolean).join(' · ').replace(/,\s*\./, '.').replace(/\s+\./, '.');
  }
  $$('form[data-form]').forEach(function (form) {
    form.addEventListener('input', function (e) {
      var l = e.target.closest('.input');
      if (l) l.classList.remove('is-bad');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('input[required]', form).filter(function (i) { return !i.value.trim(); });
      bad.forEach(function (i) { i.closest('.input').classList.add('is-bad'); });
      var err = $('.form-err', form);
      if (err) err.hidden = !bad.length;
      if (bad.length) { bad[0].focus(); return; }
      var vals = {};
      Object.keys(state).forEach(function (k) { vals[k] = state[k]; });
      $$('.chips[data-group]', form).forEach(function (g) { var c = $('.chip[aria-checked="true"]', g); if (c) vals[g.getAttribute('data-group')] = c.getAttribute('data-value'); });
      $$('input[name]', form).forEach(function (i) {
        vals[i.name] = i.type === 'file' ? (i.files && i.files.length ? i.files.length + ' file' + (i.files.length > 1 ? 's' : '') + ' added' : (i.getAttribute('data-none') || 'Bring them with you')) : i.value.trim();
      });
      vals.first = (vals.name || '').split(/\s+/)[0] || '';
      form.classList.add('is-sending');
      setTimeout(function () {
        var sent = form.parentNode.querySelector('.sent');
        $$('[data-tpl]', sent).forEach(function (el) { el.textContent = fill(el.getAttribute('data-tpl'), vals); });
        $$('.sum > div', sent).forEach(function (row) { row.hidden = !$('dd', row).textContent; });
        form.hidden = true;
        sent.hidden = false;
        void sent.offsetWidth;
        sent.classList.add('is-in');
        sent.focus();
      }, reduce ? 0 : 600);
    });
  });

  /* ------------------------------------------------------------ FAQ, reveals */
  $$('.qa button').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.closest('.qa').classList.toggle('is-open', open);
    });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, sib = $$('.reveal, .ocard', el.parentNode);
        el.style.transitionDelay = Math.min(5, Math.max(0, sib.indexOf(el))) * 70 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal, .ocard').forEach(function (el) { io.observe(el); });
  } else $$('.reveal, .ocard').forEach(function (el) { el.classList.add('is-in'); });

  /* ------------------------------------------------------------ the age check (only designs with a "gate") */
  var gateEl = $('[data-gate]');
  if (gateEl) {
    var key = 'gate:' + location.pathname.replace(/[^a-z0-9]+/gi, '-'), days = Number(gateEl.getAttribute('data-days')) || 30, ok = 0;
    try { ok = Number(localStorage.getItem(key)) || 0; } catch (e) { ok = 0; }
    if (Date.now() - ok > days * 864e5) {
      gateEl.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      setTimeout(function () { var y = $('[data-gate-yes]', gateEl); if (y) y.focus(); }, 50);
    }
    gateEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-gate-yes]')) {
        try { localStorage.setItem(key, String(Date.now())); } catch (er) { /* private mode: asks again next visit */ }
        gateEl.classList.add('is-gone');
        document.documentElement.style.overflow = '';
        setTimeout(function () { gateEl.hidden = true; }, reduce ? 0 : 400);
      } else if (e.target.closest('[data-gate-no]')) {
        $('[data-gate-msg]', gateEl).hidden = false;
      }
    });
  }

  /* for a site's own extra.js: the state, the sheets, and a "sample:step" event on every step change */
  window.SampleSite = { cfg: cfg, state: state, setState: setState, showSheet: showSheet, closeSheet: closeSheet };

  openNow();
  drawDays();
  initChips();
  setInterval(openNow, 60000);

  /* ------------------------------------------------------------ the story */
  var story = $('[data-story]');
  var nav = $('[data-nav]');
  var bar = $('[data-bar]');
  function navH() { return phoneMq.matches ? 58 : (nav ? nav.offsetHeight : 90); }
  function glideTo(y) {
    if (window.CalmScroll) CalmScroll.to(y);
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  function syncBar() {
    if (!bar || openSheet) return;
    var f = $('.foot');
    bar.classList.toggle('is-away', !!(f && f.getBoundingClientRect().top < window.innerHeight - 40));
  }
  if (!story) {
    window.addEventListener('scroll', syncBar, { passive: true });
    return;
  }

  var steps = $$('.step', story), layers = $$('.layer', story), N = steps.length;
  var lis = $$('.steplist li', story), pbs = $$('.ptrack .pb', story);
  var hanger = $('.hanger', story);
  var vh = window.innerHeight, unit = 1, current = -1;
  layers.forEach(function (l, i) { var d = cfg.steps[i] && cfg.steps[i].drift; if (d) l.setAttribute('data-drift', d.scale ? 'scale' : 'x'); });

  function size() {
    vh = window.innerHeight;
    unit = phoneMq.matches ? cfg.units.phone : cfg.units.desk;
    story.style.setProperty('--story-h', Math.round(((N - 1) * unit + 1) * vh) + 'px');
  }
  function stopOf(i) { return story.offsetTop + i * unit * vh; }
  if (window.CalmScroll) CalmScroll.story(function () {
    var s = [];
    for (var i = 0; i < N; i++) s.push(stopOf(i));
    return s;
  });

  function setStep(i) {
    if (i === current) return;
    var prev = current;
    current = i;
    story.setAttribute('data-step', String(i));
    layers.forEach(function (l, j) {
      l.classList.remove('is-out');
      if (j === i) l.classList.add('is-on');
      else if (j === prev && i > prev) { l.classList.remove('is-on'); l.classList.add('is-out'); l.setAttribute('data-out', cfg.steps[i].cut); }
      else l.classList.remove('is-on');
    });
    steps.forEach(function (s, j) { s.classList.toggle('is-on', j === i); s.classList.toggle('is-past', j < i); });
    lis.forEach(function (li, j) {
      li.classList.toggle('is-done', j < i);
      li.classList.toggle('is-now', j === i);
      var a = $('a', li);
      if (j === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    pbs.forEach(function (b, j) { b.classList.toggle('is-done', j < i); b.classList.toggle('is-now', j === i); });
    var st = cfg.steps[i];
    var prog = $('.sl-prog', story);
    if (prog) prog.textContent = prog.getAttribute('data-prog').replace('[n]', i + 1).replace('[name]', st.name);
    var pn = $('[data-pnum]', story), pname = $('[data-pname]', story);
    if (pn) pn.textContent = (i + 1) + '/' + N;
    if (pname) pname.textContent = st.name;
    $$('.links a').forEach(function (a) { a.classList.toggle('is-here', !!st.nav && a.getAttribute('data-nav-for') === st.nav); });
    if (bar) {
      $$('[data-glow]', bar).forEach(function (b) { b.classList.toggle('is-tint', b.getAttribute('data-glow') === st.id); });
      var go = $('.bar-go', bar);
      if (go && i === 1 && prev === 0) { go.classList.remove('is-glow'); void go.offsetWidth; go.classList.add('is-glow'); }
    }
    $$('.tab[data-pulse]').forEach(function (t) {
      if (t.getAttribute('data-pulse') === st.id) { t.classList.remove('is-pulse'); void t.offsetWidth; t.classList.add('is-pulse'); }
    });
    if (hanger && (i === N - 1 || prev === -1)) { hanger.classList.remove('swing'); void hanger.offsetWidth; hanger.classList.add('swing'); }
    if (cfg.clock === i) sweepClock(); else stopClock();
    try { document.dispatchEvent(new CustomEvent('sample:step', { detail: { i: i, prev: prev, id: st.id } })); } catch (e) { /* old browser */ }
  }

  /* the door sequence: frames drawn on a canvas while you scroll from step 1 to step 2 */
  var seq = cfg.seq, canvas = $('[data-seq]', story), frames = { desk: [], phone: [] }, ready = { desk: 0, phone: 0 };
  var saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
  function loadSeq(kind) {
    if (!seq || !canvas || reduce || saveData || frames[kind].length) return;
    seq[kind].forEach(function (src, i) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { ready[kind]++; };
      im.src = src;
      frames[kind][i] = im;
    });
  }
  function drawSeq(p) {
    if (!seq || !canvas) return;
    var kind = phoneMq.matches ? 'phone' : 'desk', list = frames[kind];
    var a = seq.step - 1, t = p - a;
    if (!list.length || ready[kind] < list.length || t <= 0.001 || t >= 0.999) { canvas.classList.remove('is-on'); return; }
    var im = list[Math.round(clamp(t, 0, 1) * (list.length - 1))];
    var dpr = Math.min(1.5, window.devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    var ctx = canvas.getContext('2d'), s = Math.max(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight);
    var w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    canvas.classList.add('is-on');
  }

  /* the wall clock: live hands, a sweep from 8 to 8 when the step lands, then the real time */
  var clockRaf = 0, clockTimer = 0;
  function setHands(hours) {
    $$('.clock', story).forEach(function (svg) {
      var hh = $('.hh', svg), mh = $('.mh', svg);
      hh.setAttribute('transform', 'rotate(' + ((hours % 12) * 30).toFixed(2) + ')');
      mh.setAttribute('transform', 'rotate(' + (((hours * 60) % 60) * 6).toFixed(2) + ')');
    });
  }
  function realHours() { var n = nowThere(); return n.h + n.m / 60; }
  function sweepClock() {
    stopClock();
    var real = realHours();
    if (reduce) { setHands(real); return; }
    var t0 = performance.now(), from = 8, to = 20 + ((real - 8 + 24) % 12);
    (function tick(now) {
      var t = clamp((now - t0) / 1800, 0, 1), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setHands(from + (to - from) * e);
      if (t < 1) clockRaf = requestAnimationFrame(tick);
      else clockTimer = setInterval(function () { setHands(realHours()); }, 30000);
    })(t0);
  }
  function stopClock() { cancelAnimationFrame(clockRaf); clearInterval(clockTimer); }
  if (cfg.clock !== null && cfg.clock !== undefined) setHands(realHours());

  /* below the story the menu marks the section you are in */
  function markSection() {
    var mid = window.innerHeight * 0.4, here = null;
    $$('.links a[data-glide]').forEach(function (a) {
      var el = $(a.getAttribute('href'));
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) here = a;
    });
    $$('.links a').forEach(function (a) { a.classList.toggle('is-here', a === here); });
  }

  var raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var p = (window.scrollY - story.offsetTop) / (unit * vh);
      setStep(clamp(Math.floor(p + 0.6), 0, N - 1));
      drawSeq(p);
      var below = window.scrollY > story.offsetTop + story.offsetHeight - vh * 0.6;
      if (nav) nav.classList.toggle('is-solid', below);
      if (below) markSection();
      syncBar();
    });
  }

  /* links into the story glide to the step's own stop; links to sections glide below the bar */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-step-link], [data-glide]');
    if (!a) return;
    var id = a.getAttribute('data-step-link');
    if (id) {
      var i = cfg.steps.map(function (s) { return s.id; }).indexOf(id);
      if (i < 0) return;
      e.preventDefault();
      glideTo(Math.ceil(stopOf(i)));
      return;
    }
    var el = $(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    glideTo(el.getBoundingClientRect().top + window.scrollY - navH() + 2);
  });

  function fromHash() {
    var h = decodeURIComponent(location.hash || '').slice(1);
    if (!h) return;
    if (h.indexOf('sheet-') === 0) { showSheet(h.slice(6)); return; }
    var i = cfg.steps.map(function (s) { return s.id; }).indexOf(h);
    if (i >= 0) window.scrollTo(0, Math.ceil(stopOf(i)));
  }

  size();
  steps[0].classList.remove('is-on');
  layers[0].classList.add('is-on');
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    var was = current;
    size();
    current = -1;
    setStep(Math.max(0, was));
    onScroll();
  });
  requestAnimationFrame(function () { onScroll(); fromHash(); });
  window.addEventListener('load', function () { loadSeq(phoneMq.matches ? 'phone' : 'desk'); });
  phoneMq.addEventListener && phoneMq.addEventListener('change', function () { loadSeq(phoneMq.matches ? 'phone' : 'desk'); });
})();

/* Game stores and play places (YOUR MOVE., des-20261028-180618-1b7e): the parts the engine does not draw. Runs after
   main.js and only reads what business.json already put on the page, so a new business needs no change here.
   - open now for hours that close after midnight ("14:00-01:00" = 2 PM to 1 AM)
   - every Book button picks its booking (table, console, arcade, escape room, event)
   - Games + play: "Check stock" on the shop items (business.json "visit": "stock:<category>")
   - step 06 "What's on": the week's events with Sign up, read from the events sheet; Sign up on every sheet row
   - photos: the caption as the design's card (what it shows, kind, languages, open now)
   - house rules + gift cards: the links open their answer in the FAQ
   - motion: the hero words, "Can you get out?" typed in, the pin on the phone step pill
   Without JavaScript the page still reads: the engine's links, sheets and hours stay as built. */
(function () {
  'use strict';

  var S = window.SampleSite;
  if (!S) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var DAYNAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var STEP_PRESET = { 'sit-down': 'Table', 'press-start': 'Console', 'arcade': 'Arcade', 'get-out': 'Escape room' };
  var QA_ANCHORS = { 'house-rules': /house rules/i, 'gift-cards': /gift card/i };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function icon(name) {
    var svg = document.createElementNS(SVG_NS, 'svg'), use = document.createElementNS(SVG_NS, 'use');
    svg.setAttribute('class', 'ic ic-s');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  /* ------------------------------------------------------------ every Book button picks its booking */
  Object.keys(STEP_PRESET).forEach(function (id) {
    $$('#' + id + ' [data-sheet="book"]').forEach(function (b) { b.setAttribute('data-preset', STEP_PRESET[id]); });
  });
  $$('[data-sheet-wrap="arcade"] [data-sheet="book"]').forEach(function (b) { b.setAttribute('data-preset', 'Arcade'); });
  $$('[data-sheet-wrap="events"] .sheet-foot [data-sheet="book"]').forEach(function (b) { b.setAttribute('data-preset', 'Event'); });

  /* Games + play: the shop items open Check stock with their category picked */
  $$('.svc [data-sheet="book"][data-preset]').forEach(function (b) {
    var p = b.getAttribute('data-preset') || '';
    if (p.indexOf('stock:') !== 0) return;
    b.setAttribute('data-sheet', 'stock');
    b.removeAttribute('data-preset');
    b.setAttribute('data-category', p.slice(6));
    var label = $('span', b);
    if (label) label.textContent = 'Check stock';
  });

  /* ------------------------------------------------------------ the events (the engine lists them in the events sheet) */
  var evSheet = $('[data-sheet-wrap="events"]');
  var events = evSheet ? $$('[data-list] li', evSheet).map(function (li) {
    var note = $('.note', li);
    return { li: li, name: li.getAttribute('data-name') || '', when: note ? note.textContent.trim() : '' };
  }) : [];
  function signUp(ev, cls) {
    var what = ev.name + (ev.when ? ', ' + ev.when : '');
    var b = el('button', cls, 'Sign up');
    b.type = 'button';
    b.setAttribute('data-sheet', 'book');
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('data-preset', 'Event');
    b.setAttribute('data-event', what);
    b.setAttribute('aria-label', 'Sign up: ' + what);
    return b;
  }
  /* step 06: What's on (desktop: name, day and time, Sign up; phone: name, day and time) */
  $$('[data-evrows]').forEach(function (ul) {
    var n = Number(ul.getAttribute('data-evrows')) || 4, isPhone = ul.classList.contains('is-phone');
    events.slice(0, n).forEach(function (ev) {
      var li = el('li');
      li.appendChild(el('b', '', ev.name));
      li.appendChild(el('span', 'ew', ev.when));
      if (!isPhone) li.appendChild(signUp(ev, 'evsu'));
      ul.appendChild(li);
    });
  });
  events.forEach(function (ev) { ev.li.appendChild(signUp(ev, 'btn btn-ghost btn-sm evsign')); });

  /* a Sign up writes the event into "Anything we should know" (never over words the visitor typed) */
  var noteIn = $('[data-sheet-wrap="book"] input[name="note"]');
  var autoNote = '';
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-sheet="book"]');
    if (!t || !noteIn) return;
    if (noteIn.value.trim() && noteIn.value !== autoNote) return;
    var ev = t.getAttribute('data-event');
    autoNote = ev ? 'Sign up: ' + ev : '';
    noteIn.value = autoNote;
  });
  /* Check stock from a shop item: its category is picked in the sheet */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-category]');
    if (b) S.setState('category', b.getAttribute('data-category'));
  });

  /* ------------------------------------------------------------ photos: the caption as the design's card */
  var openPill = $('[data-open]');
  $$('.gallery .gal').forEach(function (li) {
    var cap = $('p', li);
    if (!cap) return;
    var parts = cap.textContent.split(' · ');
    if (parts.length < 3) return;
    var box = el('div', 'cap');
    box.appendChild(el('b', '', parts[0]));
    box.appendChild(el('span', 'kind', parts[1]));
    var lang = el('span', 'lang');
    lang.appendChild(icon('globe'));
    lang.appendChild(el('span', 'sr', 'We speak '));
    lang.appendChild(document.createTextNode(parts.slice(2).join(' · ')));
    box.appendChild(lang);
    if (openPill) box.appendChild(openPill.cloneNode(true));
    li.replaceChild(box, cap);
  });

  /* ------------------------------------------------------------ open now, with hours that close after midnight */
  function nowThere() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: S.cfg.tz || 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
        .formatToParts(new Date());
      var get = function (t) { var x = p.filter(function (q) { return q.type === t; })[0]; return x ? x.value : ''; };
      return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')), t: (Number(get('hour')) % 24) + Number(get('minute')) / 60 };
    } catch (e) {
      var d = new Date();
      return { day: (d.getDay() + 6) % 7, t: d.getHours() + d.getMinutes() / 60 };
    }
  }
  function clockText(v) {
    var h = Math.floor(v) % 24, m = Math.round((v - Math.floor(v)) * 60);
    return (h % 12 || 12) + (m ? ':' + ('0' + m).slice(-2) : '') + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  /* a close at or before the opening time is the next morning: [14, 1] becomes [14, 25] (main.js reads this too) */
  S.cfg.hours = (S.cfg.hours || []).map(function (d) { return d && d[1] <= d[0] ? [d[0], d[1] + 24] : d; });
  function openState() {
    var H = S.cfg.hours, n = nowThere();
    if (n.day < 0 || !H.length) return null;
    var today = H[n.day], before = H[(n.day + 6) % 7];
    if (before && before[1] > 24 && n.t < before[1] - 24) return { open: true, text: 'Open now · until ' + clockText(before[1]) };
    if (today && n.t >= today[0] && n.t < today[1]) return { open: true, text: 'Open now · until ' + clockText(today[1]) };
    if (today && n.t < today[0]) return { open: false, text: 'Closed now · opens ' + clockText(today[0]) };
    for (var k = 1; k <= 7; k++) {
      var d = (n.day + k) % 7;
      if (H[d]) return { open: false, text: 'Closed now · opens ' + (k === 1 ? 'tomorrow ' : DAYNAME[d] + ' ') + clockText(H[d][0]) };
    }
    return null;
  }
  function fixOpen() {
    var o = openState();
    if (!o) return;
    $$('[data-open]').forEach(function (p) {
      var s = $('span', p);
      p.classList.toggle('is-closed', !o.open);
      if (s && s.textContent !== o.text) s.textContent = o.text;
    });
  }
  fixOpen();
  /* main.js redraws the pills every minute: put the right words back each time it does */
  if (window.MutationObserver) {
    var mo = new MutationObserver(fixOpen);
    $$('[data-open] span').forEach(function (s) { mo.observe(s, { childList: true, characterData: true, subtree: true }); });
  }

  /* ------------------------------------------------------------ house rules + gift cards: open their answer in the FAQ */
  $$('.qa').forEach(function (qa) {
    var q = $('button span', qa), text = q ? q.textContent : '';
    Object.keys(QA_ANCHORS).forEach(function (id) {
      if (!document.getElementById(id) && QA_ANCHORS[id].test(text)) qa.id = id;
    });
  });
  Object.keys(QA_ANCHORS).forEach(function (id) {
    if (!document.getElementById(id)) $$('a[href="#' + id + '"]').forEach(function (a) { a.setAttribute('href', '#how-it-works'); });
  });
  function openQa(id) {
    var qa = document.getElementById(id), b = qa && $('button[aria-expanded]', qa);
    if (b && b.getAttribute('aria-expanded') !== 'true') b.click();
  }
  /* capture phase, before main.js glides: a link inside a sheet closes the sheet first, so the page can move */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-glide], a[data-step-link]');
    if (!a) return;
    if (a.closest('[data-sheet-wrap]')) S.closeSheet(true);
    var id = (a.getAttribute('href') || '').slice(1);
    if (QA_ANCHORS[id]) openQa(id);
  }, true);
  /* coming from the owner or legal page with #gift-cards / #house-rules */
  var h0 = '';
  try { h0 = decodeURIComponent(location.hash || '').slice(1); } catch (e) { h0 = ''; }
  if (QA_ANCHORS[h0] && document.getElementById(h0)) {
    openQa(h0);
    setTimeout(function () {
      var t = document.getElementById(h0);
      if (t) window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 90);
    }, 120);
  }

  /* ------------------------------------------------------------ motion helpers (the CSS in theme.css does the moving) */
  /* 01: each word of the headline gets its own place in the rise */
  function splitWords(line, k0) {
    var k = k0;
    var parts = line.textContent.split(/(\s+)/);
    line.textContent = '';
    parts.forEach(function (p) {
      if (!p) return;
      if (/^\s+$/.test(p)) { line.appendChild(document.createTextNode(p)); return; }
      var w = el('span', 'w', p);
      w.style.setProperty('--k', String(k));
      k += 1;
      line.appendChild(w);
    });
    return k;
  }
  var wordIndex = 0;
  $$('#walk-in .head .l1, #walk-in .head .l2').forEach(function (line) {
    if (line.classList.contains('l1')) wordIndex = 0;
    wordIndex = splitWords(line, wordIndex);
  });
  /* 07: "Can you get out?" types in letter by letter; screen readers get the line once, whole */
  $$('#get-out .head .l1').forEach(function (line) {
    var txt = line.textContent;
    line.textContent = '';
    line.appendChild(el('span', 'sr', txt));
    var tw = el('span', 'tw');
    tw.setAttribute('aria-hidden', 'true');
    Array.prototype.forEach.call(txt, function (ch, i) {
      var c = el('span', 'ch', ch);
      c.style.setProperty('--i', String(i));
      tw.appendChild(c);
    });
    line.appendChild(tw);
  });
  /* phones: the pin in the step pill, as in the design */
  var pp = $('.ppill');
  if (pp) pp.insertBefore(icon('pin'), pp.firstChild);
})();
