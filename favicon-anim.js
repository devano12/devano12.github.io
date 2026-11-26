(function () {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }

    let angle = 0;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 26;

    function renderFrame() {
        ctx.clearRect(0, 0, size, size);

        // Dark circular base
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fillStyle = "#080c09";
        ctx.fill();

        // Dim background ring track
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(76, 175, 80, 0.2)";
        ctx.lineWidth = 5;
        ctx.stroke();

        // Main spinning glowing neon green arc
        ctx.save();
        ctx.shadowColor = "#00ff66";
        ctx.shadowBlur = 8;
        ctx.lineCap = "round";

        const segments = 14;
        const arcSpan = Math.PI * 1.25;
        for (let i = 0; i < segments; i++) {
            const t0 = i / segments;
            const t1 = (i + 1) / segments;
            const a0 = angle - arcSpan + t0 * arcSpan;
            const a1 = angle - arcSpan + t1 * arcSpan;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, a0, a1);
            const alpha = (0.12 + 0.88 * t1).toFixed(2);
            ctx.strokeStyle = i >= segments - 2
                ? `rgba(190, 255, 215, ${alpha})`
                : `rgba(0, 255, 110, ${alpha})`;
            ctx.lineWidth = 3.5 + 2.8 * t1;
            ctx.stroke();
        }

        // Bright leading spark dot
        const tipX = cx + Math.cos(angle) * radius;
        const tipY = cy + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = "#eafff2";
        ctx.fill();
        ctx.restore();

        // Crisp "DS" initials in center
        ctx.save();
        ctx.shadowColor = "rgba(0, 255, 110, 0.55)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 22px Montserrat, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("DS", cx, cy + 1.5);
        ctx.restore();

        link.type = "image/png";
        link.href = canvas.toDataURL("image/png");
        angle = (angle + 0.26) % (Math.PI * 2);
    }

    renderFrame();
    setInterval(renderFrame, 100);
})();
