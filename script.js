// #region Ativador da permissão de audio no mobile
const audio = new Audio("src/audios/check.ogg");

function unlockAudio() {
    audio.play()
        .then(() => {
            audio.pause();
            audio.currentTime = 0;
        })
        .catch(() => { });
}

document.addEventListener("click", unlockAudio, { once: true });

// #endregion




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
                    window.location.reload();
                }
            }
        });
    });
});




// #region SISTEMAS BASICOS

const gameState = (JSON.parse(localStorage.getItem('gameState')) ?? {
    player: {
        nivel: 0,
        xp: 0,
    },
    tarefas: [],
    stats: {
        hoje: 0,
        total: 0,
        dias: 0,
        progresso_completo_hoje: false
    },
    streak: [false, false, false, false],
    ultimo_acesso: '',
    moedas: 0,
    moedas_ganhas_hoje: 0,
});

function dispatch(acao, item) {
    console.log('Dispatch: ' + acao);

    switch (acao) {
        case 'save': return setTimer('save_gameState', () => { localStorage.setItem('gameState', JSON.stringify(gameState)) }, 500);
        case 'reset_hoje':
            gameState.stats.hoje = 0;
            gameState.moedas_ganhas_hoje = 0;
            break
        case 'hoje': return gameState.stats.hoje++;
        case 'total': return gameState.stats.total++;
        case 'dias': return gameState.stats.dias++;
        case 'ultimo_acesso':
            gameState.ultimo_acesso = hoje_verificacao;
            dispatch('save');
            break;
        case 'progresso_hoje': return gameState.stats.progresso_completo_hoje = true;
        case 'adicionar_tarefa': return gameState.tarefas.push(item);
        case 'progresso_barra': return progressoBarra(item);
        case 'calculo_xp': return calculandoXP(item);
        case 'moeda_add': return moedasSistema(item);
        case 'reset': return reset();
        case 'streak': return streakVerificacao();
        case 'criar_tarefa': return criandoTarefa(item);
    }
};

function updateUI(acao, item, valor, delay) {
    console.log('UpdateUI: ' + acao);

    switch (acao) {
        case 'render': return render(item, valor);
        case 'spawn_xp': return spawnXP(item, valor, delay);
        case 'barra_level_porcentagem': return barraLevelPorcentagem();
        case 'mensagem_motivacional': return mensagemMotivacional();
        case 'level_up':
            level_atual_texto.classList.add('pop');

            setTimer('level_pop', () => {
                level_atual_texto.classList.remove('pop');
            }, 500);
            break;
    };
};

const limite_moedas = 60;

const lista = document.getElementById('tarefas_container');
const tarefas_container = lista.querySelector('ul');

function delay(ms) { return new Promise(r => setTimeout(r, ms)); };

const timers = {};

function setTimer(nome, fn, tempo) {
    clearTimeout(timers[nome]);
    timers[nome] = setTimeout(fn, tempo);
};

function getTodos() {
    return gameState.tarefas.length;
};

function getCompletos() {
    return gameState.tarefas.filter(t => t.feito).length;
};

let total = getTodos();
let completos = getCompletos();
let porcentagem = total > 0 ? (completos / total) * 100 : 0;

const hoje_verificacao = new Date().toDateString();

if (hoje_verificacao != gameState.ultimo_acesso) dispatch('reset_hoje');;

const footer = document.querySelector('footer');
const span_hoje = footer.querySelector('span');
const span_dias = footer.querySelector('#dias span');
const span_total = footer.querySelector('#total span');

if (gameState.stats.hoje > 0) {
    if (footer.classList.contains('nada')) footer.classList.remove('nada');
    span_hoje.textContent = gameState.stats.hoje;
    span_dias.textContent = gameState.stats.dias;
    span_total.textContent = gameState.stats.total;
}

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




// #region XP

const level_container = document.querySelector('#level_info');
const level_atual_texto = level_container.querySelector('span');
const level_proximo_texto = level_container.querySelector('#level_proximo');
const barra_level = level_container.querySelector('#barra_level');

function xpNecessario() { return (gameState.player.nivel + 1) * 100 };

function calculandoXP(origem_xp) {
    const valor = balanceamentoXP(origem_xp);
    gameState.player.xp += valor;

    if (gameState.player.xp >= xpNecessario()) {
        gameState.player.xp -= xpNecessario();
        gameState.player.nivel++;

        updateUI('level_up');
        dispatch('moeda_add', 'level_up');
    };

    dispatch('save');

    updateUI('barra_level_porcentagem')
};

function barraLevelPorcentagem() {
    level_atual_texto.textContent = gameState.player.nivel;
    level_proximo_texto.textContent = gameState.player.nivel + 1;

    const level_porcentagem = Math.min(gameState.player.xp / xpNecessario(), 1);

    barra_level.style.transform = `scaleX(${level_porcentagem})`;
};
barraLevelPorcentagem();

function xpPorTarefa() {
    const quantidade = gameState.stats.hoje;
    let xp = 0;

    if (quantidade < 5) xp = 10;
    else if (quantidade < 10) xp = 7;
    else if (quantidade < 20) xp = 5;
    else xp = 3;

    return xp;
}

function balanceamentoXP(origem) {
    switch (origem) {
        case 'tarefa': return xpPorTarefa();
        case 'progresso': return 5;
        case 'progresso_completo': return 15;
        case 'streak_hoje': return Math.min(gameState.stats.dias * 2, 20);
        default: return 0;
    }
}

function spawnXP(origemXP, posicao, delay) {
    if (!delay) delay = 400;

    const p = document.createElement('p');
    p.textContent = `+${balanceamentoXP(origemXP)} XP`;
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




// #region MOEDAS

function moedaPorTarefa() {
    const quantidade = gameState.stats.hoje;

    if (quantidade < 5) return 3;
    else if (quantidade < 10) return 2;
    else return 0
};

function balanceamentoMoedas(origem) {
    switch (origem) {
        case 'tarefa': return moedaPorTarefa();
        case 'progresso_completo': return 10;
        case 'level_up': return 15;
        default: return 0;
    };
};

function moedasSistema(origem) {
    if (gameState.moedas_ganhas_hoje >= limite_moedas) return
    gameState.moedas += balanceamentoMoedas(origem);
    gameState.moedas_ganhas_hoje++;
};

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

    dispatch('criar_tarefa', texto);

    campo_digitacao.value = '';

    if (gameState.ultimo_acesso != hoje_verificacao) dispatch('ultimo_acesso');
}

function criandoTarefa(tarefa) {

    const criando = ({
        titulo: tarefa,
        feito: false,
        id: crypto.randomUUID()
    });

    updateUI('render', criando, true);

    dispatch('adicionar_tarefa', criando);

    tocarSom(sons.lapis);
    total++;

    dispatch('progresso_barra', true);
    dispatch('save');
};

function render(tarefa, novo) {
    const fragment = document.createDocumentFragment();
    const novosItens = [];

    // Separa os itens salvos para serem renderizados separadamente
    if (tarefa.length > 1) {
        const feitos_verificacao = tarefa.filter(el => el.feito == true);
        completos = feitos_verificacao.length;

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

    if (total > 0 && !lista.classList.contains('pronto')) lista.classList.add('pronto');

    if (apagar_tudo_btn.classList.contains('escondido')) apagar_tudo_btn.classList.remove('escondido');
};

lista.addEventListener('change', (click) => {
    if (click.target.type !== 'checkbox') return;
    if (footer.classList.contains('nada')) footer.classList.remove('nada');

    const id = click.target.closest('li').id;

    gameState.tarefas.find(el => el.id == id).feito = true;

    tocarSom(sons.check);

    completos++;
    dispatch('hoje');
    dispatch('total');
    dispatch('moeda_add', 'tarefa');

    const posicao_XP = click.target.closest('li').querySelector('.coin');
    updateUI('spawn_xp', 'tarefa', posicao_XP);

    span_hoje.textContent = gameState.stats.hoje;

    setTimer('save', () => {
        dispatch('save');
        dispatch('progresso_barra');
    }, 500);

    dispatch('calculo_xp', 'tarefa')

    if (gameState.ultimo_acesso != hoje_verificacao) dispatch('ultimo_acesso');
});

apagar_tudo_btn.addEventListener('click', () => { apagar_tudo_alerta.classList.add('aberto'); });

apagar_tudo_alerta.addEventListener('click', (click) => {
    const target = click.target.closest('button');

    if (!target) return;

    const btn = target.id;

    if (btn === "confirmar") dispatch('reset');

    apagar_tudo_alerta.classList.remove('aberto');
});

function reset() {
    gameState.tarefas.length = 0;

    tarefas_container.innerHTML = '';

    barra_desprogresso.style.transform = `scaleX(1)`;

    barra_progresso.style.background = ``;

    barra_progresso.classList.remove('completo');

    barra_progresso.classList.remove('idle');

    gameState.streak = [false, false, false, false];

    span.textContent = 0;

    completos = 0;
    total = 0;

    lista.classList.remove('pronto');

    apagar_tudo_btn.classList.add('escondido');

    dispatch('save');
}

// #endregion




// #region BARRA PROGRESSO

const barra_progresso = document.getElementById('barra_progresso');
const barra_desprogresso = barra_progresso.querySelector('#barra_desprogresso');

const cores_progresso = ["#ff3b3b", "#ff7a00", "#ffe600", "#00ff9f", "#00e0ff"]

async function progressoBarra(renderizando) {

    porcentagem = (total > 0 ? (completos / total) * 100 : 0);

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

                if (!gameState.stats.progresso_completo_hoje) {
                    dispatch('calculo_xp', 'progresso_completo');
                    updateUI('spawn_xp', 'progresso_completo', barra_progresso, 1000);

                    dispatch('moeda_add', 'progresso_completo');

                    dispatch('progresso_hoje');
                    dispatch('dias');
                    dispatch('save');
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

            if (!renderizando) dispatch('calculo_xp', 'progresso');
        }
        else if (porcentagem >= (i + 1) * 20) {
            background += `, ${cores_progresso[i]}`;

            if (!renderizando && !gameState.stats.progresso_completo_hoje) updateUI('spawn_xp', 'progresso', barra_progresso, 1000);
        };
    };

    barra_progresso.style.background = `linear-gradient(90deg, ${background})`;

    if (!renderizando) {
        barra_progresso.classList.add('ativo');

        tocarSom(sons.progress, 0.4);


        setTimer('msgMotivacional', () => { updateUI('mensagem_motivacional'); }, 1500)

        setTimer('timeoutProgresso', () => { barra_progresso.classList.remove('ativo'); }, 2500);
    };
};

// #endregion




// #region MENSAGEM MOTIVACIONAL

const msg_motivacional = document.getElementById('msg_motivacional');
const svg = msg_motivacional.querySelector('svg');
const use = svg.querySelector('use');
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
        if (calculando_nivel === 'nivel_2') use.setAttribute('href', '#icon_fogo');
        // SVG do Foguete
        else if (calculando_nivel === 'nivel_3') use.setAttribute('href', '#icon_foguete');
        // SVG do Correct
        else if (calculando_nivel === 'nivel_4') use.setAttribute('href', '#icon_correct');
    }
    else use.setAttribute('href', '');

    msg_motivacional.classList.add('aberto');
    linha_msg_motivacional.classList.add('aberto');

    setTimer('timeoutLista', () => {
        lista.querySelectorAll('.aberto').forEach((el) => {
            el.classList.remove('aberto');
        })
    }, 4000);

    setTimer('streakVerificacao', () => { dispatch('streak') }, 2000);
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

async function streakVerificacao() {
    let play = false;

    for (let i = 1; i < gameState.streak.length; i++) {
        const porcentagemAlvo = i * 19;
        if (porcentagem >= porcentagemAlvo && !gameState.streak[i - 1]) {
            gameState.streak[i - 1] = true;
            play = true;

            dispatch('calculo_xp', 'streak_hoje')

            dispatch('save')

            break
        }
    };

    if (play) {
        tocarSom(sons.fire_start);

        streak.classList.add('streak');

        await delay(700);

        streak.querySelector('span').textContent = completos;
        streak.querySelector('span').classList.add('pop');


        const posicao_XP = streak.querySelector('h2');
        updateUI('spawn_xp', 'streak_hoje', posicao_XP)

        setTimer('timeoutStreak', () => {
            tocarSom(sons.fire_end);
            streak.classList.remove('streak');
            streak.querySelector('span').classList.remove('pop');
        }, 3000);
    };
};

// #endregion 




// Inicio automatico
if (gameState.tarefas.length > 0) updateUI('render', gameState.tarefas);




/*
    FEITOS:
    - SISTEMA DE NIVEIS NAS MENSAGENS MOTIVACIONAIS
    - CONFETES
    - STREAK DIARIO
    - TOTAL DE TAREFAS COMPLETADAS AO TODO
    - SISTEMA DE NIVEL

*/

// ----------------- GAME -------------------------
// RECOMPENSA (EX: NOVAS CORES, SONS, EFEITOS)