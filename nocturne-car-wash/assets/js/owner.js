/* NOCTURNE Studio OS: the owner's bookings list (sample data) and one booking's detail. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORE = 'nocturne-booking';
  var SOURCE = { Website: 'var(--teal)', ChatGPT: 'var(--violet)', Google: 'var(--blue)', Instagram: 'var(--pink)', Phone: '#c9ced3' };
  var STATUS = { Booked: ['var(--teal)', 'var(--teal-dark)'], Confirmed: ['var(--green)', '#0b2a17'], New: ['#e9eef2', '#0e1216'],
                 'Follow-up': ['var(--amber)', '#2e2003'], Done: ['rgba(255,255,255,0.18)', 'var(--white)'] };
  var LEAD = { Wash: 0, Polish: 1, Ceramic: 2 };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fromIso(s) { var p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12); }
  function fmt(d, opts) { return d.toLocaleDateString('en-US', opts); }
  function ago(isoTime) {
    var m = Math.round((Date.now() - new Date(isoTime).getTime()) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' min ago';
    if (m < 60 * 36) return Math.round(m / 60) + ' h ago';
    return Math.round(m / 1440) + ' days ago';
  }

  /* ------------------------------------------------------------ sign-in (demo) */
  var signin = $('#view-signin');
  var dash = $('#view-dash');
  function showDash() {
    signin.hidden = true;
    dash.hidden = false;
    try { window.sessionStorage.setItem('nocturne-owner', '1'); } catch (e) { /* fine */ }
    if (location.hash !== '#view-dash') history.replaceState(null, '', '#view-dash');
    $('#h-bookings').focus({ preventScroll: true });
  }
  $('[data-signin]').addEventListener('submit', function (e) { e.preventDefault(); showDash(); });
  var signed = false;
  try { signed = window.sessionStorage.getItem('nocturne-owner') === '1'; } catch (e) { /* fine */ }
  if (signed && location.hash === '#view-dash') showDash();

  /* ------------------------------------------------------------ the real booking from the website */
  var real = null;
  try { real = JSON.parse(window.localStorage.getItem(STORE) || 'null'); } catch (e) { real = null; }
  var firstRow = $('[data-first]');
  if (real && real.name && real.day && firstRow) {
    var day = fromIso(real.day);
    firstRow.setAttribute('data-id', 'real');
    firstRow.setAttribute('data-name', real.name);
    firstRow.setAttribute('data-ago', ago(real.at));
    firstRow.setAttribute('data-car', real.make || real.kind);
    firstRow.setAttribute('data-kind', real.kind);
    firstRow.setAttribute('data-work', real.work);
    firstRow.setAttribute('data-when', fmt(day, { weekday: 'short' }) + ' ' + real.time);
    firstRow.setAttribute('data-phone', real.phone || '');
    firstRow.setAttribute('data-day', real.day);
    firstRow.setAttribute('data-time', real.time);
    firstRow.setAttribute('data-ready', real.ready || '');
    firstRow.setAttribute('data-first-name', real.first || real.name.split(' ')[0]);
    $('[data-live]').lastChild.textContent = 'New booking from your website · ' + ago(real.at);
  }

  /* ------------------------------------------------------------ rows, cards, filters */
  var rows = $$('[data-rows] tr');
  function d(row, k) { return row.getAttribute('data-' + k) || ''; }

  function renderRow(row) {
    var status = d(row, 'status'), src = d(row, 'source');
    var q = /^(Asked|Wants)/.test(d(row, 'when'));
    var ok = d(row, 'ok') === '1';
    row.innerHTML =
      '<td><span class="who"><b>' + esc(d(row, 'name')) + '</b>' + (row.hasAttribute('data-first') ? '<span class="pill new">NEW</span>' : '') + '</span><span class="sub mono">' + esc(d(row, 'ago')) + '</span></td>' +
      '<td><b>' + esc(d(row, 'car')) + '</b><span class="sub">' + esc(d(row, 'kind')) + '</span></td>' +
      '<td>' + esc(d(row, 'work')) + '</td>' +
      '<td' + (q ? ' class="q"' : '') + '>' + esc(d(row, 'when')) + '</td>' +
      '<td><span class="pill src" style="color:' + SOURCE[src] + ';border-color:' + SOURCE[src] + '">' + esc(src) + '</span></td>' +
      '<td><span class="pill status-pill" style="background:' + STATUS[status][0] + ';color:' + STATUS[status][1] + '">' + esc(status) + '</span></td>' +
      '<td><span class="follow' + (ok ? '' : ' wait') + '"><svg class="ic" aria-hidden="true"><use href="#i-' + (ok ? 'check' : 'clock') + '"/></svg>' + esc(d(row, 'follow')) + '</span></td>';
    row.setAttribute('aria-label', d(row, 'name') + ', ' + d(row, 'car') + ', ' + d(row, 'work') + ', ' + d(row, 'when') + ', ' + status + '. Open the booking');
  }

  function renderCards() {
    var box = $('[data-cards]');
    box.innerHTML = rows.map(function (row) {
      var status = d(row, 'status'), src = d(row, 'source');
      var ok = d(row, 'ok') === '1';
      return '<button type="button" class="card glass' + (row.hasAttribute('data-first') ? ' is-new' : '') + '" data-open="' + esc(d(row, 'id')) + '"' + (row.hidden ? ' hidden' : '') + '>' +
        '<span class="row1"><b>' + esc(d(row, 'name')) + '</b>' + (row.hasAttribute('data-first') ? '<span class="pill new">NEW</span>' : '') + '<span class="ago">' + esc(d(row, 'ago')) + '</span></span>' +
        '<span class="row2"><span>' + esc(d(row, 'car')) + ' · ' + esc(d(row, 'kind')) + '</span><span>' + esc(d(row, 'work')) + '</span><span>' + esc(d(row, 'when')) + '</span></span>' +
        '<span class="row3"><span class="pill src" style="color:' + SOURCE[src] + ';border-color:' + SOURCE[src] + '">' + esc(src) + '</span>' +
        '<span class="pill status-pill" style="background:' + STATUS[status][0] + ';color:' + STATUS[status][1] + '">' + esc(status) + '</span>' +
        '<span class="follow' + (ok ? '' : ' wait') + '"><svg class="ic" aria-hidden="true"><use href="#i-' + (ok ? 'check' : 'clock') + '"/></svg>' + esc(d(row, 'follow')) + '</span></span></button>';
    }).join('');
  }

  var filter = 'all';
  var query = '';
  function applyFilter() {
    var shown = 0;
    rows.forEach(function (row) {
      var text = (d(row, 'name') + ' ' + d(row, 'car') + ' ' + d(row, 'kind') + ' ' + d(row, 'work') + ' ' + d(row, 'source')).toLowerCase();
      var on = (filter === 'all' || d(row, 'status') === filter) && (!query || text.indexOf(query) >= 0);
      row.hidden = !on;
      if (on) shown++;
    });
    $('[data-empty]').hidden = shown > 0;
    renderCards();
  }
  function counts() {
    var n = { all: rows.length };
    rows.forEach(function (row) { n[d(row, 'status')] = (n[d(row, 'status')] || 0) + 1; });
    $$('[data-n]').forEach(function (el) { el.textContent = n[el.getAttribute('data-n')] || 0; });
    $('[data-count]').textContent = rows.length;
  }

  rows.forEach(renderRow);
  counts();
  applyFilter();

  $$('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-filter');
      $$('[data-filter]').forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      applyFilter();
    });
  });
  $('[data-search]').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); applyFilter(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !dash.hidden) { e.preventDefault(); $('[data-search]').focus(); }
  });

  $('[data-export]').addEventListener('click', function () {
    var head = ['Customer', 'Vehicle', 'Type', 'Service', 'When', 'Source', 'Status', 'Follow-up'];
    var lines = [head.join(',')].concat(rows.filter(function (r) { return !r.hidden; }).map(function (row) {
      return ['name', 'car', 'kind', 'work', 'when', 'source', 'status', 'follow'].map(function (k) { return '"' + d(row, k).replace(/"/g, '""') + '"'; }).join(',');
    }));
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    a.download = 'nocturne-bookings-sample.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });

  /* ------------------------------------------------------------ demo toast */
  var toast = $('[data-toast]');
  var toastTimer = null;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-demo]')) say('Concept demo: only the Bookings list is built.');
  });

  /* ------------------------------------------------------------ one booking's drawer */
  var root = $('#detail');
  var drawer = $('.drawer', root);
  var opener = null;
  var selected = null;

  function timelineFor(row) {
    var status = d(row, 'status'), src = d(row, 'source'), when = d(row, 'when');
    var via = src === 'Website' ? 'on the website' : src === 'Phone' ? 'by phone' : 'via ' + src;
    var firstTime = row.getAttribute('data-id') === 'real' || row.hasAttribute('data-first');
    if (status === 'New') return [['Asked a question ' + via, d(row, 'ago'), true], ['Auto-reply sent', 'seconds later · automatic', true], ['Follow-up text', 'scheduled · tomorrow, 9:00 AM', false]];
    if (status === 'Follow-up') return [['Asked for a quote ' + via, d(row, 'ago'), true], ['Quote sent by text', 'minutes later · automatic', true], ['Follow-up text', 'scheduled · tomorrow, 9:00 AM', false]];
    var list = [['Booked ' + via, d(row, 'ago') + (firstTime ? ' · 28 seconds from first tap' : ''), true],
                ['Confirmation text sent', '4 seconds later · automatic', true],
                ['Added to the calendar', when + ' · Bay 2', true]];
    if (status === 'Confirmed') list.push(['Customer confirmed by text', 'replied YES', true]);
    if (status === 'Done') {
      list.push(['Picked up', 'paid at the counter', true], ['Review request sent', 'the next morning · automatic', true]);
      if (/5-star/.test(d(row, 'follow'))) list.push(['5-star review left on Google', 'thanked automatically', true]);
    } else {
      var reminder = row.getAttribute('data-day') ? fmt(new Date(fromIso(row.getAttribute('data-day')).getTime() - 864e5), { weekday: 'long' }) : 'the day before';
      list.push(['Reminder text', 'scheduled · ' + reminder + ', 5:00 PM', false], ['Review request', 'scheduled · after pick-up', false]);
    }
    return list;
  }

  function fill(row) {
    var status = d(row, 'status');
    var name = d(row, 'name');
    var isReal = row.getAttribute('data-id') === 'real';
    var dayIso = row.getAttribute('data-day');
    var day = dayIso ? fromIso(dayIso) : null;
    var readyIso = row.getAttribute('data-ready');
    var q = /^(Asked|Wants)/.test(d(row, 'when'));
    var first = row.getAttribute('data-first-name') || name.split(' ')[0];

    $('[data-d="kicker"]').textContent = (q ? 'Question' : 'Booking') + ' · ' + d(row, 'ago');
    $('[data-d="name"]').textContent = name;
    $('[data-d="car"]').textContent = d(row, 'car') + ' · ' + d(row, 'kind') + ' · ' + d(row, 'work');
    $('[data-d="drop"]').textContent = day ? fmt(day, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + row.getAttribute('data-time') : (q ? 'Not booked yet' : d(row, 'when'));
    $('[data-d="phone"]').textContent = isReal && d(row, 'phone') ? d(row, 'phone') : 'Hidden in the demo';
    $('[data-d="status"]').textContent = status;
    $('[data-d="status-dot"]').style.background = STATUS[status][0];
    var readyText = 'After the work';
    if (readyIso) readyText = fmt(fromIso(readyIso), { weekday: 'short', day: 'numeric', month: 'short' }) + ', after ' + (LEAD[d(row, 'work')] === 0 ? '17:00' : '15:00');
    else if (status === 'Done') readyText = 'Picked up';
    else if (q) readyText = 'Once booked';
    $('[data-d="ready"]').textContent = readyText;

    $('[data-d="timeline"]').innerHTML = timelineFor(row).map(function (ev) {
      return '<li class="' + (ev[2] ? 'ok' : '') + '"><span class="dot"><svg class="ic" aria-hidden="true"><use href="#i-' + (ev[2] ? 'check' : 'clock') + '"/></svg></span><span><b>' + esc(ev[0]) + '</b><small>' + esc(ev[1]) + '</small></span></li>';
    }).join('');

    var smsBlock = $('[data-d="sms-block"]');
    if (q) {
      smsBlock.hidden = false;
      $('[data-d="sms"]').textContent = 'Hi ' + first + '! Thanks for asking about a ' + d(row, 'work').toLowerCase() + ' for your ' + d(row, 'car') + '. We can book you this week: reply with a day and we\'ll hold it.';
      $('[data-d="sms-meta"]').textContent = 'Delivered · auto-reply';
    } else {
      smsBlock.hidden = false;
      var carWord = isReal ? (real.make || (real.kind === 'SUV' ? 'SUV' : real.kind.toLowerCase())) : d(row, 'car');
      var whenWord = day ? fmt(day, { weekday: 'long' }) + ' at ' + row.getAttribute('data-time') : d(row, 'when');
      $('[data-d="sms"]').textContent = 'Hi ' + first + '! Your ' + carWord + ' is booked for ' + whenWord + '. Reply here if you need anything.';
      $('[data-d="sms-meta"]').textContent = 'Delivered · 4 s after booking';
    }
    $('[data-d="customer"]').textContent = isReal
      ? 'First visit · booked on your website ' + d(row, 'ago') + '.'
      : (d(row, 'source') === 'Website' ? 'First visit · found you on Google, booked on your website.' : 'Came in via ' + d(row, 'source') + '.');
  }

  function focusables() {
    return $$('a[href], button:not([disabled]), input, [tabindex="-1"]', drawer).filter(function (el) { return el.offsetParent !== null; });
  }
  function openDetail(row, from) {
    opener = from || row;
    if (selected) selected.classList.remove('is-selected');
    selected = row;
    row.classList.add('is-selected');
    fill(row);
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () {
      root.classList.add('is-open');
      $('[data-drawer-scroll]', root).scrollTop = 0;
      $('#detail-title').focus({ preventScroll: true });
    });
  }
  function closeDetail() {
    root.classList.remove('is-open');
    document.body.style.overflow = '';
    if (selected) selected.classList.remove('is-selected');
    window.setTimeout(function () { root.hidden = true; }, reduceMotion ? 0 : 420);
    if (opener && opener.focus) opener.focus();
  }

  rows.forEach(function (row) {
    row.addEventListener('click', function () { openDetail(row); });
    row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(row); } });
  });
  $('[data-cards]').addEventListener('click', function (e) {
    var card = e.target.closest('[data-open]');
    if (!card) return;
    var row = rows.filter(function (r) { return d(r, 'id') === card.getAttribute('data-open'); })[0];
    if (row) openDetail(row, card);
  });
  $$('[data-close]', root).forEach(function (b) { b.addEventListener('click', closeDetail); });
  document.addEventListener('keydown', function (e) {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDetail(); return; }
    if (e.key !== 'Tab') return;
    var list = focusables();
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
