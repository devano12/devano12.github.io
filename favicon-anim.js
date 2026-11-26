(function () {
    // Firefox & Zen Browser play the 50fps infinite-loop APNG (favicon.png) natively in C++ without ever stopping!
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
    const totalFrames = 48;
    const preRendered = [];

    function drawAngle(angle) {
        ctx.clearRect(0, 0, size, size);

        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fillStyle = "#060b16";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#102c54";
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.save();
        ctx.shadowColor = "#00b7ff";
        ctx.shadowBlur = 7;
        ctx.lineCap = "round";

        if (typeof ctx.createConicGradient === "function") {
            const grad = ctx.createConicGradient(angle, cx, cy);
            grad.addColorStop(0, "rgba(0, 85, 255, 0)");
            grad.addColorStop(0.3, "rgba(0, 85, 255, 0)");
            grad.addColorStop(0.72, "rgba(0, 153, 255, 0.65)");
            grad.addColorStop(0.95, "#00d8ff");
            grad.addColorStop(1, "#ebfcff");
            ctx.beginPath();
            ctx.arc(cx, cy, radius, angle + Math.PI * 0.6, angle + Math.PI * 2);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 5.5;
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, angle - Math.PI * 1.4, angle);
            ctx.strokeStyle = "#00d8ff";
            ctx.lineWidth = 5.5;
            ctx.stroke();
        }

        const tipX = cx + Math.cos(angle) * radius;
        const tipY = cy + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3.1, 0, Math.PI * 2);
        ctx.fillStyle = "#ebfcff";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = "rgba(0, 170, 255, 0.65)";
        ctx.shadowBlur = 3.5;
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 21px Montserrat, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("DS", cx, cy + 1.5);
        ctx.restore();

        return canvas.toDataURL("image/png");
    }

    for (let i = 0; i < totalFrames; i++) {
        preRendered.push(drawAngle((i / totalFrames) * Math.PI * 2));
    }

    let frameIdx = 0;
    function step() {
        link.type = "image/png";
        link.href = preRendered[frameIdx];
        frameIdx = (frameIdx + 1) % totalFrames;
    }

    // Use a Web Worker timer so Chromium never pauses or throttles the icon when switching tabs or windows
    try {
        const blob = new Blob(["setInterval(() => postMessage(0), 25);"], { type: "application/javascript" });
        const worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = step;
    } catch (e) {
        setInterval(step, 25);
    }
})();
