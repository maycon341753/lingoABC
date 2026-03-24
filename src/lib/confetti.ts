// Simple confetti effect using canvas
const confetti = () => {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;
  const colors = ["#58cc02", "#ce82ff", "#ff4b4b", "#ffc800", "#1cb0f6", "#ff9600"];

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    w: Math.random() * 10 + 5,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 4 + 2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
  }));

  let frame = 0;
  const maxFrames = 120;

  const animate = () => {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  };

  requestAnimationFrame(animate);
};

export default confetti;
