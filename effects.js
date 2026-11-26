(function () {
    // 1. Smooth 60fps Scroll-Up Reveal (IntersectionObserver)
    const revealEls = document.querySelectorAll(".reveal-up");
    if ("IntersectionObserver" in window && revealEls.length > 0) {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                    } else if (entry.boundingClientRect.top > 40) {
                        // Reset only when element is below the viewport so scrolling down replays smoothly
                        entry.target.classList.remove("is-visible");
                    }
                }
            },
            {
                threshold: 0.1,
                rootMargin: "0px 0px -35px 0px"
            }
        );

        revealEls.forEach((el) => revealObserver.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    // 2. Interactive 60fps Aurora Constellation Canvas for .dark-stage sections
    const stages = document.querySelectorAll(".dark-stage");
    if (!stages.length) return;

    const isMobile = window.matchMedia("(max-width: 767.98px)").matches;

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
                ? Math.min(24, Math.max(12, Math.floor(area / 22000)))
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

                    // Draw particle dot
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
                    ctx.fill();

                    // Connect nearby particles
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

                    // Subtle interactive connection to mouse cursor
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
