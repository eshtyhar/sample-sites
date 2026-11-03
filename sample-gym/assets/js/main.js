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

/* Gyms and studios template (THE FLOOR IS YOURS): the widgets only this design has. Runs after main.js and only
   reads what business.json already put on the page (the schedule sheet's rows, the team section), so a new
   business needs no change here.
   - step 03 "Today": the next classes today, each with Book (or Full)
   - step 05 "Coaches": three coach tiles from the team section
   - the schedule sheet: day pills + class-type chips (desktop), today's day typed in (phone), Book / Full on every row
   - every Book button fills the booking sheet (class, day, time; "Book a tour" picks the tour)
   - "Add to calendar" after booking, "See this week" on the map card, the #reviews anchor */
(function () {
  'use strict';

  var S = window.SampleSite;
  if (!S) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  var DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var TIME_START = [7, 12, 17.5, 19.5];   /* the booking sheet's time chips, when no class time is known */
  var phone = window.matchMedia(S.cfg.phone || '(max-width: 900px)');
  var book = $('[data-sheet-wrap="book"]');
  var sched = $('[data-sheet-wrap="schedule"]');
  var lastBooked = null;

  /* ------------------------------------------------------------ small helpers */
  function nowThere() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: S.cfg.tz || 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false,
        year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      var get = function (t) { var x = p.filter(function (q) { return q.type === t; })[0]; return x ? x.value : ''; };
      return { day: DAY_SHORT.indexOf(get('weekday')), h: (Number(get('hour')) % 24) + Number(get('minute')) / 60,
        y: Number(get('year')), mo: Number(get('month')), d: Number(get('day')) };
    } catch (e) {
      var n = new Date();
      return { day: (n.getDay() + 6) % 7, h: n.getHours() + n.getMinutes() / 60, y: n.getFullYear(), mo: n.getMonth() + 1, d: n.getDate() };
    }
  }
  function hourOf(t) {
    var m = /(\d{1,2})(?::(\d{2}))?\s*([AP])M/i.exec(t || '');
    if (!m) return 12;
    var h = Number(m[1]) % 12 + (m[3].toUpperCase() === 'P' ? 12 : 0);
    return h + (m[2] ? Number(m[2]) / 60 : 0);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
    svg.setAttribute('class', 'ic ic-s');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }
  function chipValues(group) {
    return book ? $$('.chips[data-group="' + group + '"] .chip', book).map(function (c) { return c.getAttribute('data-value'); }) : [];
  }
  function syncTabs() {
    $$('.chips[data-group] .chip').forEach(function (c) { c.tabIndex = c.getAttribute('aria-checked') === 'true' ? 0 : -1; });
  }
  function dayValue(i) {
    var hit = chipValues('day').filter(function (v) { return v.toLowerCase().indexOf(DAYS[i]) === 0; })[0];
    return hit || null;
  }
  function timeValue(h) {
    var v = chipValues('time');
    if (!v.length) return null;
    var i = h < 11 ? 0 : h < 16 ? 1 : h < 19 ? 2 : 3;
    return v[Math.min(i, v.length - 1)];
  }

  /* ------------------------------------------------------------ the schedule rows (built by the engine from business.json) */
  var rows = sched ? $$('[data-list] li', sched).map(function (li) {
    var keys = (li.getAttribute('data-keys') || '').split(' '), note = $('.note', li), price = $('.price', li);
    return { li: li, day: DAYS.indexOf(keys[0]), full: keys.indexOf('waitlist') >= 0, name: li.getAttribute('data-name') || '',
      type: li.getAttribute('data-for') || '', time: price ? price.textContent.trim() : '', coach: note ? note.textContent.split(' \u00b7 ')[0] : '' };
  }) : [];

  function bookButton(r, cls) {
    if (r.full) return el('span', cls + ' is-full', 'Full');
    var b = el('button', cls, 'Book');
    b.type = 'button';
    b.setAttribute('data-sheet', 'book');
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('data-preset', r.type);
    b.setAttribute('data-day', String(r.day));
    b.setAttribute('data-hour', String(hourOf(r.time)));
    b.setAttribute('data-class', r.name);
    b.setAttribute('aria-label', 'Book ' + r.name + ', ' + (DAY_LONG[r.day] || '') + ' ' + r.time);
    return b;
  }

  rows.forEach(function (r) {
    var price = $('.price', r.li);
    if (price && r.day >= 0) price.insertBefore(el('small', 'sday', DAY_SHORT[r.day] + ' '), price.firstChild);
    r.li.appendChild(bookButton(r, 'sbook'));
    if (r.full) r.li.classList.add('is-full');
  });

  /* ------------------------------------------------------------ step 03: the next four classes from now (today first) */
  function nextClasses(n, max) {
    var out = [];
    for (var k = 0; k <= 7 && out.length < max; k++) {
      var d = (n.day + k) % 7;
      rows.filter(function (r) { return r.day === d && (k > 0 || hourOf(r.time) > n.h); })
        .sort(function (a, b) { return hourOf(a.time) - hourOf(b.time); })
        .forEach(function (r) { if (out.length < max) out.push({ r: r, k: k }); });
    }
    return out;
  }
  function drawToday() {
    var ul = $('[data-today]');
    if (!ul || !rows.length) return;
    var n = nowThere(), pick = nextClasses(n, 4);
    if (!pick.length) return;
    var card = ul.closest('.card'), title = card && $('.card-h h3', card), sub = card && $('.card-sub', card);
    if (pick[0].k > 0 && title) {
      title.textContent = pick[0].k === 1 ? 'Tomorrow' : DAY_LONG[pick[0].r.day];
      if (sub) sub.textContent = 'No more classes today. Here is what comes next.';
    }
    ul.textContent = '';
    pick.forEach(function (p) {
      var r = p.r, li = el('li'), tt = el('span', 'tt');
      if (p.k !== pick[0].k) tt.appendChild(el('small', 'sday', DAY_SHORT[r.day]));
      tt.appendChild(document.createTextNode(r.time));
      li.appendChild(icon('clock'));
      li.appendChild(tt);
      li.appendChild(el('b', 'tc', r.name));
      li.appendChild(el('span', 'tco', r.coach));
      li.appendChild(bookButton(r, 'tbook'));
      ul.appendChild(li);
    });
  }

  /* ------------------------------------------------------------ step 05: coach tiles from the team section */
  function drawCoaches() {
    var ul = $('[data-coaches]');
    if (!ul) return;
    $$('.sec-team .mate').slice(0, 3).forEach(function (m) {
      var li = el('li'), ph = el('span', 'ct-ph'), ini = $('.ini', m), h = $('h3', m), role = $('.role', m);
      ph.appendChild(el('span', 'ini', ini ? ini.textContent : ''));
      ph.setAttribute('aria-hidden', 'true');
      li.appendChild(ph);
      li.appendChild(el('b', '', h ? h.textContent : ''));
      li.appendChild(el('span', 'ct-role', role ? role.textContent : ''));
      ul.appendChild(li);
    });
  }

  /* ------------------------------------------------------------ the schedule sheet: pills (desktop), today typed in (phone) */
  var pick = { day: nowThere().day, type: '' };
  var input = sched ? $('[data-filter]', sched) : null;
  var list = sched ? $('[data-list]', sched) : null;

  function pillRow(cls, label, items, onPick) {
    var g = el('div', cls);
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', label);
    items.forEach(function (it) {
      var b = el('button', 'spill', it.label);
      b.type = 'button';
      b.setAttribute('data-v', it.value);
      b.setAttribute('aria-pressed', it.on ? 'true' : 'false');
      b.addEventListener('click', function () {
        $$('.spill', g).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(it.value);
      });
      g.appendChild(b);
    });
    return g;
  }
  function runFilter(q) {
    if (!input) return;
    input.value = q;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function applyPills() { runFilter([DAYS[pick.day] || '', pick.type].join(' ').trim()); }

  if (sched && input && rows.length) {
    var seen = {};
    rows.forEach(function (r) { seen[r.type] = true; });
    var types = chipValues('visit').filter(function (v) { return seen[v]; });
    var hasBeginner = rows.some(function (r) { return (r.li.getAttribute('data-keys') || '').split(' ').indexOf('beginner') >= 0; });
    var tItems = [{ label: 'All', value: '', on: true }].concat(types.map(function (t) { return { label: t, value: t.toLowerCase() }; }));
    if (hasBeginner) tItems.push({ label: 'Beginner', value: 'beginner' });
    var dItems = DAY_SHORT.map(function (d, i) { return { label: d, value: String(i), on: i === pick.day }; })
      .filter(function (d) { return rows.some(function (r) { return String(r.day) === d.value; }); });
    var box = el('div', 'spills');
    box.appendChild(pillRow('sdays', 'Day', dItems, function (v) { pick.day = Number(v); applyPills(); }));
    box.appendChild(pillRow('stypes', 'Class type', tItems, function (v) { pick.type = v; applyPills(); }));
    var field = input.closest('.input');
    field.parentNode.insertBefore(box, field);

    /* after every filter: show the day on each row when more than one day is listed; never say "spots left" for a full class */
    input.addEventListener('input', function () {
      var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      var oneDay = words.some(function (w) { return DAYS.some(function (d, i) { return d.indexOf(w) === 0 || DAY_LONG[i].toLowerCase().indexOf(w) === 0; }) && w.length >= 3; });
      if (list) list.classList.toggle('is-oneday', oneDay);
      var m = $('[data-match]', sched);
      if (!m || m.hidden) return;
      var open = rows.filter(function (r) { return !r.li.hidden && !r.full; })[0];
      if (open) $('[data-match-name]', m).textContent = open.name;
      else m.hidden = true;
    });

    /* each time the sheet opens: desktop = the pills' day and type; phone = today's day typed in (unless a search came with it) */
    new MutationObserver(function () {
      if (sched.hidden) return;
      if (phone.matches) { if (!input.value) runFilter(DAY_LONG[nowThere().day] || ''); else runFilter(input.value); }
      else applyPills();
    }).observe(sched, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ------------------------------------------------------------ every way into the booking sheet fills it */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sheet="book"]');
    if (t) {
      var want = chipValues('want');
      var tour = /\btour\b/i.test(t.textContent || '');
      if (want.length) S.setState('want', want[tour && want[1] ? 1 : 0]);
      var d = t.getAttribute('data-day'), h = t.getAttribute('data-hour');
      lastBooked = null;
      if (d !== null && h !== null) {
        var dv = dayValue(Number(d)), tv = timeValue(Number(h));
        if (dv) S.setState('day', dv);
        if (tv) S.setState('time', tv);
        lastBooked = { day: Number(d), hour: Number(h), name: t.getAttribute('data-class') || '', dv: dv, tv: tv, type: t.getAttribute('data-preset') };
      }
      syncTabs();
      return;
    }
    var w = e.target.closest('.chips[data-group="pweek"] .chip');   /* phone step 03: Today / a class type */
    if (w) {
      var all = $$('.chip', w.parentNode), i = all.indexOf(w), today = DAY_LONG[nowThere().day] || '';
      S.showSheet('schedule', w, { q: i === 0 ? today : (w.getAttribute('data-value') || '').toLowerCase() + ' ' + today.toLowerCase() });
    }
  });

  /* links to a step or a section from inside a sheet: close the sheet first, so the page can move */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.sheet [data-step-link], .sheet [data-glide]')) S.closeSheet(true);
  }, true);

  /* ------------------------------------------------------------ Add to calendar (a file made here; nothing is sent) */
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function icsText(cls, dayIdx, hour) {
    var n = nowThere(), base = new Date(Date.UTC(n.y, n.mo - 1, n.d)), add = (dayIdx - n.day + 7) % 7;
    if (add === 0 && hour <= n.h) add = 7;
    base.setUTCDate(base.getUTCDate() + add);
    var hh = Math.floor(hour), mm = Math.round((hour - hh) * 60);
    var date = base.getUTCFullYear() + two(base.getUTCMonth() + 1) + two(base.getUTCDate());
    var end = new Date(base.getTime() + (hh * 60 + mm + 60) * 60000);
    var endStr = end.getUTCFullYear() + two(end.getUTCMonth() + 1) + two(end.getUTCDate()) + 'T' + two(end.getUTCHours()) + two(end.getUTCMinutes()) + '00';
    var where = $('.sec-visit .where h3'), city = $('.sec-visit .where .city');
    var loc = (where ? where.textContent : '') + (city ? ', ' + city.textContent : '');
    var clean = function (s) { return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, ' '); };
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sample site//EN', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@sample-site', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
      'DTSTART:' + date + 'T' + two(hh) + two(mm) + '00', 'DTEND:' + endStr,
      'SUMMARY:' + clean(cls + ' at ' + (S.cfg.name || 'the studio')), 'LOCATION:' + clean(loc),
      'DESCRIPTION:' + clean('Come 10 minutes early. Sample site: this is a sample booking.'),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('.sent a[href^="https://calendar.google.com"]');
    if (!a) return;
    e.preventDefault();
    var st = S.state, dayIdx = -1, hour = 12;
    DAYS.forEach(function (d, i) { if ((st.day || '').toLowerCase().indexOf(d) === 0) dayIdx = i; });
    var cls = st.visit && chipValues('visit').indexOf(st.visit) >= 0 ? st.visit : 'Class';
    /* booked from a class row and nothing changed since: its own day, time and name */
    var row = lastBooked && lastBooked.dv === st.day && lastBooked.tv === st.time && lastBooked.type === st.visit ? lastBooked : null;
    if (row) { dayIdx = row.day; hour = row.hour; cls = row.name || cls; }
    else {
      var tv = chipValues('time'), ti = tv.indexOf(st.time);
      hour = TIME_START[Math.max(0, Math.min(ti, TIME_START.length - 1))];
    }
    if (dayIdx < 0) dayIdx = nowThere().day;
    var link = el('a');
    link.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsText(cls, dayIdx, hour));
    link.download = (S.cfg.name || 'studio').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-class.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  /* ------------------------------------------------------------ the map card on step 07: See this week (the map itself gives directions) */
  var dir = $('#see-you-there .card-map .actions .btn-primary');
  if (dir && sched) {
    var b = el('button', 'btn btn-primary btn-block');
    b.type = 'button';
    b.setAttribute('data-sheet', 'schedule');
    b.setAttribute('aria-haspopup', 'dialog');
    b.appendChild(icon('calendar'));
    b.appendChild(el('span', '', 'See this week'));
    dir.parentNode.replaceChild(b, dir);
  }

  /* ------------------------------------------------------------ start */
  var rh = $('.sec-team .rev-h');
  if (rh && !document.getElementById('reviews')) {
    rh.id = 'reviews';
    if (location.hash === '#reviews') setTimeout(function () { rh.scrollIntoView(); }, 300);
  }
  var bar = $('[data-bar]');
  var today = dayValue(nowThere().day);
  if (today) S.setState('day', today);
  if (bar) {
    [['visit', 'Choose one'], ['day', 'This week']].forEach(function (p) {
      var s = $('select[data-bind="' + p[0] + '"]', bar);
      if (!s) return;
      var o = el('option', '', p[1]);
      o.value = '';
      s.insertBefore(o, s.firstChild);
      s.value = '';
    });
  }
  syncTabs();
  drawToday();
  drawCoaches();
})();
