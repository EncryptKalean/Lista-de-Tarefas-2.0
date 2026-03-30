// #region Ativador da permissão de audio no mobile
const audio = new Audio("src/audios/check.ogg");

function unlockAudio() {
    audio.play()
        .then(() => {
            audio.pause();
            audio.currentTime = 0;
            // console.log("Áudio desbloqueado");
        })
        .catch(() => { });
}

document.addEventListener("click", unlockAudio, { once: true });

// #endregion




// #region SISTEMAS BASICOS

const lista = document.getElementById('tarefas_container');
const tarefas_container = lista.querySelector('ul');

function delay(ms) { return new Promise(r => setTimeout(r, ms)); };

const timers = {};

function setTimer(nome, fn, tempo) {
    clearTimeout(timers[nome]);
    timers[nome] = setTimeout(fn, tempo);
};

const tarefas_array = (JSON.parse(localStorage.getItem('tarefas_array')) ?? []);

let tarefas_infos = (JSON.parse(localStorage.getItem('tarefas_infos')) ?? {
    total: 0,
    dias: 0,
    hoje: 0,
    progresso_completo_hoje: false,
});

let todos = tarefas_array.length;
let feitos = 0;
let porcentagem;

const hoje_verificacao = new Date().getDate();
let ultimo_acesso = localStorage.getItem('ultimo_acesso');

function atualizandoTarefasInfos(alvo) {
    if (alvo === 'reset') tarefas_infos.hoje = 0;
    else if (alvo === 'hoje') tarefas_infos.hoje++;
    else if (alvo === 'total') tarefas_infos.total++;
    else if (alvo === 'dias') tarefas_infos.dias++;
    else if (alvo === 'save') localStorage.setItem('tarefas_infos', JSON.stringify(tarefas_infos));
    else if (alvo === 'ultimo_acesso') {
        localStorage.setItem('ultimo_acesso', hoje_verificacao);
        ultimo_acesso = hoje_verificacao;
    }
    else if (alvo === 'progresso_hoje') tarefas_infos.progresso_completo_hoje = true;

    console.log('alteração no tarefas_infos: ' + alvo);
}

if (hoje_verificacao != ultimo_acesso) {
    localStorage.removeItem('streak_hoje');
    atualizandoTarefasInfos('reset');
    console.log('dia diferente');
};

const footer = document.querySelector('footer');
const span_hoje = footer.querySelector('span');
const span_dias = footer.querySelector('#dias span');
const span_total = footer.querySelector('#total span');

if (tarefas_infos.hoje > 0) {
    if (footer.classList.contains('nada')) footer.classList.remove('nada');
    span_hoje.textContent = tarefas_infos.hoje;
    span_dias.textContent = tarefas_infos.dias;
    span_total.textContent = tarefas_infos.total;
}




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

// #endregion




// #region AUDIOS

const sons = {
    lapis: {
        som: document.getElementById('som_criando_tarefa'),
        volume: 0.5,
    },
    check: {
        som: document.getElementById('som_check'),
        volume: 0.5,
    },
    xp: {
        som: document.getElementById('som_xp'),
        volume: 0.2,
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

// #endregion




// #region PLAYER & XP

const level_container = document.querySelector('#level_info');
const level_atual_texto = level_container.querySelector('span');
const level_proximo_texto = level_container.querySelector('#level_proximo');
const barra_level = level_container.querySelector('#barra_level');

let player = (JSON.parse(localStorage.getItem('player_infos')) ?? { nivel: 0, xp: 0, });

function xpNecessario() { return player.nivel * 100 };

function calculandoXP(origem_xp) {
    const valor = balanceamentoXP[origem_xp];
    console.log('+' + valor + ' xp ' + origem_xp);
    player.xp += valor;

    if (player.xp >= xpNecessario()) {
        player.xp -= xpNecessario();
        player.nivel++;
        level_atual_texto.classList.add('pop');
        setTimer('level_pop', () => {
            level_atual_texto.classList.remove('pop');
        }, 500)
    };

    localStorage.setItem('player_infos', JSON.stringify(player));

    barraLevelPorcentagem();
};

function barraLevelPorcentagem() {
    level_atual_texto.textContent = player.nivel;
    level_proximo_texto.textContent = player.nivel + 1;

    const level_porcentagem = ((player.xp / xpNecessario()) * 100) / 100;

    barra_level.style.transform = `scaleX(${level_porcentagem})`;
};
barraLevelPorcentagem();

const balanceamentoXP = {
    check: 10,
    progresso: 5,
    progresso_completo: 10,
    streak_hoje: 3,
    // streak_de_dias:,
};

function spawnXP(origemXP, posicao, delay) {
    if (!delay) delay = 500;
    const p = document.createElement('p');
    p.textContent = `+${balanceamentoXP[origemXP]} XP`;
    p.classList.add('xp_texto');

    setTimeout(() => {
        tocarSom(sons.xp);
        posicao.append(p);

        setTimeout(() => {
            p.remove();
        }, 2000)
    }, delay)
}

// #endregion




// #region TAREFAS

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

    if (ultimo_acesso != hoje_verificacao) atualizandoTarefasInfos('ultimo_acesso');
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

    if (todos > 0 && !lista.classList.contains('pronto')) lista.classList.add('pronto');

    if (apagar_tudo_btn.classList.contains('escondido')) apagar_tudo_btn.classList.remove('escondido');
};

lista.addEventListener('change', (click) => {
    if (click.target.type !== 'checkbox') return;
    if (footer.classList.contains('nada')) footer.classList.remove('nada');

    const id = click.target.closest('li').id;

    tarefas_array.find(el => el.id == id).feito = true;

    tocarSom(sons.check);

    feitos++;
    atualizandoTarefasInfos('hoje');
    atualizandoTarefasInfos('total');

    const posicao_XP = click.target.closest('li').querySelector('.coin');
    spawnXP('check', posicao_XP);

    span_hoje.textContent = tarefas_infos.hoje;

    setTimer('save', () => {
        localStorage.setItem('tarefas_array', JSON.stringify(tarefas_array));
        atualizandoTarefasInfos('save');
        progressoBarra();
    }, 500);

    calculandoXP('check');

    if (ultimo_acesso != hoje_verificacao) atualizandoTarefasInfos('ultimo_acesso');
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

    streakArray = [false, false, false, false];

    span.textContent = 0;

    feitos = 0;
    todos = 0;

    lista.classList.remove('pronto');

    apagar_tudo_btn.classList.add('escondido');
}

// #endregion




// #region BARRA PROGRESSO

const barra_progresso = document.getElementById('barra_progresso');
const barra_desprogresso = barra_progresso.querySelector('#barra_desprogresso');

const cores_progresso = ["#ff3b3b", "#ff7a00", "#ffe600", "#00ff9f", "#00e0ff"]

async function progressoBarra(renderizando) {

    porcentagem = (feitos / todos) * 100;

    let background = ``;

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

                if (!tarefas_infos.progresso_completo_hoje) {
                    calculandoXP('progresso_completo');
                    spawnXP('progresso_completo', barra_progresso, 1000);

                    atualizandoTarefasInfos('progresso_hoje');
                    atualizandoTarefasInfos('dias');
                    atualizandoTarefasInfos('save');
                };

            };

            await delay(1000);

            barra_progresso.classList.add('completo');

            await delay(1000);

            barra_progresso.classList.remove('completo');
            barra_progresso.classList.add('idle');
        }
        else if (porcentagem >= 5 && i == 0) {
            background += cores_progresso[0];

            if (!renderizando) calculandoXP('progresso');
        }
        else if (porcentagem >= (i + 1) * 20) background += `, ${cores_progresso[i]}`;
    };

    barra_progresso.style.background = `linear-gradient(90deg, ${background})`;

    if (!renderizando) {
        barra_progresso.classList.add('ativo');

        tocarSom(sons.progress, 0.4);

        spawnXP('progresso', barra_progresso, 1000);

        setTimer('msgMotivacional', () => {
            mensagemMotivacional(todos, feitos);
        }, 1500)

        setTimer('timeoutProgresso', () => {
            barra_progresso.classList.remove('ativo');
        }, 2500);
    };
};

// #endregion




// #region MENSAGEM MOTIVACIONAL

const msg_motivacional = document.getElementById('msg_motivacional');
const span = msg_motivacional.querySelector('span');
const linha_msg_motivacional = document.getElementById('separacao_mensagem_motivacional');
const array_msg_motivacionais = {
    nivel_1: [
        "Boa!",
        "Mais uma",
        "Tá começando bem",
        "Vamos nessa",
        "Primeiro passo feito"
    ],
    nivel_2: [
        "Ritmo bom",
        "Você tá indo bem",
        "Não para agora",
        "Foco total",
        "Já embalou"
    ],
    nivel_3: [
        "Você tá voando",
        "Disciplina > motivação",
        "Agora ninguém te para",
        "Isso aqui é consistência",
        "Tá diferente hoje hein"
    ],
    nivel_4: [
        "Só mais um",
        "Tá muito perto",
        "Fecha isso",
        "Último esforço",
        "Não quebra agora"
    ]
};

function mensagemMotivacional() {
    const calculando_nivel = nivelDeMensagem(porcentagem);
    const nivel = array_msg_motivacionais[calculando_nivel];
    const aleatorizado = Math.floor(Math.random() * nivel.length);

    // Volta a lista pro  topo quando estiver muito abaixo
    if (lista.scrollTop > 50) {
        lista.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    span.textContent = nivel[aleatorizado];

    // SVGs
    if (aleatorizado === 0) {
        // SVG do Fogo
        if (calculando_nivel === 'nivel_2') span.innerHTML += '<svg><use href="#icon_fogo" /></svg>';
        // SVG do Foguete
        else if (calculando_nivel === 'nivel_3') span.innerHTML += '<svg><use href="#icon_foguete" /></svg>';
        // SVG do Correct
        else if (calculando_nivel === 'nivel_4') span.innerHTML += '<svg><use href="#icon_correct" /></svg>';
    }

    msg_motivacional.classList.add('aberto');
    linha_msg_motivacional.classList.add('aberto');

    setTimer('timeoutLista', () => {
        lista.querySelectorAll('.aberto').forEach((el) => {
            el.classList.remove('aberto');
        })
    }, 4000);

    setTimer('streakVerificacao', () => {
        streakVerificacao();
    }, 2000);
}

function nivelDeMensagem(porcent) {
    if (!porcent) porcent = 0;

    if (porcent < 30) return 'nivel_1';
    else if (porcent < 60) return 'nivel_2';
    else if (porcent < 90) return 'nivel_3';
    else if (porcent <= 100) return 'nivel_4';
}

// #endregion




// #region STREAK

const streak = document.getElementById('sequencia');
let streakArray = (JSON.parse(localStorage.getItem('streak_hoje')) ?? [false, false, false, false]);
// console.log(streakArray);

async function streakVerificacao() {
    let play = false;

    for (let i = 1; i < streakArray.length; i++) {
        const porcentagemAlvo = i * 19;
        if (porcentagem >= porcentagemAlvo && streakArray[(i - 1)] == false) {
            streakArray[(i - 1)] = true;
            play = true;
            console.log('----------');
            console.log(streakArray);
            console.log(porcentagem);
            console.log(i);
            console.log(porcentagemAlvo);

            calculandoXP('streak_hoje');

            localStorage.setItem('streak_hoje', JSON.stringify(streakArray));

            break
        }
    };

    if (play) {
        tocarSom(sons.fire_start);

        streak.classList.add('streak');

        await delay(700);

        streak.querySelector('span').textContent = feitos;
        streak.querySelector('span').classList.add('pop');


        const posicao_XP = streak.querySelector('h2');
        spawnXP('streak_hoje', posicao_XP);

        setTimer('timeoutStreak', () => {
            tocarSom(sons.fire_end);
            streak.classList.remove('streak');
            streak.querySelector('span').classList.remove('pop');
        }, 3000);
    };
};

// #endregion 




// Inicio automatico
if (tarefas_array.length > 0) render(tarefas_array);




/*
    FEITOS:
    - SISTEMA DE NIVEIS NAS MENSAGENS MOTIVACIONAIS
    - CONFETES
    - STREAK DIARIO
    - TOTAL DE TAREFAS COMPLETADAS AO TODO

*/

// VARIAÇÃO DE SONS
// ----------------- GAME -------------------------
// SISTEMA DE NIVEL + RECOMPENSA (EX: NOVAS CORES, SONS, EFEITOS)
// SISTEMA DE DESAFIOS