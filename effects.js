(function () {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 991.98px)").matches;

    // =========================================================================
    // 1. PREPARE MASKED WORD HEADINGS & STAGGERED GPU REVEAL CLASSES
    //    (100% CSS compositor transform + opacity -> 0ms main-thread scroll cost!)
    // =========================================================================
    function splitWords(el) {
        if (!el || el.dataset.splitDone) return;
        el.dataset.splitDone = "1";
        const text = el.textContent.trim();
        if (!text) return;
        const words = text.split(/\s+/);
        el.innerHTML = words
            .map(
                (w, idx) =>
                    `<span class="word-mask"><span class="word-inner" style="--w-delay:${idx * 42}ms">${w
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")}</span></span>`
            )
            .join(" ");
    }

    const observedTargets = [];

    document.querySelectorAll(".hero-title, .cinematic-heading").forEach((el) => {
        splitWords(el);
        observedTargets.push(el);
    });

    document.querySelectorAll(".section-accent-line").forEach((el) => {
        observedTargets.push(el);
    });

    document.querySelectorAll(".hero-stagger").forEach((el, idx) => {
        el.classList.add("anim-rise");
        el.style.setProperty("--delay", `${90 + idx * 85}ms`);
        observedTargets.push(el);
    });

    const heroAvatarWrap = document.querySelector(".hero-avatar-wrap");
    if (heroAvatarWrap) {
        heroAvatarWrap.classList.add("anim-scale");
        heroAvatarWrap.style.setProperty("--delay", "110ms");
        observedTargets.push(heroAvatarWrap);
    }

    document.querySelectorAll(".cinematic-sub").forEach((el) => {
        el.classList.add("anim-rise");
        el.style.setProperty("--delay", "80ms");
        observedTargets.push(el);
    });

    document.querySelectorAll(".story-row").forEach((row, idx) => {
        row.classList.add("anim-rise");
        row.style.setProperty("--delay", `${(idx % 2) * 90}ms`);
        observedTargets.push(row);
    });

    document.querySelectorAll(".cinematic-card").forEach((card, idx) => {
        card.classList.add("anim-scale");
        card.style.setProperty("--delay", `${(idx % 2) * 100}ms`);
        observedTargets.push(card);
    });

    if (!prefersReduced && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(
            (entries) => {
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-inview");
                    } else if (entry.boundingClientRect.top > 60) {
                        // Replay smoothly when scrolling back down from above
                        entry.target.classList.remove("is-inview");
                    }
                }
            },
            { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
        );
        observedTargets.forEach((el) => io.observe(el));
    } else {
        observedTargets.forEach((el) => el.classList.add("is-inview"));
    }

    // =========================================================================
    // 2. FEATHER-LIGHT PASSIVE SCROLL PARALLAX + TOP PROGRESS BAR
    //    (Runs ONLY during active scroll frames via single rAF gate — zero wheel lag!)
    // =========================================================================
    const progressBar = document.createElement("div");
    progressBar.className = "scroll-progress-bar";
    document.body.appendChild(progressBar);

    const parallaxImgs = prefersReduced ? [] : Array.from(document.querySelectorAll(".parallax-frame > img"));
    const heroLeft = !prefersReduced && !isMobile ? document.querySelector(".hero-left-col") : null;
    const heroSec = document.querySelector(".hero-section");

    let scrollTicking = false;
    function onScrollFrame() {
        scrollTicking = false;
        const scrollY = window.scrollY;
        const vh = window.innerHeight || 1;
        const docH = document.documentElement.scrollHeight - vh;
        const pct = docH > 0 ? Math.min(1, Math.max(0, scrollY / docH)) : 0;
        progressBar.style.transform = `scaleX(${pct})`;

        if (heroLeft && heroSec && scrollY < vh * 1.2) {
            const p = Math.min(1, Math.max(0, scrollY / vh));
            heroLeft.style.transform = `translate3d(0, ${(p * -24).toFixed(1)}px, 0)`;
            if (heroAvatarWrap && heroAvatarWrap.classList.contains("is-inview")) {
                heroAvatarWrap.style.transform = `translate3d(0, ${(p * -12).toFixed(1)}px, 0)`;
            }
        }

        for (let i = 0; i < parallaxImgs.length; i++) {
            const img = parallaxImgs[i];
            const rect = img.parentElement.getBoundingClientRect();
            if (rect.bottom > -50 && rect.top < vh + 50) {
                const progress = (vh - rect.top) / (vh + rect.height); // 0 -> 1
                const shift = (progress - 0.5) * 34; // -17px to +17px smooth inner parallax
                img.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
            }
        }
    }

    window.addEventListener(
        "scroll",
        () => {
            if (!scrollTicking) {
                scrollTicking = true;
                requestAnimationFrame(onScrollFrame);
            }
        },
        { passive: true }
    );
    onScrollFrame();

    // Subtle 3D hover tilt on desktop for repository cards (lightweight CSS transform)
    if (!prefersReduced && !isMobile) {
        document.querySelectorAll(".tilt-card").forEach((card) => {
            const inner = card.querySelector(".testimonial-card");
            if (!inner) return;
            card.addEventListener(
                "mousemove",
                (e) => {
                    const r = card.getBoundingClientRect();
                    const px = (e.clientX - r.left) / r.width - 0.5;
                    const py = (e.clientY - r.top) / r.height - 0.5;
                    inner.style.transform = `perspective(800px) rotateY(${(px * 7).toFixed(2)}deg) rotateX(${(py * -7).toFixed(2)}deg) translate3d(0, -4px, 0)`;
                },
                { passive: true }
            );
            card.addEventListener(
                "mouseleave",
                () => {
                    inner.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translate3d(0, 0, 0)";
                },
                { passive: true }
            );
        });
    }

    // =========================================================================
    // 3. SINGLE UNIFIED BATCHED CANVAS LOOP (dpr=1, 2 batched stroke/fill calls!)
    //    Uses ~0.15ms per frame instead of multiple heavy loops!
    // =========================================================================
    if (prefersReduced) return;

    const stageStates = [];
    document.querySelectorAll(".dark-stage").forEach((stage) => {
        const canvas = document.createElement("canvas");
        canvas.className = "constellation-canvas";
        canvas.setAttribute("aria-hidden", "true");
        stage.insertBefore(canvas, stage.firstChild);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const state = {
            stage,
            canvas,
            ctx,
            w: 1,
            h: 1,
            visible: false,
            particles: [],
            mouseX: -9999,
            mouseY: -9999,
            mouseActive: false
        };

        function resize() {
            const rect = stage.getBoundingClientRect();
            state.w = Math.max(1, Math.floor(rect.width));
            state.h = Math.max(1, Math.floor(rect.height));
            canvas.width = state.w;
            canvas.height = state.h;

            const count = isMobile ? 14 : 28;
            state.particles = [];
            for (let i = 0; i < count; i++) {
                state.particles.push({
                    x: Math.random() * state.w,
                    y: Math.random() * state.h,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r: Math.random() * 1.3 + 1.0
                });
            }
        }

        resize();
        window.addEventListener("resize", resize, { passive: true });

        if (!isMobile) {
            stage.addEventListener(
                "mousemove",
                (e) => {
                    const rect = stage.getBoundingClientRect();
                    state.mouseX = e.clientX - rect.left;
                    state.mouseY = e.clientY - rect.top;
                    state.mouseActive = true;
                },
                { passive: true }
            );
            stage.addEventListener(
                "mouseleave",
                () => {
                    state.mouseActive = false;
                },
                { passive: true }
            );
        }

        if ("IntersectionObserver" in window) {
            const vo = new IntersectionObserver(
                (entries) => {
                    state.visible = entries[0].isIntersecting;
                },
                { threshold: 0.01 }
            );
            vo.observe(stage);
        } else {
            state.visible = true;
        }

        stageStates.push(state);
    });

    const maxDistSq = (isMobile ? 105 : 130) ** 2;
    const mouseDistSq = 155 ** 2;

    function tickConstellations() {
        for (let s = 0; s < stageStates.length; s++) {
            const st = stageStates[s];
            if (!st.visible) continue;

            const ctx = st.ctx;
            const pts = st.particles;
            const len = pts.length;
            ctx.clearRect(0, 0, st.w, st.h);

            // Batch 1: All particle dots in ONE single fill call
            ctx.fillStyle = "rgba(70, 210, 255, 0.48)";
            ctx.beginPath();
            for (let i = 0; i < len; i++) {
                const p = pts[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = st.w;
                else if (p.x > st.w) p.x = 0;
                if (p.y < 0) p.y = st.h;
                else if (p.y > st.h) p.y = 0;

                ctx.moveTo(p.x + p.r, p.y);
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            }
            ctx.fill();

            // Batch 2: All connecting lines in ONE single stroke call
            ctx.strokeStyle = "rgba(0, 195, 255, 0.09)";
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            for (let i = 0; i < len; i++) {
                const p = pts[i];
                for (let j = i + 1; j < len; j++) {
                    const q = pts[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    if (dx * dx + dy * dy < maxDistSq) {
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                    }
                }
            }
            ctx.stroke();

            // Batch 3: Mouse connections in ONE single stroke call
            if (st.mouseActive) {
                ctx.strokeStyle = "rgba(100, 230, 255, 0.2)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < len; i++) {
                    const p = pts[i];
                    const mdx = p.x - st.mouseX;
                    const mdy = p.y - st.mouseY;
                    if (mdx * mdx + mdy * mdy < mouseDistSq) {
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(st.mouseX, st.mouseY);
                    }
                }
                ctx.stroke();
            }
        }
        requestAnimationFrame(tickConstellations);
    }

    requestAnimationFrame(tickConstellations);
})();
