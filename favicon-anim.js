(function () {
    // Firefox animates favicon.svg natively via GPU-composited SMIL at full 60/120/144fps
    if (/Firefox\//i.test(navigator.userAgent)) return;

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

    const cx = size / 2;
    const cy = size / 2;
    const radius = 25.5;
    const periodMs = 1350;
    let lastUpdate = 0;

    function tick(now) {
        if (now - lastUpdate >= 16) {
            lastUpdate = now;
            const angle = ((now % periodMs) / periodMs) * Math.PI * 2;

            ctx.clearRect(0, 0, size, size);

            ctx.beginPath();
            ctx.arc(cx, cy, 30, 0, Math.PI * 2);
            ctx.fillStyle = "#080c09";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#18361f";
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.save();
            ctx.shadowColor = "#00ff66";
            ctx.shadowBlur = 7;
            ctx.lineCap = "round";

            if (typeof ctx.createConicGradient === "function") {
                const grad = ctx.createConicGradient(angle, cx, cy);
                grad.addColorStop(0, "rgba(0, 200, 83, 0)");
                grad.addColorStop(0.35, "rgba(0, 200, 83, 0)");
                grad.addColorStop(0.75, "rgba(0, 230, 118, 0.6)");
                grad.addColorStop(0.96, "#00ff88");
                grad.addColorStop(1, "#eafff2");
                ctx.beginPath();
                ctx.arc(cx, cy, radius, angle + Math.PI * 0.75, angle + Math.PI * 2);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 5.5;
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, radius, angle - Math.PI * 1.25, angle);
                ctx.strokeStyle = "#00ff88";
                ctx.lineWidth = 5.5;
                ctx.stroke();
            }

            const tipX = cx + Math.cos(angle) * radius;
            const tipY = cy + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 3.1, 0, Math.PI * 2);
            ctx.fillStyle = "#eafff2";
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.shadowColor = "rgba(0, 255, 110, 0.5)";
            ctx.shadowBlur = 3;
            ctx.fillStyle = "#ffffff";
            ctx.font = "900 21px Montserrat, Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("DS", cx, cy + 1.5);
            ctx.restore();

            link.type = "image/png";
            link.href = canvas.toDataURL("image/png");
        }
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();
