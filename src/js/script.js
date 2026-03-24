// SISTEMAS BASICOS -------------------------------------------

const lista = document.querySelector('#core ul');
const tarefas_container = lista.querySelector('#tarefas_container');

function delay(ms) { return new Promise(r => setTimeout(r, ms)); };

const timers = {};

function setTimer(nome, fn, tempo) {
    clearTimeout(timers[nome]);
    timers[nome] = setTimeout(fn, tempo);
};

const tarefas_array = (JSON.parse(localStorage.getItem('tarefas_array')) ?? []);

let todos = tarefas_array.length;
let feitos = 0;
let porcentagem;

if (tarefas_array.length > 0) render(tarefas_array);


// AUDIOS ------------------------------
// AUDIOS ------------------------------
// AUDIOS ------------------------------

const som_criando_tarefa = document.getElementById('som_criando_tarefa');
const som_check = document.getElementById('som_check');
const som_fire_start = document.getElementById('som_fire_start');
const som_fire_end = document.getElementById('som_fire_end');
const som_progress = document.getElementById('som_progress');
const som_completo = document.getElementById('som_completo');

const audio = new Audio("src/audios/create.ogg");

document.addEventListener("click", () => {
    audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
    }).catch(() => { });
}, { once: true });

function tocarSom(audio, time) {
    audio.currentTime = time ?? 0;
    audio.volume = 1;
    audio.play()
        .then(() => document.querySelector('header p').textContent = "TOCOU")
        .catch(err => document.querySelector('header p').textContent = "ERRO AUDIO:", err);
    // audio.play();
}

// CRIANDO E APAGANDO TAREFAS ------------------------------
// CRIANDO TAREFA ------------------------------
// CRIANDO TAREFA ------------------------------

const input_container = document.getElementById('input_container');
const campo_digitacao = input_container.querySelector('input');
const adicionar_btn = input_container.querySelector('button');
const apagar_tudo_btn = document.getElementById('delete_all');
const apagar_tudo_alerta = document.getElementById('delete_alerta');

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
}

function criandoTarefa(tarefa) {

    const criando = ({
        titulo: tarefa,
        feito: false,
        id: crypto.randomUUID()
    });

    render(criando, true);

    tarefas_array.push(criando);

    setTimer('save', () => {
        localStorage.setItem('tarefas_array', JSON.stringify(tarefas_array));
    }, 500);

    tocarSom(som_criando_tarefa);
    todos++;
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

        li.append(checkbox_input);
        li.append(checkbox_div);
        li.append(span);

        fragment.append(li);
    }

    tarefas_container.append(fragment);

    if (novo) { requestAnimationFrame(() => { novosItens.forEach(li => { li.classList.remove('recem_criado'); }); }); };

    if (todos > 0 && !lista.classList.contains('pronto')) {
        console.log('pronto');
        lista.classList.add('pronto');
    };

};

lista.addEventListener('change', (click) => {
    if (!click.target.type === 'checkbox') return;

    const id = click.target.closest('li').id;

    tarefas_array.find(el => el.id == id).feito = true;

    // setTimer('progressoBarra', () => {
    // }, 300)

    tocarSom(som_check);

    feitos++

    setTimer('save', () => {
        localStorage.setItem('tarefas_array', JSON.stringify(tarefas_array));
        progressoBarra();
    }, 500);
});

// BARRA DE PROGRESSO -----------------------------
// BARRA DE PROGRESSO -----------------------------
// BARRA DE PROGRESSO -----------------------------

const barra_progresso = document.getElementById('barra_progresso');
const barra_desprogresso = barra_progresso.querySelector('#barra_desprogresso');

const cores_progresso = ["#ff4d6d", "#ff9f1c", "#ffe66d", "#00cfff", "#00ff9c"]

async function progressoBarra(renderizando) {
    porcentagem = (feitos / todos) * 100;

    let background = ``;

    barra_progresso.classList.add('ativo');

    barra_desprogresso.style.transform = `scaleX(${(100 - porcentagem) / 100})`;

    tocarSom(som_progress, 0.4);

    for (let i = 0; i < cores_progresso.length; i++) {
        if (porcentagem > 95 && i == cores_progresso.length - 1) {

            if (!renderizando) tocarSom(som_completo);

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

    setTimer('timeoutProgresso', () => {
        barra_progresso.classList.remove('ativo');
    }, 5000);

    if (!renderizando) setTimer('msgMotivacional', () => {
        mensagemMotivacional(todos, feitos);
    }, 1000);
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

    if (aleatorizado === 0) {
        span.innerHTML += '<svg><use href="#icon_foguete" /></svg>';
    };

    msg_motivacional.classList.add('aberto');
    linha_msg_motivacional.classList.add('aberto');

    setTimer('timeoutLista', () => {
        lista.querySelectorAll('.aberto').forEach((el) => {
            el.classList.remove('aberto');
        })
    }, 4000);

    setTimer('streakVerificacao', () => {
        streakVerificacao();
    }, 1500);

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
        tocarSom(som_fire_start);

        streak.classList.add('streak');

        await delay(700);

        streak.querySelector('span').textContent = feitos;
        streak.querySelector('span').classList.add('pop');

        setTimer('timeoutStreak', () => {
            tocarSom(som_fire_end);
            streak.classList.remove('streak');
            streak.querySelector('span').classList.remove('pop');
        }, 3000);
    };
};

// SISTEMA DE NIVEIS NAS MENSAGENS MOTIVACIONAIS
// VARIAÇÃO DE SONS
// CONFETES
// MARCAR E DESMARCA TAREFAS (BARRA PODE VOLTAR)
// ----------------- GAME -------------------------
// STREAK DIARIO
// TOTAL DE TAREFAS COMPLETADAS AO TODO
// SISTEMA DE NIVEL + RECOMPENSA (EX: NOVAS CORES, SONS, EFEITOS)
// SISTEMA DE DESAFIOS
