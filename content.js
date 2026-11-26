/* Public content renderer: pulls editable content from /api/content (managed in /admin).
   If nothing was ever saved, the static HTML defaults stay untouched. */
(function () {
    'use strict';
    var script = document.currentScript;
    var FX = script && script.getAttribute('data-fx');
    var inFrame = window.parent !== window;
    var isPreview = /[?&]preview=1/.test(location.search) && inFrame;
    if (isPreview) document.documentElement.classList.add('is-preview');

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function safe(u) {
        u = String(u || '').trim();
        return /^(https?:\/\/|\/|[A-Za-z0-9_\-.\/%?=&]+$)/.test(u) ? u : '';
    }
    function url(u) { return esc(safe(u) || '#'); }
    function get(o, p) {
        return String(p).split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o);
    }
    function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

    var BADGE = { warning: 'bg-warning text-dark', primary: 'bg-primary text-white', info: 'bg-info text-dark', success: 'bg-success text-white', danger: 'bg-danger text-white', secondary: 'bg-secondary text-white' };
    var BTN = { warning: 'btn-orange text-dark', primary: 'btn-blue text-white', info: 'btn-teal text-white', success: 'btn-teal text-white', danger: 'btn-orange text-dark', secondary: 'btn-blue text-white' };

    function body(text) {
        var out = [], para = [], list = [];
        function fp() { if (para.length) { out.push('<p class="mono-text mb-4 case-p">' + para.map(inline).join('<br>') + '</p>'); para = []; } }
        function fl() { if (list.length) { out.push('<ul class="mono-text ps-3 mb-4 case-list">' + list.map(function (x) { return '<li class="mb-2">' + inline(x) + '</li>'; }).join('') + '</ul>'); list = []; } }
        String(text || '').replace(/\r/g, '').split('\n').forEach(function (line) {
            var t = line.trim(), m;
            if (!t) { fp(); fl(); }
            else if ((m = /^##\s+(.*)$/.exec(t))) { fp(); fl(); out.push('<h5 class="fw-bold mt-4 mb-3">' + inline(m[1]) + '</h5>'); }
            else if ((m = /^[-*]\s+(.*)$/.exec(t))) { fp(); list.push(m[1]); }
            else { fl(); para.push(t); }
        });
        fp(); fl();
        return out.join('');
    }

    function eduCard(it, i) {
        var rev = i % 2 === 1;
        var color = BADGE[it.badgeColor] ? it.badgeColor : 'primary';
        var btn = it.detailBody
            ? '<a href="case.html?id=' + encodeURIComponent(it.id) + '" class="btn ' + BTN[color] + ' px-4 py-2 text-decoration-none d-inline-block">View case study &gt;</a>'
            : '';
        return '<div class="education-card story-row"><div class="row align-items-center text-center text-lg-start g-4' + (rev ? ' flex-lg-row-reverse' : '') + '">' +
            '<div class="col-lg-8' + (rev ? ' ps-lg-4' : '') + ' story-text">' +
            '<span class="badge badge-custom ' + BADGE[color] + ' mb-3">' + esc(it.badge) + '</span>' +
            '<h3 class="fw-bold mb-2">' + esc(it.title) + '</h3>' +
            '<p class="mono-text text-secondary mb-4">' + esc(it.desc) + '</p>' + btn + '</div>' +
            '<div class="col-lg-4 text-center ' + (rev ? 'text-lg-start' : 'text-lg-end') + '">' +
            (it.image ? '<div class="logo-pedestal"><img src="' + url(it.image) + '" alt="' + esc(it.title) + '" loading="lazy"></div>' : '') +
            '</div></div></div>';
    }
    function repoCard(it) {
        return '<div class="col-md-6 cinematic-card tilt-card"><a href="' + url(it.url) + '" target="_blank" rel="noopener noreferrer" class="text-decoration-none d-block h-100">' +
            '<div class="testimonial-card h-100 d-flex flex-column justify-content-between"><div><span class="quote-icon">“</span>' +
            '<p class="mono-text text-white mt-4 mb-4">' + esc(it.desc) + '</p></div>' +
            '<div class="d-flex align-items-center mt-3"><span class="repo-icon me-3"><i class="fa-brands fa-github"></i></span>' +
            '<h6 class="text-white m-0 fw-bold">' + esc(it.title) + '</h6></div></div></a></div>';
    }
    function hobiCard(it) {
        var media = '';
        if (it.mediaType === 'video' && it.video) media = '<video controls playsinline preload="metadata"><source src="' + url(it.video) + '" type="video/mp4"></video>';
        else if (it.image) media = '<img src="' + url(it.image) + '" alt="' + esc(it.title) + '" loading="lazy">';
        var btn = it.link ? '<div><a href="' + url(it.link) + '" target="_blank" rel="noopener noreferrer" class="btn-neon py-2 px-4 d-inline-block text-decoration-none" style="font-size:.8rem;">Know more &gt;</a></div>' : '';
        return '<div class="col-md-6 story-row"><div class="hobi-card d-flex flex-column justify-content-between"><div>' +
            (media ? '<div class="parallax-frame mb-3">' + media + '</div>' : '') +
            '<h4 class="fw-bold mb-2 mt-2">' + esc(it.title) + '</h4><p class="mono-text text-secondary mb-4">' + esc(it.desc) + '</p></div>' + btn + '</div></div>';
    }

    function renderCase(c) {
        var id = new URLSearchParams(location.search).get('id');
        var it = (c.education || []).filter(function (x) { return x.id === id; })[0];
        var card = document.getElementById('caseCard'), miss = document.getElementById('caseMissing');
        if (!it) { if (card) card.classList.add('d-none'); if (miss) miss.classList.remove('d-none'); return; }
        var color = BADGE[it.badgeColor] ? it.badgeColor : 'primary';
        document.title = (it.detailTitle || it.title) + ' | ' + ((c.profile && c.profile.name) || 'Portfolio');
        var set = function (i, h) { var e = document.getElementById(i); if (e) e.innerHTML = h; };
        set('cBadge', esc(it.badge)); document.getElementById('cBadge').className = 'badge badge-custom mb-2 ' + BADGE[color];
        set('cTitle', esc(it.title));
        set('cLoc', it.location ? '<i class="fa-solid fa-location-dot me-2 text-info"></i>' + esc(it.location) : '');
        set('cDetailTitle', esc(it.detailTitle || ''));
        set('cBody', body(it.detailBody));
        var img = document.getElementById('cImg');
        if (img) { if (it.image) { img.src = safe(it.image); img.alt = it.title; } else img.parentNode.classList.add('d-none'); }
        if (card) card.classList.remove('d-none');
    }

    function apply(c) {
        if (!c || typeof c !== 'object') return;
        if (document.body.getAttribute('data-page') === 'case') { renderCase(c); return; }
        document.querySelectorAll('[data-bind]').forEach(function (el) {
            var v = get(c, el.getAttribute('data-bind'));
            if (typeof v === 'string' && v) el.textContent = v;
        });
        document.querySelectorAll('[data-bind-src]').forEach(function (el) {
            var v = safe(get(c, el.getAttribute('data-bind-src')));
            if (v) el.setAttribute('src', v);
        });
        if (c.socials) {
            document.querySelectorAll('[data-social]').forEach(function (el) {
                var k = el.getAttribute('data-social'), v = c.socials[k];
                if (k === 'whatsapp') return;
                if (v && safe(v)) el.setAttribute('href', safe(v));
            });
            if (c.socials.whatsapp) document.body.setAttribute('data-wa', String(c.socials.whatsapp).replace(/\D/g, ''));
        }
        if (c.contact && c.contact.message) document.body.setAttribute('data-wamsg', c.contact.message);
        var wa = document.getElementById('waSubmit');
        if (wa) wa.setAttribute('href', 'https://wa.me/' + (document.body.getAttribute('data-wa') || '6281215625720') + '?text=' + encodeURIComponent(document.body.getAttribute('data-wamsg') || 'Halo!'));
        if (c.site) {
            if (c.site.title) { document.title = c.site.title; setMeta('property', 'og:title', c.site.title); setMeta('name', 'twitter:title', c.site.title); }
            if (c.site.description) { setMeta('name', 'description', c.site.description); setMeta('property', 'og:description', c.site.description); setMeta('name', 'twitter:description', c.site.description); }
        }
        var lists = { education: eduCard, repos: repoCard, hobbies: hobiCard };
        Object.keys(lists).forEach(function (k) {
            var box = document.querySelector('[data-list="' + k + '"]');
            if (box && Array.isArray(c[k])) box.innerHTML = c[k].map(lists[k]).join('');
        });
    }
    function setMeta(attr, key, val) {
        var m = document.querySelector('meta[' + attr + '="' + key + '"]');
        if (m) m.setAttribute('content', val);
    }

    var ready;
    if (isPreview) {
        ready = new Promise(function (res) {
            window.__pvResolve = res;
            parent.postMessage({ type: 'ds-ready' }, location.origin);
            setTimeout(res, 2500);
        });
    } else {
        var done = fetch('/api/content', { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (c) { if (c && (c.profile || c.education)) apply(c); })
            .catch(function () {});
        ready = Promise.race([done, new Promise(function (r) { setTimeout(r, 1500); })]);
    }

    window.addEventListener('message', function (e) {
        if (e.origin !== location.origin || !e.data) return;
        if (e.data.type === 'ds-content') {
            apply(e.data.content);
            if (window.__pvResolve) { window.__pvResolve(); window.__pvResolve = null; }
        } else if (e.data.type === 'ds-scroll') {
            var t = e.data.target === 'top' ? document.body : document.querySelector(e.data.target);
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    ready.then(function () {
        if (!FX) return;
        var s = document.createElement('script');
        s.src = FX;
        document.body.appendChild(s);
    });
})();
