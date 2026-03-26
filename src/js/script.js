// Ativador da permissão de audio no mobile
const audio = new Audio("src/audios/check.ogg");

function unlockAudio() {
    audio.play()
        .then(() => {
            audio.pause();
            audio.currentTime = 0;
            console.log("Áudio desbloqueado");
        })
        .catch(() => { });
}

document.addEventListener("click", unlockAudio, { once: true });

// SISTEMAS BASICOS -------------------------------------------
// SISTEMAS BASICOS -------------------------------------------
// SISTEMAS BASICOS -------------------------------------------

const lista = document.getElementById('tarefas_container');
const tarefas_container = lista.querySelector('ul');

function delay(ms) { return new Promise(r => setTimeout(r, ms)); };

const timers = {};

function setTimer(nome, fn, tempo) {
    clearTimeout(timers[nome]);
    timers[nome] = setTimeout(fn, tempo);
};

const tarefas_array = (JSON.parse(localStorage.getItem('tarefas_array')) ?? []);

let historico_feitos = +localStorage.getItem('historico_feitos');

let todos = tarefas_array.length;
let feitos = 0;
let porcentagem;


navigator.serviceWorker.register("sw.js").then(reg => {
    // força verificar update
    setInterval(() => {
        reg.update();
    }, 30000);

    reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;

        newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                    console.log("Nova versão!");
                    window.location.reload();
                }
            }
        });
    });
});


// AUDIOS ------------------------------
// AUDIOS ------------------------------
// AUDIOS ------------------------------

const sons = {
    lapis: {
        som: document.getElementById('som_criando_tarefa'),
        volume: 0.5,
    },
    check: {
        som: document.getElementById('som_check'),
        volume: 0.5,
    },
    fire_start: {
        som: document.getElementById('som_fire_start'),
        volume: 0.7,
    },
    fire_end: {
        som: document.getElementById('som_fire_end'),
        volume: 0.7
    },
    progress: {
        som: document.getElementById('som_progress'),
        volume: 1,
    },
    completo: {
        som: document.getElementById('som_completo'),
        volume: 1,
    },
    confete: {
        som: document.getElementById('som_confete'),
        volume: 1,
    },
}

function tocarSom(src, time) {
    const audio = src.som;

    audio.volume = src.volume;
    audio.currentTime = time ?? 0;
    audio.play();
}

// CRIANDO E APAGANDO TAREFAS ------------------------------
// CRIANDO E APAGANDO TAREFAS ------------------------------
// CRIANDO E APAGANDO TAREFAS ------------------------------

const input_container = document.getElementById('input_container');
const campo_digitacao = input_container.querySelector('input');
const adicionar_btn = input_container.querySelector('button');
const apagar_tudo_btn = document.getElementById('delete_all');
const apagar_tudo_alerta = document.getElementById('delete_alerta');
const footer = document.querySelector('footer');
const footer_span = footer.querySelector('span');

if (historico_feitos > 0) {
    if (footer.classList.contains('nada')) footer.classList.remove('nada');
    footer_span.textContent = historico_feitos;
}

adicionar_btn.addEventListener('click', () => { add() });
campo_digitacao.addEventListener('keyup', (event) => { if (event.key === 'Enter') add(); });

function add() {
    const texto = campo_digitacao.value.trim();

    if (!texto) {
        campo_digitacao.classList.add('erro');
        return
    };

    if (campo_digitacao.classList.contains('erro')) campo_digitacao.classList.remove('erro');

    criandoTarefa(texto);

    campo_digitacao.value = '';

    lista.scrollTo({
        top: lista.scrollHeight,
        behavior: 'smooth',
    });
}

function criandoTarefa(tarefa) {

    const criando = ({
        titulo: tarefa,
        feito: false,
        id: Date.now() + Math.random()
    });

    render(criando, true);

    tarefas_array.push(criando);

    setTimer('save', () => {
        localStorage.setItem('tarefas_array', JSON.stringify(tarefas_array));
    }, 500);

    tocarSom(sons.lapis);
    todos++;

    progressoBarra(true);
};

function render(tarefa, novo) {
    const fragment = document.createDocumentFragment();
    const novosItens = [];

    // Separa os itens salvos para serem renderizados separadamente
    if (tarefa.length > 1) {
        const feitos_verificacao = tarefa.filter(el => el.feito == true);
        feitos = feitos_verificacao.length;

        tarefa.forEach((el) => {
            ren(el);

            if (feitos_verificacao.length) {
                setTimer('timeoutRender', () => {
                    progressoBarra(true);
                }, 1000);
            };
        });
    }
    else ren(tarefa[0] ?? tarefa);

    function ren(el) {
        const li = document.createElement('li');
        li.setAttribute('id', el.id);
        if (novo) {
            novosItens.push(li);
            li.classList.add('recem_criado');
        };

        const checkbox_input = document.createElement('input');
        checkbox_input.type = 'checkbox';
        checkbox_input.checked = el.feito;

        const checkbox_div = document.createElement('div');
        checkbox_div.classList.add('checkbox');
        checkbox_div.innerHTML = '<svg><use href="#icon_correct" /></svg>';

        const span = document.createElement('span');
        span.textContent = el.titulo;

        const coin_div = document.createElement('div');
        coin_div.classList.add('coin');
        coin_div.innerHTML = '<svg><use href="#icon_coin" /></svg>';

        li.append(checkbox_input);
        li.append(checkbox_div);
        li.append(span);
        li.append(coin_div);

        fragment.append(li);
    }

    tarefas_container.append(fragment);

    if (novo) { requestAnimationFrame(() => { novosItens.forEach(li => { li.classList.remove('recem_criado'); }); }); };

    if (todos > 0 && !lista.classList.contains('pronto')) {
        console.log('pronto');
        lista.classList.add('pronto');
    };

    if (apagar_tudo_btn.classList.contains('escondido')) apagar_tudo_btn.classList.remove('escondido');
};

lista.addEventListener('change', (click) => {
    if (click.target.type !== 'checkbox') return;

    const id = click.target.closest('li').id;

    tarefas_array.find(el => el.id == id).feito = true;

    tocarSom(sons.check);

    feitos++
    historico_feitos++

    if (footer.classList.contains('nada')) footer.classList.remove('nada');
    footer_span.textContent = historico_feitos;

    setTimer('save', () => {
        localStorage.setItem('tarefas_array', JSON.stringify(tarefas_array));
        localStorage.setItem('historico_feitos', historico_feitos);
        progressoBarra();
    }, 500);
});

apagar_tudo_btn.addEventListener('click', () => { apagar_tudo_alerta.classList.add('aberto'); });

apagar_tudo_alerta.addEventListener('click', (click) => {
    const target = click.target.closest('button');

    if (!target) return;

    const btn = target.id;

    if (btn === "confirmar") reset();

    apagar_tudo_alerta.classList.remove('aberto');
});

function reset() {
    tarefas_array.length = 0;

    localStorage.removeItem('tarefas_array');

    tarefas_container.innerHTML = '';

    barra_desprogresso.style.transform = `scaleX(1)`;

    barra_progresso.style.background = ``;

    barra_progresso.classList.remove('completo');

    barra_progresso.classList.remove('idle');

    streackArray = [false, false, false, false];

    span.textContent = 0;

    feitos = 0;
    todos = 0;

    lista.classList.remove('pronto');

    apagar_tudo_btn.classList.add('escondido');
}

// BARRA DE PROGRESSO -----------------------------
// BARRA DE PROGRESSO -----------------------------
// BARRA DE PROGRESSO -----------------------------

const barra_progresso = document.getElementById('barra_progresso');
const barra_desprogresso = barra_progresso.querySelector('#barra_desprogresso');

const cores_progresso = ["#ff3b3b", "#ff7a00", "#ffe600", "#00ff9f", "#00e0ff"]

async function progressoBarra(renderizando) {
    porcentagem = (feitos / todos) * 100;

    let background = ``;

    if (!renderizando) {
        barra_progresso.classList.add('ativo');

        tocarSom(sons.progress, 0.4);
    };

    barra_desprogresso.style.transform = `scaleX(${(100 - porcentagem) / 100})`;

    for (let i = 0; i < cores_progresso.length; i++) {
        if (porcentagem > 95 && i == cores_progresso.length - 1) {

            if (!renderizando) {
                boom();
                setTimeout(boom, 300);
                setTimeout(boom, 600);

                setTimeout(() => {
                    tocarSom(sons.completo)
                }, 500)
            };

            await delay(1000);

            barra_progresso.classList.add('completo');

            await delay(1000);

            barra_progresso.classList.remove('completo');
            barra_progresso.classList.add('idle');
        }
        else if (porcentagem >= 5 && i == 0) background += cores_progresso[0];
        else if (porcentagem >= (i + 1) * 20) background += `, ${cores_progresso[i]}`;
    };

    barra_progresso.style.background = `linear-gradient(90deg, ${background})`;

    if (!renderizando) {
        setTimer('msgMotivacional', () => {
            mensagemMotivacional(todos, feitos);
        }, 1500)

        setTimer('timeoutProgresso', () => {
            barra_progresso.classList.remove('ativo');
        }, 2500);
    };
};

// MENSAGEM MOTIVACIONAL ----------------------------
// MENSAGEM MOTIVACIONAL ----------------------------
// MENSAGEM MOTIVACIONAL ----------------------------

const msg_motivacional = document.getElementById('msg_motivacional');
const span = msg_motivacional.querySelector('span');
const linha_msg_motivacional = document.getElementById('separacao_mensagem_motivacional');
const array_msg_motivacionais = ["Você tá voando", "Boa!!", "Mais uma", "Disciplina > motivação"];

async function mensagemMotivacional() {
    const aleatorizado = Math.floor(Math.random() * array_msg_motivacionais.length);

    lista.scrollTo({
        top: 0,
        behavior: 'smooth',
    });

    await delay(500);

    span.textContent = array_msg_motivacionais[aleatorizado];

    if (aleatorizado === 0) span.innerHTML += '<svg><use href="#icon_foguete" /></svg>';

    msg_motivacional.classList.add('aberto');
    linha_msg_motivacional.classList.add('aberto');

    setTimer('timeoutLista', () => {
        lista.querySelectorAll('.aberto').forEach((el) => {
            el.classList.remove('aberto');
        })
    }, 4000);

    setTimer('streakVerificacao', () => {
        streakVerificacao();
    }, 2500);

}

// STREAK -----------------------------------------
// STREAK -----------------------------------------
// STREAK -----------------------------------------

const streak = document.getElementById('sequencia');
let streackArray = [false, false, false, false];

async function streakVerificacao() {

    let play = false;

    for (let i = 0; i < streackArray.length; i++) {
        if (porcentagem >= (i + 1) * 20 && streackArray[i] == false) {
            streackArray[i] = true;
            play = true;
            console.log('----------');
            console.log(streackArray[i]);
            console.log(i + 1);
            console.log(porcentagem);
            console.log((i + 1) * 20);
        }
    };

    if (play) {
        tocarSom(sons.fire_start);

        streak.classList.add('streak');

        await delay(700);

        streak.querySelector('span').textContent = feitos;
        streak.querySelector('span').classList.add('pop');

        setTimer('timeoutStreak', () => {
            tocarSom(sons.fire_end);
            streak.classList.remove('streak');
            streak.querySelector('span').classList.remove('pop');
        }, 3000);
    };
};

// Inicio automatico
if (tarefas_array.length > 0) render(tarefas_array);


// CONFETTI -----------------------------
// CONFETTI -----------------------------
// CONFETTI -----------------------------

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

// SISTEMA DE NIVEIS NAS MENSAGENS MOTIVACIONAIS
// VARIAÇÃO DE SONS
// CONFETES
// MARCAR E DESMARCA TAREFAS (BARRA PODE VOLTAR)
// ----------------- GAME -------------------------
// STREAK DIARIO
// TOTAL DE TAREFAS COMPLETADAS AO TODO
// SISTEMA DE NIVEL + RECOMPENSA (EX: NOVAS CORES, SONS, EFEITOS)
// SISTEMA DE DESAFIOS