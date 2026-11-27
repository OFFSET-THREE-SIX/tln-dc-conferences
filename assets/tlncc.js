/* The Local National: D.C. Conference Calendar interactions.
   Topic filters, search, the subscribe picker, copy-link buttons and the wall calendar. The calendar works without it. */
(function () {
  'use strict';

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* Wall calendar: month paging, event dots and the day panel. It follows the topic chips and the search box
     through sync(), which receives the ids of the events still showing in the list. */
  function initWall(root) {
    var wall = root.querySelector('[data-wall]');
    if (!wall) { return null; }
    var months = [].slice.call(wall.querySelectorAll('.tlncc-mo'));
    if (!months.length) { return null; }
    var MAX_ROWS = 4;
    var live = null;
    var cur = 0;
    var picked = {};

    function nyToday() {
      try {
        var t = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) { return t; }
      } catch (e) { /* older browsers keep the server's date */ }
      return wall.getAttribute('data-today') || '';
    }
    var today = nyToday();

    function items(mo, date) {
      var dl = mo.querySelector('.tlncc-dl[data-date="' + date + '"]');
      var out = [];
      if (!dl) { return out; }
      each(dl.children, function (li) {
        if (!live || live[li.getAttribute('data-ev')]) { out.push(li); }
      });
      return out;
    }

    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

    function refresh(mo) {
      var seen = {};
      var total = 0;
      each(mo.querySelectorAll('button.tlncc-d'), function (btn) {
        var date = btn.getAttribute('data-date');
        var list = items(mo, date);
        var dl = mo.querySelector('.tlncc-dl[data-date="' + date + '"]');
        var dots = btn.querySelector('.tlncc-dots');
        var pick = false;
        var html = '';
        var i;
        for (i = 0; i < list.length; i += 1) {
          if (list[i].getAttribute('data-pick')) { pick = true; }
          if (!seen[list[i].getAttribute('data-ev')]) { seen[list[i].getAttribute('data-ev')] = 1; total += 1; }
          if (i < 4) { html += '<i></i>'; }
        }
        if (list.length > 4) { html += '<b>+' + (list.length - 4) + '</b>'; }
        if (dots) { dots.innerHTML = html; }
        btn.classList.toggle('has-pick', pick);
        btn.disabled = list.length === 0;
        btn.setAttribute('aria-label', (dl ? dl.getAttribute('data-label') : date) + ', ' + plural(list.length, 'event', 'events'));
      });
      var lc = mo.querySelector('[data-lc]');
      if (lc) { lc.textContent = total ? total + (total === 1 ? ' event this month' : ' events this month') : 'No events listed this month'; }
    }

    function firstDate(mo) {
      var list = [];
      each(mo.querySelectorAll('button.tlncc-d:not(:disabled)'), function (b) { list.push(b.getAttribute('data-date')); });
      if (!list.length) { return ''; }
      var i;
      for (i = 0; i < list.length; i += 1) { if (list[i] >= today) { return list[i]; } }
      return list[0];
    }

    function select(mo, date) {
      each(mo.querySelectorAll('.tlncc-d.is-sel'), function (b) { b.classList.remove('is-sel'); b.setAttribute('aria-pressed', 'false'); });
      var panel = mo.querySelector('[data-panel]');
      if (!panel) { return; }
      panel.innerHTML = '';
      var dl = date ? mo.querySelector('.tlncc-dl[data-date="' + date + '"]') : null;
      var list = date ? items(mo, date) : [];
      if (!date || !dl || !list.length) {
        var p0 = document.createElement('p');
        p0.className = 'tlncc-pe';
        p0.textContent = live ? 'No events this month match the topic or search.' : 'No events listed this month.';
        panel.appendChild(p0);
        return;
      }
      var btn = mo.querySelector('button.tlncc-d[data-date="' + date + '"]');
      if (btn) { btn.classList.add('is-sel'); btn.setAttribute('aria-pressed', 'true'); }
      picked[mo.getAttribute('data-month')] = date;
      var h = document.createElement('p');
      h.className = 'tlncc-ph';
      h.textContent = dl.getAttribute('data-label') + ' \u00b7 ' + plural(list.length, 'event', 'events');
      panel.appendChild(h);
      var ul = document.createElement('ul');
      ul.className = 'tlncc-pl';
      var i;
      for (i = 0; i < list.length && i < MAX_ROWS; i += 1) { ul.appendChild(list[i].cloneNode(true)); }
      panel.appendChild(ul);
      if (list.length > MAX_ROWS) {
        var more = document.createElement('a');
        more.className = 'tlncc-more';
        more.href = '#e-' + list[MAX_ROWS].getAttribute('data-ev');
        more.textContent = '+ ' + (list.length - MAX_ROWS) + ' more in the list';
        panel.appendChild(more);
      }
    }

    function show(i) {
      if (i < 0 || i >= months.length) { return; }
      cur = i;
      each(months, function (m, n) { m.hidden = n !== i; });
      var mo = months[i];
      refresh(mo);
      var ym = mo.getAttribute('data-month');
      var keep = picked[ym] ? mo.querySelector('button.tlncc-d[data-date="' + picked[ym] + '"]:not(:disabled)') : null;
      select(mo, keep ? picked[ym] : firstDate(mo));
      each(mo.querySelectorAll('[data-wall-go]'), function (b) {
        var step = parseInt(b.getAttribute('data-wall-go'), 10);
        b.disabled = (step < 0 && i === 0) || (step > 0 && i === months.length - 1);
      });
    }

    wall.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) { return; }
      var go = t.closest('[data-wall-go]');
      if (go && !go.disabled) { show(cur + parseInt(go.getAttribute('data-wall-go'), 10)); return; }
      var day = t.closest('button.tlncc-d');
      if (day && !day.disabled) { select(months[cur], day.getAttribute('data-date')); }
    });

    // Start on this month when it is one of the printed twelve; otherwise on the month the server chose.
    var start = 0;
    var wanted = wall.getAttribute('data-default');
    var thisMonth = today.slice(0, 7);
    each(months, function (m, n) {
      if (m.getAttribute('data-month') === wanted) { start = n; }
    });
    each(months, function (m, n) {
      if (m.getAttribute('data-month') === thisMonth && m.hasAttribute('data-core')) { start = n; }
    });
    each(wall.querySelectorAll('.tlncc-d.is-today'), function (el) { el.classList.remove('is-today'); });
    each(wall.querySelectorAll('.tlncc-d[data-date="' + today + '"]'), function (el) { el.classList.add('is-today'); });
    show(start);

    return {
      sync: function (ids) { live = ids; show(cur); }
    };
  }

  function init(root) {
    if (root.getAttribute('data-tlncc-ready')) { return; }
    root.setAttribute('data-tlncc-ready', '1');
    var wall = initWall(root);

    var chips = root.querySelectorAll('.tlncc-chip');
    var events = root.querySelectorAll('.tlncc-ev');
    var groups = root.querySelectorAll('[data-tlncc-group]');
    var q = root.querySelector('[data-tlncc-q]');
    var status = root.querySelector('[data-tlncc-status]');
    var empty = root.querySelector('[data-tlncc-empty]');
    var sel = root.querySelector('[data-tlncc-sub]');
    var current = root.getAttribute('data-default-seg') || 'all';

    var wanted = null;
    try { wanted = new URLSearchParams(window.location.search).get('theme'); } catch (e) { wanted = null; }
    var hm = window.location.hash.match(/^#theme=([a-z0-9-]+)$/);
    if (hm) { wanted = hm[1]; }
    if (wanted && !/^[a-z0-9-]+$/.test(wanted)) { wanted = null; }
    if (wanted && root.querySelector('.tlncc-chip[data-seg="' + wanted + '"]')) { current = wanted; }

    function chipName(seg) {
      var c = root.querySelector('.tlncc-chip[data-seg="' + seg + '"]');
      return c ? c.getAttribute('data-name') : seg;
    }

    function updateSub() {
      if (!sel) { return; }
      var opt = sel.options[sel.selectedIndex];
      if (!opt) { return; }
      each(root.querySelectorAll('[data-sub-k]'), function (el) {
        var v = opt.getAttribute('data-' + el.getAttribute('data-sub-k'));
        if (!v) { return; }
        if (el.tagName === 'A') { el.setAttribute('href', v); } else { el.setAttribute('data-url', v); }
      });
    }

    function apply() {
      var raw = q ? q.value.trim() : '';
      var term = raw.toLowerCase();
      var shown = 0;
      var live = {};
      each(events, function (ev) {
        var segs = ' ' + (ev.getAttribute('data-segs') || '') + ' ';
        var ok = segs.indexOf(' ' + current + ' ') > -1 &&
          (!term || (ev.getAttribute('data-text') || '').indexOf(term) > -1);
        ev.hidden = !ok;
        if (ok) { shown += 1; live[(ev.id || '').replace(/^e-/, '')] = 1; }
      });
      if (wall) { wall.sync(live); }
      each(groups, function (g) { g.hidden = !g.querySelector('.tlncc-ev:not([hidden])'); });
      each(chips, function (c) {
        var on = c.getAttribute('data-seg') === current;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (status) {
        status.textContent = 'Showing ' + shown + (shown === 1 ? ' event' : ' events') +
          (current !== 'all' ? ' in ' + chipName(current) : '') +
          (raw ? ' matching \u201c' + raw + '\u201d' : '') + '.';
      }
      if (empty) { empty.hidden = shown > 0; }
      if (sel && sel.querySelector('option[value="' + current + '"]')) { sel.value = current; updateSub(); }
    }

    function syncUrl() {
      if (!root.hasAttribute('data-tlncc-url') || !window.history || !window.URL) { return; }
      try {
        var u = new URL(window.location.href);
        // Mutate only theme; preserve region and every other existing query parameter.
        if (current === 'all') { u.searchParams.delete('theme'); } else { u.searchParams.set('theme', current); }
        u.hash = '';
        window.history.replaceState(null, '', u.toString());
      } catch (e) { /* ignore */ }
    }

    each(chips, function (c) {
      c.addEventListener('click', function () { current = c.getAttribute('data-seg'); apply(); syncUrl(); });
    });
    if (q) { q.addEventListener('input', apply); }
    if (sel) { sel.addEventListener('change', updateSub); }

    each(root.querySelectorAll('.tlncc-copy'), function (b) {
      b.addEventListener('click', function () {
        var url = b.getAttribute('data-url');
        var orig = b.textContent;
        function done() { b.textContent = 'Link copied'; setTimeout(function () { b.textContent = orig; }, 2200); }
        function fallback() { window.prompt('Copy this calendar link:', url); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, fallback);
        } else { fallback(); }
      });
    });

    // Keep only one add-to-calendar menu open, and close it on an outside tap.
    root.addEventListener('toggle', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('tlncc-add') && t.open) {
        each(root.querySelectorAll('.tlncc-add[open]'), function (d) { if (d !== t) { d.open = false; } });
      }
    }, true);
    document.addEventListener('click', function (e) {
      each(root.querySelectorAll('.tlncc-add[open]'), function (d) { if (!d.contains(e.target)) { d.open = false; } });
    });

    root.classList.add('is-js');
    apply();
  }

  function boot() { each(document.querySelectorAll('[data-tlncc]'), init); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
