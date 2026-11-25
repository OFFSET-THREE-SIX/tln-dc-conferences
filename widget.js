/*! The Local National: D.C. Conference Calendar widget.
    Paste this anywhere on a web page:

      <div data-tln-conferences data-theme="housing" data-limit="5"></div>
      <script src="https://calendar.thelocalnational.com/widget.js" async></script>

    Options (all optional):
      data-region  dc (default) or baltimore
      data-theme   a calendar slug such as housing, transit or tln-picks (default: all events)
      data-limit   how many upcoming events to show (default 5, max 50)
      data-title   heading text (default "D.C. conferences" or "Baltimore conferences" plus the theme name)
    Free to use with credit to The Local National. */
(function () {
  'use strict';
  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/\/widget\.js(?:[?#].*)?$/, '') : '';
  var CSS = [
    '.tlnw{font-family:Archivo,Helvetica,Arial,sans-serif;color:#1A1714;background:#F3EBDD;border-top:3px solid #1A1714;padding:14px 16px 12px;line-height:1.35;max-width:640px}',
    '.tlnw *{box-sizing:border-box}',
    '.tlnw-k{display:block;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#BF2A1E;margin:0 0 4px}',
    '.tlnw-h{display:block;font:700 20px/1.15 Fraunces,Georgia,serif;margin:0 0 8px}',
    '.tlnw ol{list-style:none;margin:0;padding:0}',
    '.tlnw li{display:grid;grid-template-columns:56px 1fr;gap:0 12px;padding:10px 0;border-top:1px solid rgba(26,23,20,.16)}',
    '.tlnw-d{font-size:11px;font-weight:800;letter-spacing:.08em;color:#BF2A1E;text-transform:uppercase;padding-top:3px}',
    '.tlnw-d b{display:block;font:700 22px/1 Fraunces,Georgia,serif;color:#1A1714;letter-spacing:0}',
    '.tlnw a.tlnw-t{font:700 16px/1.25 Fraunces,Georgia,serif;color:#1A1714;text-decoration:none}',
    '.tlnw a.tlnw-t:hover{text-decoration:underline}',
    '.tlnw-w{display:block;font-size:13px;color:#5C554B;margin-top:3px}',
    '.tlnw-f{border-top:2px solid #1A1714;margin-top:4px;padding-top:9px;font-size:13px;display:flex;flex-wrap:wrap;gap:6px 14px}',
    '.tlnw-f a{color:#BF2A1E;font-weight:700}',
    '.tlnw-e{font-size:14px;color:#5C554B;padding:10px 0;margin:0}'
  ].join('');

  function addStyle() {
    if (document.getElementById('tlnw-style')) { return; }
    var s = document.createElement('style');
    s.id = 'tlnw-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  function easternToday() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  function safeUrl(u) { return /^(https?|webcal):\/\//i.test(u || '') ? u : '#'; }

  function regionOf(target) {
    return (target.getAttribute('data-region') || '').toLowerCase() === 'baltimore' ? 'baltimore' : 'dc';
  }

  function render(target, data) {
    var region = regionOf(target);
    var slug = (target.getAttribute('data-theme') || 'all').toLowerCase();
    var limit = Math.max(1, Math.min(50, parseInt(target.getAttribute('data-limit') || '5', 10) || 5));
    var seg = null;
    (data.calendars || []).forEach(function (c) { if (c.slug === slug) { seg = c; } });
    if (!seg) { slug = 'all'; (data.calendars || []).forEach(function (c) { if (c.slug === 'all') { seg = c; } }); }
    var today = easternToday();
    var events = (data.events || []).filter(function (e) {
      return e.end_date >= today && (slug === 'all' || (e.segments || []).indexOf(slug) > -1);
    }).slice(0, limit);

    var box = el('div', 'tlnw');
    box.appendChild(el('span', 'tlnw-k', 'The Local National'));
    box.appendChild(el('span', 'tlnw-h', target.getAttribute('data-title') ||
      ((region === 'baltimore' ? 'Baltimore' : 'D.C.') + ' conferences' + (seg && slug !== 'all' ? ': ' + seg.name : ''))));
    if (!events.length) {
      box.appendChild(el('p', 'tlnw-e', 'No upcoming events listed yet. Subscribe to get them as they are added.'));
    } else {
      var ol = el('ol');
      events.forEach(function (e) {
        var li = el('li');
        var d = el('span', 'tlnw-d', e.badge ? e.badge.month : '');
        d.appendChild(el('b', null, e.badge ? e.badge.day : ''));
        li.appendChild(d);
        var body = el('div');
        var a = el('a', 'tlnw-t', e.title);
        a.href = safeUrl(e.links && e.links.page);
        a.target = '_blank';
        a.rel = 'noopener';
        body.appendChild(a);
        body.appendChild(el('span', 'tlnw-w', e.when + (e.location ? ' \u00b7 ' + e.location : '')));
        li.appendChild(body);
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }
    var f = el('div', 'tlnw-f');
    var all = el('a', null, 'See the full calendar');
    var page = data.page_url || base + (region === 'baltimore' ? '/baltimore/' : '/');
    all.href = safeUrl(page + (slug !== 'all' ? (page.indexOf('?') > -1 ? '&' : '?') + 'theme=' + encodeURIComponent(slug) : ''));
    all.target = '_blank';
    all.rel = 'noopener';
    f.appendChild(all);
    if (seg && seg.links) {
      var sub = el('a', null, 'Subscribe');
      sub.href = safeUrl(seg.links.webcal);
      f.appendChild(sub);
    }
    box.appendChild(f);
    target.innerHTML = '';
    target.appendChild(box);
  }

  function boot() {
    var targets = document.querySelectorAll('[data-tln-conferences]');
    if (!targets.length || !base) { return; }
    addStyle();
    var groups = { dc: [], baltimore: [] };
    Array.prototype.forEach.call(targets, function (t) { groups[regionOf(t)].push(t); });
    Object.keys(groups).forEach(function (region) {
      var list = groups[region];
      if (!list.length) { return; }
      fetch(base + '/api/' + (region === 'baltimore' ? 'baltimore' : 'events') + '.json', { credentials: 'omit' })
        .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
        .then(function (data) { list.forEach(function (t) { render(t, data); }); })
        .catch(function () {
          list.forEach(function (t) {
            var p = el('p', 'tlnw-e');
            var a = el('a', null, 'The Local National\u2019s ' + (region === 'baltimore' ? 'Baltimore' : 'D.C.') + ' Conference Calendar');
            a.href = base + (region === 'baltimore' ? '/baltimore/' : '/');
            p.appendChild(document.createTextNode('See '));
            p.appendChild(a);
            p.appendChild(document.createTextNode('.'));
            t.innerHTML = '';
            t.appendChild(p);
          });
        });
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
