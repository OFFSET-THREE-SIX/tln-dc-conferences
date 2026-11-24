/* The Local National: D.C. Conference Calendar interactions.
   Topic filters, search, the subscribe picker and copy-link buttons. The calendar works without it. */
(function () {
  'use strict';

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function init(root) {
    if (root.getAttribute('data-tlncc-ready')) { return; }
    root.setAttribute('data-tlncc-ready', '1');

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
      each(events, function (ev) {
        var segs = ' ' + (ev.getAttribute('data-segs') || '') + ' ';
        var ok = segs.indexOf(' ' + current + ' ') > -1 &&
          (!term || (ev.getAttribute('data-text') || '').indexOf(term) > -1);
        ev.hidden = !ok;
        if (ok) { shown += 1; }
      });
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
