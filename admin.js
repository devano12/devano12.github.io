/* Admin panel — vanilla JS. Content is stored via /api (Cloudflare KV). */
(function () {
    'use strict';

    // ---------------------------------------------------------------- helpers
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function uid() { return Math.random().toString(36).slice(2, 9); }
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function fmtSize(n) { return n > 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
    function getp(o, p) { return String(p).split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
    function setp(o, p, v) {
        var ks = String(p).split('.'), last = ks.pop();
        var t = ks.reduce(function (a, k) { return a[k]; }, o);
        t[last] = v;
    }
    function toast(msg, type) {
        var t = document.createElement('div');
        t.className = 'toast ' + (type || '');
        t.textContent = msg;
        $('#toasts').appendChild(t);
        setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3600);
        setTimeout(function () { t.remove(); }, 4000);
    }
    function modal(html, cls, lock) {
        var w = document.createElement('div');
        w.className = 'modal-back';
        if (lock) w.dataset.lock = '1';
        w.innerHTML = '<div class="modal ' + (cls || '') + '" role="dialog">' + html + '</div>';
        $('#modalRoot').appendChild(w);
        function close() { w.remove(); }
        w.addEventListener('mousedown', function (e) { if (e.target === w && !w.dataset.lock) close(); });
        $$('[data-x]', w).forEach(function (b) { b.addEventListener('click', close); });
        return { el: w, box: w.firstChild, close: close };
    }
    async function api(path, opt) {
        opt = opt || {};
        var headers = Object.assign({ 'x-admin': '1' }, opt.headers || {});
        var r = await fetch(path, Object.assign({ credentials: 'same-origin' }, opt, { headers: headers }));
        var d = null;
        if ((r.headers.get('content-type') || '').indexOf('json') > -1) d = await r.json();
        if (!r.ok) {
            if (r.status === 401 && path !== '/api/login') showLogin();
            throw new Error((d && d.error) || 'Error ' + r.status);
        }
        return d;
    }

    // ---------------------------------------------------------------- defaults (mirror of the static site)
    var DEFAULTS = {
        site: {
            title: 'Devano Saputra | Software Engineer & Personal Portfolio',
            description: 'Profil resmi dan portofolio Devano Saputra — Mahasiswa S1 Teknik Informatika UKSW Salatiga & Software Engineer. Lihat proyek, riwayat pendidikan, dan kontak resmi.'
        },
        profile: {
            name: 'Devano Saputra',
            tagline: 'Beginner Software Engineer & Informatics Student at UKSW Salatiga',
            bio: '"Halo! Saya seorang mahasiswa Teknik Informatika di UKSW Salatiga yang berfokus pada pengembangan perangkat lunak (Software Engineering). Berpengalaman dalam membangun aplikasi web, RESTful API, serta eksplorasi proyek open-source. Selalu bersemangat untuk mempelajari teknologi baru dan menyelesaikan masalah lewat kode."',
            avatar: 'foto/pp.jpg'
        },
        socials: {
            instagram: 'https://www.instagram.com/devanosaputra_',
            tiktok: 'https://www.tiktok.com/@serpihanakar',
            github: 'https://github.com/devano12',
            linkedin: 'https://www.linkedin.com/in/devano-saputra-04794a307',
            whatsapp: '6281215625720'
        },
        sections: {
            education: { title: 'My Academic Journey & Educational Background', sub: 'My educational path has been driven by a passion for technology and problem-solving.' },
            repos: { title: 'Featured GitHub Repositories', sub: 'Proyek dan repositori kode terbuka yang telah saya kembangkan di GitHub (@devano12).' },
            hobbies: { title: 'Hobi', sub: 'Berikut saya sertakan hobi dan proyek-proyek yang sedang saya kerjakan, baik di bidang pengembangan perangkat lunak maupun eksplorasi teknologi lainnya.' }
        },
        education: [
            {
                id: 'uksw', badge: 'Higher Education', badgeColor: 'warning',
                title: 'Universitas Kristen Satya Wacana (UKSW Salatiga)',
                desc: 'S1 Teknik Informatika (Sedang Ditempuh). Berfokus pada Software Engineering, pengembangan aplikasi modern, dan arsitektur RESTful API.',
                image: 'foto/uksw.jpg', location: 'Salatiga, Jawa Tengah • S1 Teknik Informatika',
                detailTitle: 'Fokus & Eksplorasi Akademik',
                detailBody: 'Selama menempuh studi S1 Teknik Informatika di UKSW, saya memfokuskan diri pada pengembangan perangkat lunak secara komprehensif. Perjalanan akademik ini membekali saya dengan teori fundamental sekaligus praktik langsung dalam memecahkan masalah komputasi.\n\n## Mata Kuliah Utama & Implementasi\n- **Pemrograman Berorientasi Platform:** Mengembangkan arsitektur perangkat lunak dengan pendekatan berbasis platform, memahami siklus hidup aplikasi, dan penerapan version control menggunakan Git/GitHub.\n- **Web Services:** Merancang dan membangun RESTful API, mengelola integrasi basis data, serta mengimplementasikan sistem autentikasi modern (seperti JWT) untuk keamanan backend.\n- **Grafika Komputer:** Eksplorasi pemrograman visual 2D/3D menggunakan C++ dan OpenGL/GLUT, memanipulasi vektor matematika, dan mengolah rendering objek di layar.\n- **Jaringan Komputer:** Memahami infrastruktur, topologi jaringan, pengaturan router, manajemen bandwidth, serta konfigurasi server.'
            },
            {
                id: 'sma', badge: 'Senior High', badgeColor: 'primary',
                title: 'SMA Virgo Fidelis Bawen',
                desc: 'Menyelesaikan pendidikan menengah atas dengan fokus pada ilmu pengetahuan Sosial dan dasar-dasar logika pemikiran analitis.',
                image: 'foto/sma.jpg', location: 'Bawen, Jawa Tengah • Ilmu Pengetahuan Sosial',
                detailTitle: 'Fondasi Logika & Analitis',
                detailBody: 'Di SMA Virgo Fidelis Bawen, saya tidak hanya mempelajari ilmu akademis formal, tetapi juga melatih cara berpikir kritis, observasi sosial, dan pemecahan masalah (problem-solving) yang adaptif. Masa ini adalah transisi krusial di mana saya mulai membentuk kedisiplinan belajar mandiri yang menjadi modal utama dalam mendalami ilmu rekayasa perangkat lunak saat ini.\n\n## Pengalaman & Pengembangan Diri\n- **Kolaborasi Tim:** Terbiasa bekerja sama dalam proyek kelompok yang melatih keterampilan komunikasi dan manajemen tugas.\n- **Pemikiran Struktural:** Mempelajari pola kausalitas dalam ilmu sosial yang ternyata sangat berguna dalam memetakan logika alur sistem (system flow) di dunia pemrograman.\n- **Aktivitas Ekstrakurikuler:** Membangun rasa tanggung jawab, empati, serta kepekaan terhadap lingkungan sekitar.'
            },
            {
                id: 'smp', badge: 'Basic Education', badgeColor: 'info',
                title: 'SD & SMP Pangudi Luhur Ambarawa',
                desc: 'Menempuh pendidikan dasar dan menengah pertama di Pangudi Luhur Ambarawa, membangun fondasi akademik serta kedisiplinan sejak dini.',
                image: 'foto/smp.jpg', location: 'Ambarawa, Jawa Tengah • Pendidikan Dasar & Menengah',
                detailTitle: 'Membangun Karakter & Kedisiplinan',
                detailBody: 'Pangudi Luhur Ambarawa adalah tempat di mana nilai-nilai fundamental karakter saya dibentuk. Dari pendidikan sekolah dasar hingga menengah pertama, lingkungan sekolah sangat menekankan pada nilai kejujuran, dedikasi, dan disiplin tinggi.\n\nSelama rentang waktu ini, saya diajarkan untuk memiliki mentalitas pekerja keras dan tidak mudah menyerah saat menghadapi kesulitan akademis. Dasar-dasar literasi digital dan kemampuan beradaptasi dengan lingkungan baru mulai terasah di sini. Kedisiplinan yang ditanamkan sejak dini dari Pangudi Luhur menjadi nilai yang terus saya terapkan, terutama saat harus menghadapi logika kode atau melakukan debugging proyek perangkat lunak hingga tuntas.'
            }
        ],
        repos: [
            { id: 'r1', title: 'Cryptex Miner', desc: 'Repositori berisi proyek aplikasi/script Cryptex Miner. Mengimplementasikan logika pemrosesan data, optimasi performa hardware, dan manajemen eksekusi tugas.', url: 'https://github.com/devano12/Kryptex-miner' },
            { id: 'r2', title: 'Simulasi Keamanan Login (Cybersecurity Study)', desc: 'Simulasi keamanan autentikasi untuk edukasi dan penelitian kesadaran keamanan siber (Cybersecurity Awareness).', url: 'https://github.com/devano12/simulasi-login' }
        ],
        hobbies: [
            { id: 'h1', title: 'Suka Editing Video dan Fotografi', desc: 'Mengedit video dan mengambil foto dengan Handphone.', mediaType: 'video', image: '', video: 'foto/1.mp4', link: '' },
            { id: 'h2', title: 'Suka Mendaki Gunung', desc: 'Jika ditanya Healing saya dimana ya di pegunungan.', mediaType: 'image', image: 'foto/gunung.jpg', video: '', link: '' }
        ],
        contact: {
            heading: 'Get In Touch',
            sub: 'Punya pertanyaan, tawaran kolaborasi, atau ingin berdiskusi seputar proyek perangkat lunak? Silakan kirim pesan di bawah ini!',
            message: 'Halo Devano, saya menghubungi dari website portofolio Anda.'
        }
    };
    var NEW_ITEM = {
        education: function () { return { id: uid(), badge: 'Education', badgeColor: 'primary', title: 'Nama Sekolah / Kampus', desc: '', image: '', location: '', detailTitle: '', detailBody: '' }; },
        repos: function () { return { id: uid(), title: 'Nama Repositori', desc: '', url: 'https://github.com/devano12/' }; },
        hobbies: function () { return { id: uid(), title: 'Hobi Baru', desc: '', mediaType: 'image', image: '', video: '', link: '' }; }
    };
    var TABS = [
        ['profile', 'fa-user', 'Profil & Hero'],
        ['education', 'fa-graduation-cap', 'Pendidikan'],
        ['repos', 'fa-code-branch', 'Proyek GitHub'],
        ['hobbies', 'fa-mountain-sun', 'Hobi'],
        ['contact', 'fa-address-book', 'Kontak & Sosial'],
        ['seo', 'fa-magnifying-glass', 'SEO & Situs'],
        ['media', 'fa-images', 'Galeri Media'],
        ['settings', 'fa-gear', 'Pengaturan']
    ];
    var SCROLL = { profile: 'top', education: '#cases', repos: '#github', hobbies: '#hobi', contact: '#contact' };

    // ---------------------------------------------------------------- state
    var state = null, published = null, dirty = false, library = [], tab = 'profile', previewOn = false, pvLoaded = false;

    function norm(c) {
        var d = clone(DEFAULTS);
        (function merge(t, s) {
            Object.keys(s || {}).forEach(function (k) {
                if (Array.isArray(s[k])) t[k] = s[k];
                else if (s[k] && typeof s[k] === 'object' && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) merge(t[k], s[k]);
                else if (s[k] !== undefined) t[k] = s[k];
            });
        })(d, c);
        ['education', 'repos', 'hobbies'].forEach(function (k) {
            d[k] = d[k].map(function (it) { if (!it.id) it.id = uid(); return it; });
        });
        return d;
    }

    // ---------------------------------------------------------------- auth screens
    function showLogin() { $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); setTimeout(function () { $('#loginPw').focus(); }, 50); }
    function showApp() { $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); }

    $('#loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        var btn = $('#loginBtn'), err = $('#loginErr');
        err.classList.add('hidden'); btn.disabled = true;
        try {
            await api('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $('#loginPw').value }) });
            $('#loginPw').value = '';
            await boot();
        } catch (ex) {
            err.textContent = ex.message; err.classList.remove('hidden');
        }
        btn.disabled = false;
    });
    $('#logoutBtn').addEventListener('click', async function () {
        try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
        showLogin();
    });

    // ---------------------------------------------------------------- boot
    async function boot() {
        var me = await fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).catch(function () { return { auth: false }; });
        if (!me.auth) return showLogin();
        showApp();
        var r = await fetch('/api/content?t=' + Date.now(), { cache: 'no-store' });
        var c = r.ok ? await r.json() : {};
        published = c && (c.profile || c.education) ? norm(c) : null;
        var draft = null;
        try { draft = JSON.parse(localStorage.getItem('ds_draft') || 'null'); } catch (e) {}
        if (draft && JSON.stringify(norm(draft)) !== JSON.stringify(published || norm({}))) {
            state = norm(draft); dirty = true; toast('Draft lokal yang belum dipublikasikan dipulihkan.');
        } else {
            state = published ? clone(published) : norm({});
            dirty = false;
        }
        buildNav(); render(); updateStatus();
        refreshLibrary();
    }

    function buildNav() {
        $('#nav').innerHTML = TABS.map(function (t) {
            return '<button class="navlink' + (t[0] === tab ? ' active' : '') + '" data-tab="' + t[0] + '" type="button"><i class="fa-solid ' + t[1] + '"></i><span>' + t[2] + '</span></button>';
        }).join('');
    }
    $('#nav').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        tab = b.dataset.tab; buildNav(); render();
        $('#editor').scrollTop = 0;
        if (previewOn && SCROLL[tab]) postPreview({ type: 'ds-scroll', target: SCROLL[tab] });
    });

    // ---------------------------------------------------------------- status / dirty / draft
    var draftT;
    function markDirty() {
        dirty = true; updateStatus(); schedPreview();
        clearTimeout(draftT);
        draftT = setTimeout(function () { try { localStorage.setItem('ds_draft', JSON.stringify(state)); } catch (e) {} }, 400);
    }
    function updateStatus() {
        var s = $('#status');
        s.className = 'status ' + (dirty ? 'dirty' : (published ? 'live' : ''));
        $('span', s).textContent = dirty ? 'Ada perubahan yang belum dipublikasikan' : (published ? 'Semua perubahan sudah live' : 'Belum pernah dipublikasikan — klik Publikasikan untuk memulai');
    }
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

    // ---------------------------------------------------------------- field builders
    function inp(path, label, o) {
        o = o || {};
        return '<label class="fld ' + (o.cls || '') + '"><span>' + label + '</span><input type="' + (o.type || 'text') + '" data-path="' + path + '" value="' + esc(getp(state, path)) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + (o.hint ? '<small>' + o.hint + '</small>' : '') + '</label>';
    }
    function area(path, label, rows, o) {
        o = o || {};
        return '<label class="fld ' + (o.cls || '') + '"><span>' + label + '</span><textarea data-path="' + path + '" rows="' + (rows || 4) + '">' + esc(getp(state, path)) + '</textarea>' + (o.hint ? '<small>' + o.hint + '</small>' : '') + '</label>';
    }
    function sel(path, label, opts, o) {
        o = o || {};
        var cur = getp(state, path);
        return '<label class="fld ' + (o.cls || '') + '"><span>' + label + '</span><select data-path="' + path + '"' + (o.rerender ? ' data-rerender="1"' : '') + '>' +
            opts.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cur ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>';
    }
    function imgf(path, label, o) {
        o = o || {};
        var v = getp(state, path) || '';
        return '<div class="fld imgfld ' + (o.cls || '') + '" data-aspect="' + (o.aspect || 0) + '" data-max="' + (o.max || 1000) + '" data-format="' + (o.format || '') + '">' +
            '<span class="lbl">' + label + '</span><div class="imgbox"><div class="thumb">' + (v ? '<img src="' + esc(v) + '" alt="">' : '<i class="fa-regular fa-image"></i>') + '</div>' +
            '<div class="imgctl"><div class="imgbtns">' +
            '<button class="btn primary sm" type="button" data-action="img-pick" data-path="' + path + '"><i class="fa-solid fa-upload"></i> Pilih / Upload</button>' +
            '<button class="btn ghost sm danger" type="button" data-action="img-clear" data-path="' + path + '"><i class="fa-regular fa-trash-can"></i> Hapus</button></div>' +
            '<input type="text" data-path="' + path + '" value="' + esc(v) + '" placeholder="atau tempel URL / path gambar"></div></div></div>';
    }
    function head(t, s) { return '<div class="page-head"><h2>' + t + '</h2><p>' + s + '</p></div>'; }
    function itemHead(list, i, title) {
        var d = 'data-list="' + list + '" data-i="' + i + '"';
        return '<div class="item-head"><b>' + (i + 1) + '. ' + esc(title || '(tanpa judul)') + '</b><div class="item-tools">' +
            '<button class="icon" type="button" title="Naikkan" data-action="move" ' + d + ' data-dir="-1"><i class="fa-solid fa-arrow-up"></i></button>' +
            '<button class="icon" type="button" title="Turunkan" data-action="move" ' + d + ' data-dir="1"><i class="fa-solid fa-arrow-down"></i></button>' +
            '<button class="icon" type="button" title="Hapus" data-action="remove" ' + d + '><i class="fa-regular fa-trash-can" style="color:var(--danger)"></i></button></div></div>';
    }
    function addBtn(list, label) { return '<div class="list-add"><button class="btn" type="button" data-action="add" data-list="' + list + '"><i class="fa-solid fa-plus"></i> ' + label + '</button></div>'; }

    // ---------------------------------------------------------------- tab renderers
    var R = {
        profile: function () {
            return head('Profil & Hero', 'Bagian paling atas website: nama, tagline, bio, dan foto profil.') +
                '<div class="card grid2">' + inp('profile.name', 'Nama') + inp('profile.tagline', 'Tagline / jabatan') +
                area('profile.bio', 'Bio (tampil di Hero)', 6, { cls: 'span2', hint: 'Tanda kutip boleh dipakai. Teks ini tampil apa adanya.' }) +
                imgf('profile.avatar', 'Foto profil (ditampilkan bulat)', { aspect: 1, max: 900, cls: 'span2' }) + '</div>';
        },
        education: function () {
            var h = head('Riwayat Pendidikan', 'Tambah, ubah, urutkan, atau hapus sekolah/kampus. Isi “halaman detail” agar tombol <i>View case study</i> muncul.') +
                '<div class="card grid2">' + inp('sections.education.title', 'Judul bagian') + inp('sections.education.sub', 'Sub judul') + '</div>';
            h += state.education.map(function (it, i) {
                var p = 'education.' + i + '.';
                return '<div class="card item">' + itemHead('education', i, it.title) + '<div class="grid2">' +
                    inp(p + 'title', 'Nama sekolah / kampus', { cls: 'span2' }) +
                    inp(p + 'badge', 'Label (badge)') +
                    sel(p + 'badgeColor', 'Warna label', [['warning', 'Kuning'], ['primary', 'Biru'], ['info', 'Cyan'], ['success', 'Hijau'], ['danger', 'Merah'], ['secondary', 'Abu-abu']]) +
                    area(p + 'desc', 'Deskripsi singkat (di kartu)', 3, { cls: 'span2' }) +
                    imgf(p + 'image', 'Logo / gambar (ditampilkan utuh, tidak dipotong)', { aspect: 0, max: 800, format: 'png', cls: 'span2' }) +
                    inp(p + 'location', 'Lokasi / jurusan (halaman detail)', { cls: 'span2' }) +
                    inp(p + 'detailTitle', 'Judul halaman detail', { cls: 'span2' }) +
                    area(p + 'detailBody', 'Isi halaman detail', 10, { cls: 'span2', hint: 'Format: <code>## Sub judul</code> · <code>- poin daftar</code> · <code>**teks tebal**</code>. Pisahkan paragraf dengan baris kosong. Kosongkan untuk menyembunyikan tombol detail.' }) +
                    '</div></div>';
            }).join('');
            return h + addBtn('education', 'Tambah sekolah / kampus');
        },
        repos: function () {
            var h = head('Proyek GitHub', 'Kartu repositori yang ditampilkan di bagian gelap kedua.') +
                '<div class="card grid2">' + inp('sections.repos.title', 'Judul bagian') + inp('sections.repos.sub', 'Sub judul') + '</div>';
            h += state.repos.map(function (it, i) {
                var p = 'repos.' + i + '.';
                return '<div class="card item">' + itemHead('repos', i, it.title) + '<div class="grid2">' +
                    inp(p + 'title', 'Nama proyek') + inp(p + 'url', 'Link repositori', { type: 'url', ph: 'https://github.com/…' }) +
                    area(p + 'desc', 'Deskripsi', 3, { cls: 'span2' }) + '</div></div>';
            }).join('');
            return h + addBtn('repos', 'Tambah proyek');
        },
        hobbies: function () {
            var h = head('Hobi', 'Kartu hobi dengan foto atau video.') +
                '<div class="card grid2">' + inp('sections.hobbies.title', 'Judul bagian') + inp('sections.hobbies.sub', 'Sub judul') + '</div>';
            h += state.hobbies.map(function (it, i) {
                var p = 'hobbies.' + i + '.';
                return '<div class="card item">' + itemHead('hobbies', i, it.title) + '<div class="grid2">' +
                    inp(p + 'title', 'Judul hobi', { cls: 'span2' }) +
                    area(p + 'desc', 'Deskripsi', 3, { cls: 'span2' }) +
                    sel(p + 'mediaType', 'Tipe media', [['image', 'Gambar'], ['video', 'Video (.mp4)']], { rerender: true }) +
                    inp(p + 'link', 'Link tombol “Know more” (opsional)', { type: 'url' }) +
                    (it.mediaType === 'video'
                        ? inp(p + 'video', 'Path / URL video .mp4', { cls: 'span2', ph: 'foto/1.mp4', hint: 'Upload video belum didukung di panel ini; gunakan file yang sudah ada di folder website atau link .mp4.' })
                        : imgf(p + 'image', 'Gambar (dipotong persegi di kartu)', { aspect: 1, max: 1000, cls: 'span2' })) +
                    '</div></div>';
            }).join('');
            return h + addBtn('hobbies', 'Tambah hobi');
        },
        contact: function () {
            return head('Kontak & Sosial', 'Teks bagian kontak, tombol WhatsApp, dan tautan sosial media.') +
                '<div class="card grid2">' + inp('contact.heading', 'Judul bagian') + inp('socials.whatsapp', 'Nomor WhatsApp', { ph: '6281234567890', hint: 'Format internasional tanpa “+”, contoh: 6281215625720' }) +
                area('contact.sub', 'Teks pengantar', 3, { cls: 'span2' }) +
                area('contact.message', 'Pesan awal WhatsApp', 2, { cls: 'span2' }) + '</div>' +
                '<div class="card grid2"><h3 class="span2">Tautan sosial media</h3>' +
                inp('socials.instagram', 'Instagram', { type: 'url' }) + inp('socials.tiktok', 'TikTok', { type: 'url' }) +
                inp('socials.github', 'GitHub', { type: 'url' }) + inp('socials.linkedin', 'LinkedIn', { type: 'url' }) + '</div>';
        },
        seo: function () {
            return head('SEO & Situs', 'Judul tab browser dan deskripsi yang dipakai Google & pratinjau link WhatsApp/sosmed.') +
                '<div class="card grid2">' + inp('site.title', 'Judul situs (title)', { cls: 'span2', hint: 'Ideal ≤ 60 karakter.' }) +
                area('site.description', 'Deskripsi situs (meta description)', 3, { cls: 'span2', hint: 'Ideal 120–160 karakter.' }) + '</div>' +
                '<div class="card"><h3>Tampilan di hasil pencarian Google</h3><div class="serp"><div class="serp-url">devanosaputra.pages.dev</div>' +
                '<div class="serp-title" id="serpT"></div><div class="serp-desc" id="serpD"></div></div><div class="counter" id="serpC"></div></div>';
        },
        media: function () {
            return head('Galeri Media', 'Semua gambar yang sudah diupload. Gambar diperkecil otomatis di browser sebelum diupload agar website tetap ngebut.') +
                '<div class="card"><div class="picker-bar"><button class="btn primary" type="button" data-action="media-upload"><i class="fa-solid fa-upload"></i> Upload gambar baru</button>' +
                '<span class="muted">' + library.length + ' gambar</span></div>' + libGrid(false) + '</div>';
        },
        settings: function () {
            return head('Pengaturan', 'Keamanan akun, cadangan, dan reset konten.') +
                '<div class="card grid2"><h3 class="span2">Ganti password admin</h3>' +
                '<label class="fld"><span>Password saat ini</span><input type="password" id="pwCur" autocomplete="current-password"></label><span></span>' +
                '<label class="fld"><span>Password baru (min. 10 karakter)</span><input type="password" id="pwNew" autocomplete="new-password"></label>' +
                '<label class="fld"><span>Ulangi password baru</span><input type="password" id="pwNew2" autocomplete="new-password"></label>' +
                '<div class="span2"><button class="btn primary" type="button" data-action="pw-change"><i class="fa-solid fa-key"></i> Simpan password</button></div></div>' +
                '<div class="card"><h3>Cadangan & pemulihan</h3><div class="imgbtns">' +
                '<button class="btn" type="button" data-action="export"><i class="fa-solid fa-download"></i> Export JSON</button>' +
                '<label class="btn"><i class="fa-solid fa-file-import"></i> Import JSON<input type="file" id="importFile" accept="application/json" hidden></label>' +
                '<button class="btn" type="button" data-action="restore-prev"><i class="fa-solid fa-clock-rotate-left"></i> Pulihkan versi publikasi sebelumnya</button>' +
                '<button class="btn danger" type="button" data-action="reset-default"><i class="fa-solid fa-rotate-left"></i> Reset ke konten awal</button></div>' +
                '<p class="muted" style="margin:12px 0 0">Import / pulihkan / reset hanya mengubah <b>draft</b>. Klik <b>Publikasikan</b> bila sudah yakin.</p></div>';
        }
    };

    function libGrid(pick) {
        if (!library.length) return '<div class="empty">Belum ada gambar yang diupload.</div>';
        return '<div class="lib-grid' + (pick ? ' pick' : '') + '">' + library.map(function (im) {
            var name = im.name || im.id;
            return '<div class="lib-item" data-url="' + esc(im.url) + '" data-id="' + esc(im.id) + '"><div class="pic"><img loading="lazy" src="' + esc(im.url) + '" alt=""></div>' +
                '<div class="meta"><b title="' + esc(name) + '">' + esc(name) + '</b><span>' + fmtSize(im.size || 0) + '</span></div>' +
                (pick ? '' : '<div class="acts"><button class="btn sm" type="button" data-action="lib-copy">Salin URL</button><button class="btn sm danger" type="button" data-action="lib-del">Hapus</button></div>') + '</div>';
        }).join('') + '</div>';
    }

    function render() {
        var ed = $('#editor');
        ed.innerHTML = R[tab]();
        if (tab === 'seo') updateSerp();
    }
    function updateSerp() {
        var t = $('#serpT'); if (!t) return;
        t.textContent = state.site.title || '(judul kosong)';
        $('#serpD').textContent = state.site.description || '(deskripsi kosong)';
        $('#serpC').textContent = 'Judul: ' + (state.site.title || '').length + ' karakter · Deskripsi: ' + (state.site.description || '').length + ' karakter';
    }

    // ---------------------------------------------------------------- editor events
    var editor = $('#editor');
    editor.addEventListener('input', function (e) {
        var t = e.target, p = t.getAttribute && t.getAttribute('data-path');
        if (!p) return;
        setp(state, p, t.value);
        var box = t.closest('.imgfld');
        if (box) {
            var th = $('.thumb', box), v = t.value.trim();
            th.innerHTML = v ? '<img src="' + esc(v) + '" alt="">' : '<i class="fa-regular fa-image"></i>';
        }
        if (tab === 'seo') updateSerp();
        markDirty();
    });
    editor.addEventListener('change', function (e) {
        if (e.target.hasAttribute && e.target.hasAttribute('data-rerender')) render();
        if (e.target.id === 'importFile') importJson(e.target.files[0]);
    });
    editor.addEventListener('click', function (e) {
        var b = e.target.closest('[data-action]');
        if (!b) return;
        var a = b.dataset.action, list = b.dataset.list, i = +b.dataset.i;
        if (a === 'add') {
            state[list].push(NEW_ITEM[list]()); markDirty(); render();
            var items = $$('.item', editor); if (items.length) items[items.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (a === 'remove') {
            if (confirm('Hapus item ini?')) { state[list].splice(i, 1); markDirty(); render(); }
        } else if (a === 'move') {
            var j = i + (+b.dataset.dir);
            if (j >= 0 && j < state[list].length) { var arr = state[list], x = arr[i]; arr[i] = arr[j]; arr[j] = x; markDirty(); render(); }
        } else if (a === 'img-pick') {
            var box = b.closest('.imgfld'), path = b.dataset.path;
            openPicker({ aspect: +box.dataset.aspect, max: +box.dataset.max, format: box.dataset.format }, function (url) { setp(state, path, url); markDirty(); render(); });
        } else if (a === 'img-clear') {
            setp(state, b.dataset.path, ''); markDirty(); render();
        } else if (a === 'media-upload') {
            pickFile(function (f) { editImage(f, { aspect: 0, max: 1600 }).then(function (u) { if (u) { toast('Gambar diupload', 'ok'); render(); } }); });
        } else if (a === 'lib-copy') {
            var url = location.origin + b.closest('.lib-item').dataset.url;
            (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast('URL disalin', 'ok'); }, function () { prompt('Salin URL:', url); });
        } else if (a === 'lib-del') {
            var it = b.closest('.lib-item'), u = it.dataset.url;
            var used = JSON.stringify(state).indexOf(u) > -1;
            if (!confirm(used ? 'Gambar ini sedang dipakai di konten. Tetap hapus?' : 'Hapus gambar ini permanen?')) return;
            api('/api/img/' + it.dataset.id, { method: 'DELETE' }).then(function () { library = library.filter(function (x) { return x.url !== u; }); render(); toast('Gambar dihapus', 'ok'); }).catch(function (ex) { toast(ex.message, 'err'); });
        } else if (a === 'pw-change') {
            changePw();
        } else if (a === 'export') {
            var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
            var l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'portfolio-content.json'; l.click();
        } else if (a === 'restore-prev') {
            api('/api/backup').then(function (d) {
                if (!d.content) return toast('Belum ada versi sebelumnya.', 'err');
                state = norm(d.content); markDirty(); render(); toast('Versi sebelumnya dimuat sebagai draft.', 'ok');
            }).catch(function (ex) { toast(ex.message, 'err'); });
        } else if (a === 'reset-default') {
            if (confirm('Reset draft ke konten awal website?')) { state = norm({}); markDirty(); render(); }
        }
    });

    function importJson(file) {
        if (!file) return;
        var fr = new FileReader();
        fr.onload = function () {
            try { state = norm(JSON.parse(fr.result)); markDirty(); render(); toast('JSON dimuat sebagai draft.', 'ok'); }
            catch (e) { toast('File JSON tidak valid.', 'err'); }
        };
        fr.readAsText(file);
    }
    async function changePw() {
        var cur = $('#pwCur').value, n1 = $('#pwNew').value, n2 = $('#pwNew2').value;
        if (n1.length < 10) return toast('Password baru minimal 10 karakter.', 'err');
        if (n1 !== n2) return toast('Ulangi password baru tidak sama.', 'err');
        try {
            await api('/api/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ current: cur, next: n1 }) });
            $('#pwCur').value = $('#pwNew').value = $('#pwNew2').value = '';
            toast('Password berhasil diganti.', 'ok');
        } catch (ex) { toast(ex.message, 'err'); }
    }

    // ---------------------------------------------------------------- publish
    async function publish() {
        var btn = $('#pubBtn'); btn.disabled = true;
        try {
            await api('/api/content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) });
            published = clone(state); dirty = false;
            try { localStorage.removeItem('ds_draft'); } catch (e) {}
            updateStatus();
            toast('Berhasil dipublikasikan! Website sudah ter-update.', 'ok');
        } catch (ex) { toast(ex.message, 'err'); }
        btn.disabled = false;
    }
    $('#pubBtn').addEventListener('click', publish);
    window.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (state) publish(); }
    });

    // ---------------------------------------------------------------- live preview
    var frame = $('#pvFrame'), pvT;
    function postPreview(msg) { if (previewOn && frame.contentWindow) frame.contentWindow.postMessage(msg, location.origin); }
    function pushPreview() { postPreview({ type: 'ds-content', content: state }); }
    function schedPreview() { clearTimeout(pvT); pvT = setTimeout(pushPreview, 160); }
    function setPreview(on) {
        previewOn = on;
        $('#previewPane').classList.toggle('hidden', !on);
        $('#pvBtn').classList.toggle('primary', on);
        if (on && !pvLoaded) { pvLoaded = true; frame.src = '/?preview=1'; }
        else if (on) pushPreview();
    }
    $('#pvBtn').addEventListener('click', function () { setPreview(!previewOn); });
    $('#pvClose').addEventListener('click', function () { setPreview(false); });
    $('#pvReload').addEventListener('click', function () { frame.src = '/?preview=1'; });
    $$('[data-dev]').forEach(function (b) {
        b.addEventListener('click', function () {
            $$('[data-dev]').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active'); frame.style.width = b.dataset.dev;
        });
    });
    window.addEventListener('message', function (e) {
        if (e.origin !== location.origin || !e.data) return;
        if (e.data.type === 'ds-ready') {
            pushPreview();
            if (SCROLL[tab] && tab !== 'profile') setTimeout(function () { postPreview({ type: 'ds-scroll', target: SCROLL[tab] }); }, 350);
        }
    });

    // ---------------------------------------------------------------- media library + picker
    async function refreshLibrary() {
        try {
            var d = await api('/api/images');
            library = (d.images || []).sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
            if (tab === 'media') render();
        } catch (e) {}
    }
    function pickFile(cb) {
        var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
        f.onchange = function () { if (f.files[0]) cb(f.files[0]); };
        f.click();
    }
    function openPicker(preset, onPick) {
        var m = modal('<div class="modal-head"><h3>Pilih gambar</h3><button class="icon" type="button" data-x><i class="fa-solid fa-xmark"></i></button></div>' +
            '<div class="modal-body"><div class="picker-bar"><button class="btn primary" type="button" id="pkUp"><i class="fa-solid fa-upload"></i> Upload gambar baru</button>' +
            '<span class="muted">atau pilih dari galeri:</span></div><div id="pkGrid">' + libGrid(true) + '</div></div>', 'wide');
        $('#pkUp', m.box).addEventListener('click', function () {
            pickFile(function (f) { editImage(f, preset).then(function (url) { if (url) { m.close(); onPick(url); } }); });
        });
        $('#pkGrid', m.box).addEventListener('click', function (e) {
            var it = e.target.closest('.lib-item'); if (!it) return;
            m.close(); onPick(it.dataset.url);
        });
    }

    // ---------------------------------------------------------------- image editor (resize / crop / compress / preview)
    function editImage(file, preset) {
        preset = preset || {};
        return new Promise(function (resolve) {
            var srcUrl = URL.createObjectURL(file), img = new Image();
            img.onerror = function () { toast('File gambar tidak bisa dibaca.', 'err'); resolve(null); };
            img.onload = start;
            img.src = srcUrl;

            function start() {
                var iw = img.naturalWidth, ih = img.naturalHeight;
                var st = {
                    aspect: preset.aspect || 0, max: preset.max || 1000, zoom: 1, ox: 0, oy: 0,
                    fmt: preset.format || (/png|webp|gif/.test(file.type) ? 'png' : 'jpeg'), q: 0.85
                };
                var ASP = [[0, 'Asli'], [1, '1:1'], [4 / 3, '4:3'], [16 / 9, '16:9'], [3 / 4, '3:4']];
                var SIZES = [400, 600, 800, 1000, 1200, 1600];
                var m = modal('<div class="modal-head"><h3>Edit gambar</h3><button class="icon" type="button" data-x id="edX"><i class="fa-solid fa-xmark"></i></button></div>' +
                    '<div class="modal-body"><div class="ed"><div class="ed-stage"><canvas id="edC"></canvas></div><div class="ed-ctl">' +
                    '<div class="fld"><span class="lbl">Rasio potong</span><div class="chips" id="edAsp"></div></div>' +
                    '<div class="fld"><span class="lbl">Sisi terpanjang maksimum</span><div class="chips" id="edSize"></div></div>' +
                    '<div class="fld"><span class="lbl">Zoom <b id="edZv">100%</b></span><input type="range" id="edZ" min="100" max="300" value="100"><small>Seret gambar di kiri untuk menggeser area potong.</small></div>' +
                    '<div class="fld"><span class="lbl">Format</span><div class="chips" id="edFmt"></div></div>' +
                    '<div class="fld" id="edQw"><span class="lbl">Kualitas <b id="edQv">85%</b></span><input type="range" id="edQ" min="50" max="100" value="85"></div>' +
                    '<div class="ed-info" id="edInfo">Menghitung…</div></div></div></div>' +
                    '<div class="modal-foot"><button class="btn ghost" type="button" id="edCancel">Batal</button><button class="btn primary" type="button" id="edOk"><i class="fa-solid fa-cloud-arrow-up"></i> Gunakan &amp; Upload</button></div>', 'wide', true);
                var box = m.box, cv = $('#edC', box), ctx = cv.getContext('2d'), info = $('#edInfo', box);
                var lastBlob = null, estT;

                function dims() {
                    var a = st.aspect || iw / ih, w, h;
                    if (a >= 1) { w = st.max; h = st.max / a; } else { h = st.max; w = st.max * a; }
                    var s0 = Math.max(w / iw, h / ih);
                    if (s0 > 1) { w /= s0; h /= s0; }
                    return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
                }
                function limits(w, h) {
                    var s = Math.max(w / iw, h / ih) * st.zoom, dw = iw * s, dh = ih * s;
                    return { dw: dw, dh: dh, mx: Math.max(0, (dw - w) / 2), my: Math.max(0, (dh - h) / 2) };
                }
                function paint(c, w, h, k, bg) {
                    var g = c.getContext('2d'), L = limits(w, h);
                    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
                    g.setTransform(k, 0, 0, k, 0, 0);
                    if (bg) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
                    g.imageSmoothingQuality = 'high';
                    g.drawImage(img, (w - L.dw) / 2 + clamp(st.ox * w, -L.mx, L.mx), (h - L.dh) / 2 + clamp(st.oy * h, -L.my, L.my), L.dw, L.dh);
                }
                function redraw() {
                    var d = dims(), k = Math.min(1, 520 / d.w, 360 / d.h);
                    cv.width = Math.max(1, Math.round(d.w * k)); cv.height = Math.max(1, Math.round(d.h * k));
                    paint(cv, d.w, d.h, k, st.fmt === 'jpeg');
                    clearTimeout(estT); estT = setTimeout(estimate, 220);
                }
                function toBlob(cb) {
                    var d = dims(), c = document.createElement('canvas'); c.width = d.w; c.height = d.h;
                    paint(c, d.w, d.h, 1, st.fmt === 'jpeg');
                    c.toBlob(cb, 'image/' + st.fmt, st.q);
                }
                function estimate() {
                    toBlob(function (b) {
                        lastBlob = b; var d = dims();
                        if (!b) { info.textContent = 'Gagal memproses gambar.'; return; }
                        var big = b.size > 3.4e6;
                        info.className = 'ed-info' + (big ? ' warn' : '');
                        info.innerHTML = '<b>' + d.w + ' × ' + d.h + ' px</b> · ' + fmtSize(b.size) + ' · asli ' + iw + '×' + ih + ' (' + fmtSize(file.size) + ')' + (big ? '<br>Terlalu besar (maks 3.4 MB) — kecilkan ukuran atau kualitas.' : '');
                    });
                }
                function chips(id, items, isOn, onClick) {
                    var el = $(id, box);
                    el.innerHTML = items.map(function (x) { return '<button type="button" class="chip' + (isOn(x[0]) ? ' active' : '') + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('');
                    el.onclick = function (e) {
                        var c = e.target.closest('.chip'); if (!c) return;
                        onClick(c.dataset.v); chips(id, items, isOn, onClick); redraw();
                    };
                }
                chips('#edAsp', ASP, function (v) { return Math.abs(+v - st.aspect) < 0.001; }, function (v) { st.aspect = +v; st.ox = st.oy = 0; });
                chips('#edSize', SIZES.map(function (s) { return [s, s + 'px']; }), function (v) { return +v === st.max; }, function (v) { st.max = +v; });
                chips('#edFmt', [['jpeg', 'JPEG'], ['png', 'PNG'], ['webp', 'WebP']], function (v) { return v === st.fmt; }, function (v) { st.fmt = v; $('#edQw', box).style.display = v === 'png' ? 'none' : ''; });
                $('#edQw', box).style.display = st.fmt === 'png' ? 'none' : '';
                $('#edZ', box).oninput = function () { st.zoom = this.value / 100; $('#edZv', box).textContent = this.value + '%'; redraw(); };
                $('#edQ', box).oninput = function () { st.q = this.value / 100; $('#edQv', box).textContent = this.value + '%'; clearTimeout(estT); estT = setTimeout(estimate, 200); };

                var drag = null;
                cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
                cv.addEventListener('pointermove', function (e) {
                    if (!drag) return;
                    var d = dims(), L = limits(d.w, d.h);
                    st.ox += (e.clientX - drag.x) / cv.clientWidth; st.oy += (e.clientY - drag.y) / cv.clientHeight;
                    st.ox = clamp(st.ox, -L.mx / d.w, L.mx / d.w); st.oy = clamp(st.oy, -L.my / d.h, L.my / d.h);
                    drag.x = e.clientX; drag.y = e.clientY; redraw();
                });
                function endDrag() { drag = null; }
                cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

                function done(v) { URL.revokeObjectURL(srcUrl); m.close(); resolve(v); }
                $('#edX', box).addEventListener('click', function () { done(null); }, { once: true });
                $('#edCancel', box).addEventListener('click', function () { done(null); });
                $('#edOk', box).addEventListener('click', function () {
                    var ok = this; ok.disabled = true;
                    toBlob(async function (b) {
                        if (!b) { toast('Gagal memproses gambar.', 'err'); ok.disabled = false; return; }
                        if (b.size > 3.4e6) { toast('Gambar masih terlalu besar. Kecilkan ukuran/kualitas.', 'err'); ok.disabled = false; return; }
                        try {
                            var r = await api('/api/upload', { method: 'POST', headers: { 'content-type': b.type, 'x-name': encodeURIComponent(file.name.replace(/\.[^.]+$/, '') + '.' + (b.type.split('/')[1] || 'jpg')) }, body: b });
                            await refreshLibrary();
                            done(r.url);
                        } catch (ex) { toast(ex.message, 'err'); ok.disabled = false; }
                    });
                });
                redraw();
            }
        });
    }

    // ---------------------------------------------------------------- go
    boot();
})();
