(function () {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 991.98px)").matches;

    // =========================================================================
    // 1. TOP SCROLL PROGRESS BAR
    // =========================================================================
    const progressBar = document.createElement("div");
    progressBar.className = "scroll-progress-bar";
    document.body.appendChild(progressBar);

    function updateProgress() {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
        progressBar.style.transform = `scaleX(${pct})`;
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    // =========================================================================
    // 2. LENIS INERTIA SMOOTH SCROLL + GSAP SCROLLTRIGGER CHOREOGRAPHY
    //    (Inspired by AAA showcase sites like Where Winds Meet)
    // =========================================================================
    let lenis = null;
    if (!prefersReduced && typeof window.Lenis !== "undefined") {
        lenis = new window.Lenis({
            duration: 1.15,
            easing: function (t) {
                return Math.min(1, 1.001 - Math.pow(2, -10 * t));
            },
            smoothWheel: true,
            wheelMultiplier: 0.95,
            touchMultiplier: 1.5
        });

        // Smooth anchor navigation
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener("click", function (e) {
                const targetId = this.getAttribute("href");
                if (targetId === "#") {
                    e.preventDefault();
                    lenis.scrollTo(0, { duration: 1.2 });
                    return;
                }
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    lenis.scrollTo(targetEl, { offset: -20, duration: 1.25 });
                }
            });
        });
    }

    // Helper: split heading text into masked words for cinematic slice-up reveal
    function splitWordsIntoMasks(el) {
        if (!el || el.dataset.splitDone) return [];
        el.dataset.splitDone = "1";
        const text = el.textContent.trim();
        if (!text) return [];
        const words = text.split(/\s+/);
        el.innerHTML = words
            .map(
                (w) =>
                    `<span class="word-mask"><span class="word-inner">${w
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")}</span></span>`
            )
            .join(" ");
        return Array.from(el.querySelectorAll(".word-inner"));
    }

    if (!prefersReduced && typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined") {
        const gsap = window.gsap;
        const ScrollTrigger = window.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        if (lenis) {
            lenis.on("scroll", ScrollTrigger.update);
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (time) => {
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);
        }

        // --- A. HERO CINEMATIC ENTRANCE & MULTI-LAYER SCROLL PARALLAX ---
        const heroTitle = document.querySelector(".hero-title");
        const heroSubItems = document.querySelectorAll(".hero-stagger");
        const heroAvatarWrap = document.querySelector(".hero-avatar-wrap");
        const heroAvatar = document.querySelector(".hero-avatar");
        const heroSection = document.querySelector(".hero-section");

        if (heroTitle) {
            const titleWords = splitWordsIntoMasks(heroTitle);
            const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

            if (titleWords.length) {
                tl.from(titleWords, {
                    yPercent: 115,
                    rotateZ: 3,
                    opacity: 0,
                    duration: 1.05,
                    stagger: 0.09
                });
            }
            if (heroSubItems.length) {
                tl.from(
                    heroSubItems,
                    {
                        y: 34,
                        opacity: 0,
                        duration: 0.9,
                        stagger: 0.11
                    },
                    "-=0.65"
                );
            }
            if (heroAvatarWrap) {
                tl.from(
                    heroAvatarWrap,
                    {
                        scale: 0.86,
                        y: 40,
                        opacity: 0,
                        duration: 1.15,
                        ease: "expo.out"
                    },
                    "-=0.95"
                );
            }
        }

        // Continuous floating idle motion on avatar
        if (heroAvatar) {
            gsap.to(heroAvatar, {
                y: -10,
                duration: 3.2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        }

        // Multi-plane scroll-scrub parallax when scrolling away from Hero (Where Winds Meet depth feel)
        if (heroSection && !isMobile) {
            const heroLeft = document.querySelector(".hero-left-col");
            if (heroLeft) {
                gsap.to(heroLeft, {
                    yPercent: -22,
                    opacity: 0.25,
                    ease: "none",
                    scrollTrigger: {
                        trigger: heroSection,
                        start: "top top",
                        end: "bottom top",
                        scrub: 0.6
                    }
                });
            }
            if (heroAvatarWrap) {
                gsap.to(heroAvatarWrap, {
                    yPercent: 16,
                    scale: 0.92,
                    ease: "none",
                    scrollTrigger: {
                        trigger: heroSection,
                        start: "top top",
                        end: "bottom top",
                        scrub: 0.6
                    }
                });
            }

            // Mouse-move parallax depth in Hero
            heroSection.addEventListener(
                "mousemove",
                (e) => {
                    const nx = e.clientX / window.innerWidth - 0.5;
                    const ny = e.clientY / window.innerHeight - 0.5;
                    if (heroAvatarWrap) {
                        gsap.to(heroAvatarWrap, {
                            x: nx * -22,
                            rotationY: nx * 8,
                            rotationX: ny * -8,
                            transformPerspective: 900,
                            duration: 0.8,
                            ease: "power2.out",
                            overwrite: "auto"
                        });
                    }
                },
                { passive: true }
            );
        }

        // --- B. SECTION HEADINGS: MASKED WORD SLICE + EXPANDING ACCENT BAR ---
        document.querySelectorAll(".cinematic-heading").forEach((heading) => {
            const words = splitWordsIntoMasks(heading);
            if (!words.length) return;

            gsap.from(words, {
                yPercent: 115,
                opacity: 0,
                duration: 0.9,
                stagger: 0.045,
                ease: "power4.out",
                scrollTrigger: {
                    trigger: heading,
                    start: "top 86%",
                    toggleActions: "play none none reverse"
                }
            });
        });

        document.querySelectorAll(".section-accent-line").forEach((line) => {
            gsap.from(line, {
                scaleX: 0,
                opacity: 0,
                duration: 0.9,
                ease: "expo.out",
                scrollTrigger: {
                    trigger: line,
                    start: "top 88%",
                    toggleActions: "play none none reverse"
                }
            });
        });

        document.querySelectorAll(".cinematic-sub").forEach((sub) => {
            gsap.from(sub, {
                y: 28,
                opacity: 0,
                duration: 0.85,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: sub,
                    start: "top 88%",
                    toggleActions: "play none none reverse"
                }
            });
        });

        // --- C. STORY ROWS (#cases & #hobi): CURTAIN UNVEIL + CONTINUOUS INNER PARALLAX ---
        document.querySelectorAll(".story-row").forEach((row, idx) => {
            const textCol = row.querySelector(".story-text");
            const mediaFrame = row.querySelector(".parallax-frame");
            const innerImg = mediaFrame ? mediaFrame.querySelector("img") : null;
            const fromDir = idx % 2 === 1 ? 45 : -45;

            if (textCol) {
                gsap.from(textCol.children, {
                    y: 36,
                    x: isMobile ? 0 : fromDir * 0.45,
                    opacity: 0,
                    duration: 0.95,
                    stagger: 0.1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: row,
                        start: "top 82%",
                        toggleActions: "play none none reverse"
                    }
                });
            }

            if (mediaFrame) {
                gsap.fromTo(
                    mediaFrame,
                    {
                        clipPath: "inset(14% 10% 14% 10% round 14px)",
                        scale: 0.92,
                        opacity: 0
                    },
                    {
                        clipPath: "inset(0% 0% 0% 0% round 14px)",
                        scale: 1,
                        opacity: 1,
                        duration: 1.1,
                        ease: "expo.out",
                        scrollTrigger: {
                            trigger: row,
                            start: "top 82%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );

                // Continuous vertical scrub parallax inside the image window!
                if (innerImg) {
                    gsap.fromTo(
                        innerImg,
                        { yPercent: -7, scale: 1.06 },
                        {
                            yPercent: 7,
                            scale: 1.0,
                            ease: "none",
                            scrollTrigger: {
                                trigger: row,
                                start: "top bottom",
                                end: "bottom top",
                                scrub: true
                            }
                        }
                    );
                }
            }
        });

        // --- D. STAGGER CARDS (#github, #hobi, #contact, case study content) ---
        document.querySelectorAll(".cinematic-card").forEach((card, i) => {
            gsap.from(card, {
                y: 48,
                scale: 0.96,
                opacity: 0,
                duration: 0.95,
                delay: (i % 2) * 0.12,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 86%",
                    toggleActions: "play none none reverse"
                }
            });

            // Subtle 3D hover tilt on desktop for repository cards
            if (!isMobile && card.classList.contains("tilt-card")) {
                const inner = card.querySelector(".testimonial-card") || card;
                card.addEventListener("mousemove", (e) => {
                    const r = card.getBoundingClientRect();
                    const px = (e.clientX - r.left) / r.width - 0.5;
                    const py = (e.clientY - r.top) / r.height - 0.5;
                    gsap.to(inner, {
                        rotationY: px * 9,
                        rotationX: py * -9,
                        y: -6,
                        transformPerspective: 800,
                        duration: 0.35,
                        ease: "power2.out"
                    });
                });
                card.addEventListener("mouseleave", () => {
                    gsap.to(inner, {
                        rotationY: 0,
                        rotationX: 0,
                        y: 0,
                        duration: 0.6,
                        ease: "elastic.out(1, 0.6)"
                    });
                });
            }
        });
    }

    // =========================================================================
    // 3. INTERACTIVE 60FPS AURORA CONSTELLATION CANVAS FOR .dark-stage
    // =========================================================================
    const stages = document.querySelectorAll(".dark-stage");
    stages.forEach((stage) => {
        const canvas = document.createElement("canvas");
        canvas.className = "constellation-canvas";
        canvas.setAttribute("aria-hidden", "true");
        stage.insertBefore(canvas, stage.firstChild);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let particles = [];
        let isVisible = true;
        const mouse = { x: -9999, y: -9999, active: false };

        function initParticles() {
            const area = width * height;
            const targetCount = isMobile
                ? Math.min(22, Math.max(12, Math.floor(area / 23000)))
                : Math.min(52, Math.max(24, Math.floor(area / 19000)));

            particles = [];
            for (let i = 0; i < targetCount; i++) {
                const isCyan = i % 3 !== 0;
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.38,
                    vy: (Math.random() - 0.5) * 0.38,
                    r: Math.random() * 1.5 + 0.9,
                    color: isCyan ? "0, 195, 255" : "76, 230, 145",
                    alpha: Math.random() * 0.35 + 0.22
                });
            }
        }

        function resize() {
            const rect = stage.getBoundingClientRect();
            width = Math.max(1, rect.width);
            height = Math.max(1, rect.height);
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            initParticles();
        }

        resize();
        window.addEventListener("resize", resize, { passive: true });

        stage.addEventListener(
            "mousemove",
            (e) => {
                const rect = stage.getBoundingClientRect();
                mouse.x = e.clientX - rect.left;
                mouse.y = e.clientY - rect.top;
                mouse.active = true;
            },
            { passive: true }
        );

        stage.addEventListener(
            "mouseleave",
            () => {
                mouse.active = false;
            },
            { passive: true }
        );

        if ("IntersectionObserver" in window) {
            const visObs = new IntersectionObserver(
                (entries) => {
                    isVisible = entries[0].isIntersecting;
                },
                { threshold: 0.01 }
            );
            visObs.observe(stage);
        }

        const linkDist = isMobile ? 105 : 135;
        const mouseDist = 165;

        function animate() {
            if (isVisible) {
                ctx.clearRect(0, 0, width, height);

                for (let i = 0; i < particles.length; i++) {
                    const p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;

                    if (p.x < 0) p.x = width;
                    else if (p.x > width) p.x = 0;
                    if (p.y < 0) p.y = height;
                    else if (p.y > height) p.y = 0;

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
                    ctx.fill();

                    for (let j = i + 1; j < particles.length; j++) {
                        const q = particles[j];
                        const dx = p.x - q.x;
                        const dy = p.y - q.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < linkDist * linkDist) {
                            const dist = Math.sqrt(distSq);
                            const lineAlpha = (1 - dist / linkDist) * 0.13;
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(q.x, q.y);
                            ctx.strokeStyle = `rgba(0, 195, 255, ${lineAlpha.toFixed(3)})`;
                            ctx.lineWidth = 0.8;
                            ctx.stroke();
                        }
                    }

                    if (mouse.active) {
                        const mdx = p.x - mouse.x;
                        const mdy = p.y - mouse.y;
                        const mDistSq = mdx * mdx + mdy * mdy;
                        if (mDistSq < mouseDist * mouseDist) {
                            const mDist = Math.sqrt(mDistSq);
                            const mAlpha = (1 - mDist / mouseDist) * 0.24;
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(mouse.x, mouse.y);
                            ctx.strokeStyle = `rgba(90, 225, 255, ${mAlpha.toFixed(3)})`;
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        }
                    }
                }
            }
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    });
})();
