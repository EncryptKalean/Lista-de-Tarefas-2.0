// #region TELA SECRETA

const h1 = document.querySelector('h1 span');
const tela_secreta = document.getElementById('tela_secreta');

function telaSecreta() { tela_secreta.classList.toggle('aberto'); }

function reset() {
    localStorage.removeItem('gameState');
    window.location.reload();
}

let lastTap = 0;

h1.addEventListener('touchend', (tap) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) {
        tap.preventDefault();
        telaSecreta();
    }

    lastTap = currentTime;
});

// #endregion 



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
}, { once: true });




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
    itens: {},
});

function dispatch(acao, item, valor) {
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
        case 'XP': return sistemaXP(item);
        case 'moeda': return moedasSistema(item, valor);
        case 'reset': return reset();
        case 'streak': return streakVerificacao();
        case 'criar_tarefa': return criandoTarefa(item);
        case 'comprar_item': return comprarItem(item);
    }
};

function updateUI(acao, item, valor, delay) {
    console.log('UpdateUI: ' + acao);

    switch (acao) {
        case 'render': return render(item, valor);
        case 'XP': return spawnXP(item, valor, delay);
        case 'barra_level_porcentagem': return barraLevelPorcentagem();
        case 'mensagem_motivacional': return mensagemMotivacional();
        case 'levelUP':
            level_atual_texto.classList.add('pop');

            setTimer('level_pop', () => {
                level_atual_texto.classList.remove('pop');
            }, 500);
            break;
        case 'categoria': return trocaCategoria(item);
        case 'moeda': return moeda_show();
    };
};

function dispatchEffects(acao, item) {

    const equipado = Object.keys(gameState.itens).find(el => gameState.itens[el]);

    switch (equipado) {
        case 'neon_pulse': return efeitoNeonPulse(item);
    }
}

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

function sistemaXP(origem_xp) {
    const valor = balanceamentoXP(origem_xp);
    gameState.player.xp += valor;
    const xp_necessario = xpNecessario();

    if (gameState.player.xp >= xp_necessario) {
        setTimeout(() => {
            gameState.player.xp -= xp_necessario;
            gameState.player.nivel++;

            updateUI('levelUP');
            dispatch('moeda', 'levelUP');
        }, 3500);
    };

    dispatch('save');

    updateUI('barra_level_porcentagem');
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
        case 'levelUP': return 15;
        default: return 0;
    };
};

function moedasSistema(origem, compra) {

    if (origem === 'compra') {
        gameState.moedas -= compra;
        dispatch('save');
    }
    else if (gameState.moedas_ganhas_hoje < limite_moedas) {
        gameState.moedas += balanceamentoMoedas(origem);
        gameState.moedas_ganhas_hoje++;

        updateUI('moeda');
    }
};

// #endregion




// #region LOJA

const LOJA_ITENS = [
    {
        id: 'neon_pulse',
        nome: 'neon_pulse',
        categoria: 'efeitos',
        tipo_efeito: 'check',
        preco: 500,
        nivel: 1,
        comprado: false,
        equipado: false,
        imagem: 'neon_pulse',
    },
];

const loja_btn = document.getElementById('loja_btn');
const loja_container = document.getElementById('loja_container');
const loja = document.getElementById('loja');
const loja_frame = loja.querySelector('#loja_frame');
const loja_abas_array = loja_frame.querySelectorAll('.loja_aba');
const moeda_span = document.querySelector('#moedas_show span');

function renderLoja(id, itens) {
    const categoria = loja_frame.querySelector(`#${id}`);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < itens.length; i++) {
        const item = itens[i];

        const card = document.createElement('div');
        card.classList.add('card');
        if (gameState.itens[item.id]) card.classList.add('comprado');
        if (gameState.player.nivel >= item.nivel) card.classList.add('liberado');
        card.setAttribute('nivel', item.nivel);
        card.setAttribute('id', item.id);

        const img = document.createElement('img');
        img.setAttribute('loading', 'lazy');
        img.setAttribute('src', `/src/imagens/loja/${item.imagem}.webp`);

        const textos_div = document.createElement('div');
        textos_div.classList.add('textos');

        const h3 = document.createElement('h3');
        h3.classList.add('item_nome');
        h3.textContent = item.nome;

        const item_tipo = document.createElement('p');
        item_tipo.classList.add('item_tipo');
        item_tipo.textContent = 'efeito de ' + item.tipo_efeito;

        const item_nivel = document.createElement('p');
        item_nivel.classList.add('item_nivel');
        item_nivel.textContent = 'nivel ' + item.nivel;

        const comprar_container = document.createElement('div');
        comprar_container.classList.add('comprar_container');

        const preco_div = document.createElement('div');
        preco_div.classList.add('preco');

        const span = document.createElement('span');
        span.textContent = item.preco;

        const button = document.createElement('button');
        button.setAttribute('preco', item.preco);

        card.append(img);

        textos_div.append(h3);
        textos_div.append(item_tipo);
        textos_div.append(item_nivel);

        card.append(textos_div);

        preco_div.innerHTML += '<svg><use href="#icon_coin"/></svg>';
        preco_div.append(span);

        comprar_container.append(preco_div);
        comprar_container.append(button);

        card.append(comprar_container);

        fragment.append(card);
    }

    categoria.append(fragment);
};

function filtrandoItens(aba) {
    const categoria = aba.id;
    const itens = LOJA_ITENS.filter(el => el.categoria === categoria);

    renderLoja(categoria, itens);
};

loja_abas_array.forEach((aba) => { filtrandoItens(aba) });

function trocaCategoria(target) {
    const categoria_antiga = loja.querySelectorAll('.aberto');

    categoria_antiga.forEach(el => el.classList.remove('aberto'));

    const categoria_nova = loja.querySelector(`#categorias [data-categoria="${target}"]`);
    categoria_nova.classList.add('aberto');

    const aba_nova = loja_frame.querySelector(`#${target}`);
    aba_nova.classList.add('aberto');
};

function comprarItem(card) {
    const btn = card.querySelector('button');
    const preco = btn.getAttribute('preco');
    const item = LOJA_ITENS.find(el => el.id === card.id);

    if (gameState.moedas >= preco) {
        dispatch('moedas', 'compra', preco);
        gameState.itens[item.id] = true;
    }
};

function moeda_show() {
    moeda_span.textContent = gameState.moedas;
};

loja.addEventListener('click', (click) => {
    const categoria = click.target.closest('#categorias span');
    const item = click.target.closest('.comprar_container button');

    if (!categoria && !item) return;
    else if (categoria) updateUI('categoria', categoria.dataset.categoria);
    else if (item) dispatch('comprar_item', item.closest('.card'));
});

loja_btn.addEventListener('click', () => {
    loja_container.classList.toggle('aberto');
    loja_btn.classList.toggle('aberto');
});

// #endregion




// #region INVENTARIO & ITENS

function efeitoNeonPulse(el) {
    const pulse = document.createElement("span");
    pulse.classList.add("neon-pulse");

    el.appendChild(pulse);

    setTimeout(() => pulse.remove(), 600);
}

// gameState.itens['neon_pulse'] = true;

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

    dispatchEffects('check', click.target.parentElement.querySelector('.checkbox'));

    tocarSom(sons.check);

    completos++;
    dispatch('hoje');
    dispatch('total');
    dispatch('moeda', 'tarefa');

    const posicao_XP = click.target.closest('li').querySelector('.coin');
    updateUI('XP', 'tarefa', posicao_XP);

    span_hoje.textContent = gameState.stats.hoje;

    setTimer('save', () => {
        dispatch('save');
        dispatch('progresso_barra');
    }, 500);

    dispatch('XP', 'tarefa')


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
                    dispatch('XP', 'progresso_completo');
                    updateUI('XP', 'progresso_completo', barra_progresso, 1000);

                    dispatch('moeda', 'progresso_completo');

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

            if (!renderizando) dispatch('XP', 'progresso');
        }
        else if (porcentagem >= (i + 1) * 20) {
            background += `, ${cores_progresso[i]}`;

            if (!renderizando && !gameState.stats.progresso_completo_hoje) updateUI('XP', 'progresso', barra_progresso, 1000);
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

            dispatch('XP', 'streak_hoje')

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
        updateUI('XP', 'streak_hoje', posicao_XP)

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

if (gameState.moedas > 0) updateUI('moeda');


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
