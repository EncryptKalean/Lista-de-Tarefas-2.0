// OBS: Não fui eu que fiz essa parte do codigo.

const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");

let W, H;
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const COLORS = ["#f00", "#0f0", "#00f", "#ff0", "#0ff", "#f0f"];

const CONFETTI_COUNT = 40; // 🔥 leve + bonito

let confetti = [];

function createConfetti() {
    const angle = Math.random() * Math.PI - Math.PI; // cone pra cima
    const force = Math.random() * 10 + 8;

    return {
        x: W / 2,
        y: H,

        size: Math.random() * 6 + 2,

        speedX: Math.cos(angle) * force,
        speedY: Math.sin(angle) * force,

        gravity: 0.15,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360
    };
}

function boom() {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
        confetti.push(createConfetti());
    }
    tocarSom(sons.confete);
}

function update() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < confetti.length; i++) {
        let c = confetti[i];

        // física
        c.speedY += c.gravity;
        c.speedX *= 0.99; // resistência do ar
        c.speedY *= 0.99;

        c.y += c.speedY;
        c.x += c.speedX;

        // leve efeito visual
        c.size *= 0.995;

        // desenha
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation * Math.PI / 180);

        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);

        ctx.restore();

        // remove quando sai da tela (ESSENCIAL)
        if (c.y > H + 20) {
            confetti.splice(i, 1);
            i--;
        }
    }

    setTimeout(() => requestAnimationFrame(update), 30);
}

update();