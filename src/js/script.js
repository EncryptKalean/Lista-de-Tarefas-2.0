// #region TELA SECRETA

const h1 = document.querySelector('h1 span');
const tela_secreta = document.getElementById('tela_secreta');

function telaSecreta() { tela_secreta.classList.toggle('aberto'); }

function hardReset() {
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

h1.addEventListener('dblclick', (tap) => {
    telaSecreta();
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




navigator.serviceWorker.register("./sw.js").then(reg => {
    // força verificar update
    setTimeout(() => {
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

function carregarInformacoes() {
    let save = JSON.parse(localStorage.getItem('gameState')) ?? [];

    if (!save && Object.keys(save.itens).length === 0) save.itens = [];

    const defaultState = {
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
        itens: [],
    }

    return {
        ...defaultState,
        ...save,

        player: {
            ...defaultState.player,
            ...save.player
        },

        stats: {
            ...defaultState.stats,
            ...save.sats
        },
    };
}

const gameState = carregarInformacoes();

const dispatch = {
    save: () => setTimer('save_gameState', () => { localStorage.setItem('gameState', JSON.stringify(gameState)) }, 500),
    resetHoje: () => {
        gameState.stats.hoje = 0;
        gameState.moedas_ganhas_hoje = 0;
    },
    status: (payload) => {
        if (payload.hoje === 'menos') gameState.stats.hoje--;
        else if (payload.hoje) gameState.stats.hoje++;

        if (payload.total === 'menos') gameState.stats.total--;
        else if (payload.total) gameState.stats.total++;

        if (payload.dias) gameState.stats.dias++;
    },
    ultimoAcesso: () => {
        gameState.ultimo_acesso = hoje_verificacao;
        dispatch.save();
    },
    progressoHoje: () => gameState.stats.progresso_completo_hoje = true,
    adicionarTarefa: (payload) => gameState.tarefas.push(payload),
    progressoBarra: (payload) => progressoBarra(payload),
    xp: (payload) => sistemaXP(payload),
    moedas: (payload) => moedasSistema(payload),
    reset: () => reset(),
    streak: () => streakVerificacao(),
    criarTarefa: (payload) => criandoTarefa(payload),
    comprarItem: (payload) => comprarItem(payload),
    deleteUnicoTela: (payload) => janelaDeleteUnico(payload),
    deleteTarefa: (payload) => apagarTarefa(payload),
};

function updateUI(acao, item, valor, delay) {
    console.log('UpdateUI: ' + acao);

    switch (acao) {
        case 'render': return render(item, valor);
        case 'spawnXP': return spawnXP(item, valor, delay);
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

    if (acao === 'visual') {
        const equipado = gameState.itens.find(el => el.tipo === acao && el.equipado);

        if (!equipado) return

        switch (equipado.id) {
            case 'neon_pulse': return efeitoNeonPulse(item);
        }
    }
    else if (acao === 'audio') {
        const audio = sons[item];

        const som_equipado = gameState.itens.find(el => el.ativacao === item && el.tipo === acao && el.equipado);

        if (som_equipado) {

            const audio_loja = LOJA_ITENS.find(el => el.id === som_equipado.id);

            const src_template = 'src/audios/';
            const src_original = audio.som.src.split('/').pop();
            const src_novo = audio_loja.arquivo;

            sons[item].time = audio_loja.time ?? sons[item].time;

            if (src_original != src_novo) audio.som.src = src_template + src_novo;
        }
        else if (audio.som.src != sonsOriginais[item].som) audio.som.src = sonsOriginais[item].som;

        tocarSom(audio);
    }
    else return;
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

if (hoje_verificacao != gameState.ultimo_acesso) dispatch.resetHoje();

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
    criar: {
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
    streak_start: {
        som: document.getElementById('som_fire_start'),
        volume: 0.7,
    },
    streak_end: {
        som: document.getElementById('som_fire_end'),
        volume: 0.7
    },
    progresso: {
        som: document.getElementById('som_progress'),
        volume: 1,
        time: 0.4,
    },
    progresso_completo: {
        som: document.getElementById('som_completo'),
        volume: 1,
    },
    confete: {
        som: document.getElementById('som_confete'),
        volume: 1,
    },
}

const sonsOriginais = {
    criar: {
        som: document.getElementById('som_criando_tarefa').src,
        volume: 0.5,
    },
    check: {
        som: document.getElementById('som_check').src,
        volume: 0.5,
    },
    xp: {
        som: document.getElementById('som_xp').src,
        volume: 0.2,
    },
    streak_start: {
        som: document.getElementById('som_fire_start').src,
        volume: 0.7,
    },
    streak_end: {
        som: document.getElementById('som_fire_end').src,
        volume: 0.7
    },
    progresso: {
        som: document.getElementById('som_progress').src,
        volume: 1,
        time: 0.4,
    },
    progresso_completo: {
        som: document.getElementById('som_completo').src,
        volume: 1,
    },
    confete: {
        som: document.getElementById('som_confete').src,
        volume: 1,
    },
};

function tocarSom(src) {
    const audio = src.som;

    audio.volume = src.volume;
    audio.currentTime = src.time ?? 0;
    audio.play();
}

// #endregion




// #region XP

const level_container = document.querySelector('#level_info');
const level_atual_texto = level_container.querySelector('span');
const level_proximo_texto = level_container.querySelector('#level_proximo');
const barra_level = level_container.querySelector('#barra_level');

function xpNecessario() { return (gameState.player.nivel + 1) * 100 };

function sistemaXP(payload) {
    const origem_xp = payload.tipo;

    const valor = balanceamentoXP(origem_xp);

    if (payload.add == false) gameState.player.xp -= valor;
    else gameState.player.xp += valor;

    const xp_necessario = xpNecessario();

    if (gameState.player.xp >= xp_necessario) {
        setTimer('levelUP', () => {
            gameState.player.xp -= xp_necessario;
            gameState.player.nivel++;

            updateUI('levelUP');
            dispatch.moedas({ tipo: 'levelUP' });
        }, 3500);
    }
    else if (gameState.player.xp < 0 && payload.add == false) {
        setTimer('levelDOWN', () => {
            gameState.player.xp = xp_necessario - valor;
            gameState.player.nivel--;
            dispatch.moedas({ tipo: 'levelUP', add: payload.add });
        }, 3500);
    }

    dispatch.save();

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
        dispatchEffects('audio', 'xp');
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

function moedasSistema(payload = {}) {
    // console.log('moeda:');
    // console.log(payload);

    const { tipo, valor = 0 } = payload;

    if (tipo === 'compra') {
        gameState.moedas -= valor;
        dispatch.save();
    }
    else {
        if (!payload.add) {
            gameState.moedas -= balanceamentoMoedas(tipo);
            gameState.moedas_ganhas_hoje -= balanceamentoMoedas(tipo);
        }
        else if (gameState.moedas_ganhas_hoje < limite_moedas) {
            gameState.moedas += balanceamentoMoedas(tipo);
            gameState.moedas_ganhas_hoje += balanceamentoMoedas(tipo);
        };
    };

    updateUI('moeda');
};

// #endregion




// #region LOJA

const LOJA_ITENS = [
    /*
        preco: Preço do item,
        nivel: Nivel minimo para liberar o item,
        categoria: Em qual categoria da loja esse item se encaixa,
        nome: Nome do item,
        ativacao: Onde ou quando o item irá ser ativado (ex; itens 'check' são ativados ao dar 'check' em uma tarefa),
        descricao: É como fica a descrição do item na loja,
        tipo: Diz qual é o tipo de efeito daquele item (ex: efeito de audio ou efeito visual),
        time: Alguns audios possuem um tempo diferente, então o time serve para personalizar o ponto de start,
        imagem: Nome da imagem do item nos arquivos,
        arquivo: Nome do arquivo de audio
    */

    // Visual ------------------

    {
        preco: 120,
        nivel: 5,
        categoria: 'efeitos',
        id: 'neon_pulse',
        nome: 'Neon Pulse',
        ativacao: 'check',
        descricao: 'ativa ao dar check',
        tipo: 'visual',
        imagem: 'neon_pulse',
    },

    // Audio ----------------------
    // CRIAR
    {
        preco: 50,
        nivel: 3,
        categoria: 'sons',
        id: 'som_criar',
        nome: 'Scribble',
        ativacao: 'criar',
        descricao: 'ativa ao criar',
        tipo: 'audio',
        imagem: 'write',
        arquivo: 'create.ogg',
    },
    // CHECK
    {
        preco: 80,
        nivel: 2,
        categoria: 'sons',
        id: 'som_check',
        nome: 'Plim',
        ativacao: 'check',
        descricao: 'ativa ao dar check',
        tipo: 'audio',
        imagem: 'plim',
        arquivo: 'check.ogg',
    },
    {
        preco: 70,
        nivel: 3,
        categoria: 'sons',
        id: 'som_quack',
        nome: 'quack',
        ativacao: 'check',
        descricao: 'ativa ao dar check',
        tipo: 'audio',
        imagem: 'quack',
        arquivo: 'quack.ogg',
    },
    // XP
    {
        preco: 70,
        nivel: 4,
        categoria: 'sons',
        id: 'som_xp_2',
        nome: 'xp boost',
        ativacao: 'xp',
        descricao: 'ativa ao ganhar xp',
        tipo: 'audio',
        imagem: 'gain',
        arquivo: 'xp_2.ogg',
    },
    // PROGRESSO
    {
        preco: 90,
        nivel: 5,
        categoria: 'sons',
        id: 'som_progresso_8bit',
        nome: '8bit tick',
        ativacao: 'progresso',
        descricao: 'ativa ao fazer progresso',
        tipo: 'audio',
        time: 0,
        imagem: 'tick',
        arquivo: 'progress_bar_8bit.ogg',
    },
    // PROGRESSO COMPLETO
    {
        preco: 180,
        nivel: 8,
        categoria: 'sons',
        id: 'som_final',
        nome: 'Grand Finale',
        ativacao: 'progresso_completo',
        descricao: 'ativa ao fazer 100%',
        tipo: 'audio',
        imagem: 'epic',
        arquivo: 'grand_finale.ogg',
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
        if (gameState.player.nivel >= item.nivel) card.classList.add('liberado');
        if (gameState.itens.find(el => el.id === item.id)) {
            card.classList.add('comprado');
            if (gameState.itens.find(el => el.equipado)) card.classList.add('equipado');
        };
        card.setAttribute('nivel', item.nivel);
        card.setAttribute('id', item.id);
        card.setAttribute('data-ativacao', item.ativacao);
        card.setAttribute('data-tipo', item.tipo);

        const img = document.createElement('img');
        img.setAttribute('loading', 'lazy');
        img.setAttribute('src', `src/imagens/loja/${item.imagem}.webp`);

        const textos_div = document.createElement('div');
        textos_div.classList.add('textos');

        const h3 = document.createElement('h3');
        h3.classList.add('item_nome');
        h3.textContent = item.nome;

        const item_tipo = document.createElement('p');
        item_tipo.classList.add('item_tipo');
        item_tipo.textContent = item.descricao;

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
        button.setAttribute('nvl', item.nivel);

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

function equiparItem(card) {
    const novoItemAtivacao = card.dataset.ativacao;
    const novoItemtipo = card.dataset.tipo;

    // console.log(card);

    const item_equipado = gameState.itens.find(el => el.ativacao === novoItemAtivacao && el.tipo === novoItemtipo && el.equipado && el.id != card.id);
    if (item_equipado) item_equipado.equipado = false;

    loja.querySelectorAll(`.equipado[data-ativacao="${novoItemAtivacao}"][data-tipo="${novoItemtipo}"]:not([id="${card.id}"])`).forEach(el => el.classList.remove('equipado'));

    const verificacao = card.classList.contains('equipado');

    if (verificacao) card.classList.remove('equipado');
    else card.classList.add('equipado');

    gameState.itens.find(el => el.id === card.id).equipado = !verificacao;

    // console.log(gameState.itens);
}

function comprarItem(card) {
    const btn = card.querySelector('button');
    const preco = btn.getAttribute('preco');
    const nvl = btn.getAttribute('nvl');
    const item = LOJA_ITENS.find(el => el.id === card.id);

    if (gameState.moedas >= preco && gameState.player.nivel >= nvl) {
        dispatch.moedas({
            tipo: 'compra',
            valor: preco
        });

        const itemRender = ({
            ativacao: item.ativacao,
            tipo: item.tipo,
            id: item.id,
            equipado: false
        });

        gameState.itens.push(itemRender);

        const card = loja_frame.querySelector(`#${item.id}`);
        card.classList.add('comprado');
        equiparItem(card);
    }
};

function moeda_show() { moeda_span.textContent = gameState.moedas; };

loja.addEventListener('click', (click) => {
    const categoria = click.target.closest('#categorias span');
    const item = click.target.closest('.comprar_container button');

    if (!categoria && !item) return;

    if (item) {
        const card = item.closest('.card');

        if (card.classList.contains('comprado')) equiparItem(card);
        else dispatch.comprarItem(card);
    }
    else if (categoria) updateUI('categoria', categoria.dataset.categoria);

});

loja_btn.addEventListener('click', () => {
    loja_container.classList.toggle('aberto');
    loja_btn.classList.toggle('aberto');
    // console.log(gameState.itens);
});

// #endregion




// #region INVENTARIO & ITENS

function efeitoNeonPulse(el) {
    const pulse = document.createElement("span");
    pulse.classList.add("neon-pulse");

    el.appendChild(pulse);

    setTimeout(() => pulse.remove(), 600);
}

// #endregion




// #region TAREFAS

const input_container = document.getElementById('input_container');
const campo_digitacao = input_container.querySelector('input');
const adicionar_btn = input_container.querySelector('button');
const apagar_tudo_btn = document.getElementById('delete_all');
const apagar_tudo_alerta = document.getElementById('delete_alerta');
const apagar_tarefa_unica = document.getElementById('delete-tarefa-unica');
const apagar_tarefa_btn = apagar_tarefa_unica.querySelector('#confirmar');

adicionar_btn.addEventListener('click', () => { add() });
campo_digitacao.addEventListener('keyup', (event) => { if (event.key === 'Enter') add(); });

function add() {
    const texto = campo_digitacao.value.trim();

    if (!texto) {
        campo_digitacao.classList.add('erro');
        return
    };
    if (campo_digitacao.classList.contains('erro')) campo_digitacao.classList.remove('erro');

    dispatch.criarTarefa(texto);

    campo_digitacao.value = '';

    if (gameState.ultimo_acesso != hoje_verificacao) dispatch.ultimoAcesso();
}

function criandoTarefa(tarefa) {

    const criando = ({
        titulo: tarefa,
        feito: false,
        id: crypto.randomUUID()
    });

    updateUI('render', criando, true);
    dispatch.adicionarTarefa(criando);

    dispatchEffects('audio', 'criar');
    total++;

    dispatch.progressoBarra(true);
    dispatch.save();
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
    const checkbox = click.target;

    if (checkbox.type !== 'checkbox') return;
    if (footer.classList.contains('nada')) footer.classList.remove('nada');

    const checked = checkbox.checked;

    const id = click.target.closest('li').id;

    gameState.tarefas.find(el => el.id == id).feito = checked;

    dispatchEffects('visual', click.target.parentElement.querySelector('.checkbox'));
    dispatchEffects('audio', 'check');

    (checked ? completos++ : completos--);

    dispatch.status({
        hoje: (checked ? checked : 'menos'),
        total: (checked ? checked : 'menos')
    });

    dispatch.moedas({ tipo: 'tarefa', add: checked });

    if (checked) {
        const posicao_XP = click.target.closest('li').querySelector('.coin');

        updateUI('spawnXP', 'tarefa', posicao_XP);
    };

    span_hoje.textContent = gameState.stats.hoje;

    setTimer('save', () => {
        dispatch.save();
        dispatch.progressoBarra();
    }, 500);

    dispatch.xp({ tipo: 'tarefa', add: checked });

    if (gameState.ultimo_acesso != hoje_verificacao) dispatch.ultimoAcesso();
});

apagar_tudo_btn.addEventListener('click', () => { apagar_tudo_alerta.classList.add('aberto'); });

apagar_tudo_alerta.addEventListener('click', (click) => {
    const target = click.target.closest('button');

    if (!target) return;

    const btn = target.id;

    if (btn === "confirmar") dispatch.reset();

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

    dispatch.save();
}

let pressTimer;

document.body.addEventListener('touchstart', function (click) {
    const target = click.target.closest('li');

    if (!target) return;

    pressTimer = setTimeout(() => { dispatch.deleteUnicoTela(target); }, 1000);
});

document.body.addEventListener('touchend', function (e) {
    // cancela se o usuário soltar antes do tempo
    clearTimeout(pressTimer);
});

document.body.addEventListener('touchmove', function (e) {
    // cancela se o dedo se mover (arrastar)
    clearTimeout(pressTimer);
});


apagar_tarefa_unica.querySelector('#cancelar').addEventListener('click', () => dispatch.deleteUnicoTela());

apagar_tarefa_btn.addEventListener('click', () => {
    dispatch.deleteTarefa(apagar_tarefa_btn.dataset.tarefaid);
});

function janelaDeleteUnico(payload) {
    apagar_tarefa_unica.classList.toggle('aberto');

    if (!apagar_tarefa_unica.classList.contains('aberto')) return;

    apagar_tarefa_unica.querySelector('p').textContent = payload.querySelector('span').textContent;

    if (payload.id) apagar_tarefa_btn.setAttribute('data-tarefaid', payload.id);
};

function apagarTarefa(id) {
    const indexTarefa = gameState.tarefas.find(el => el.id === id);
    gameState.tarefas.splice(indexTarefa, 1);

    document.getElementById(id).remove();

    dispatch.deleteUnicoTela();
    dispatch.save();
};

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
                    dispatchEffects('audio', 'progresso_completo')
                }, 500)

                if (!gameState.stats.progresso_completo_hoje) {
                    dispatch.xp({ tipo: 'progresso_completo' });
                    updateUI('spawnXP', 'progresso_completo', barra_progresso, 1000);

                    dispatch.moedas({ tipo: 'progresso_completo' });

                    dispatch.progressoHoje();
                    dispatch.status({ dias: true });
                    dispatch.save();
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

            if (!renderizando) dispatch.xp({ tipo: 'progresso' });
        }
        else if (porcentagem >= (i + 1) * 20) {
            background += `, ${cores_progresso[i]}`;

            if (!renderizando && !gameState.stats.progresso_completo_hoje) updateUI('spawnXP', 'progresso', barra_progresso, 1000);
        };
    };

    barra_progresso.style.background = `linear-gradient(90deg, ${background})`;

    if (!renderizando) {
        barra_progresso.classList.add('ativo');

        dispatchEffects('audio', 'progresso', 0.4);


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

    setTimer('streakVerificacao', () => { dispatch.streak() }, 2000);
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

            dispatch.xp({ tipo: 'streak_hoje' });

            dispatch.save();

            break
        }
    };

    if (play) {
        dispatchEffects('audio', 'streak_start');

        streak.classList.add('streak');

        await delay(700);

        streak.querySelector('span').textContent = completos;
        streak.querySelector('span').classList.add('pop');


        const posicao_XP = streak.querySelector('h2');
        updateUI('spawnXP', 'streak_hoje', posicao_XP)

        setTimer('timeoutStreak', () => {
            dispatchEffects('audio', 'streak_end');
            streak.classList.remove('streak');
            streak.querySelector('span').classList.remove('pop');
        }, 3000);
    };
};

// #endregion 




// Inicio automatico
if (gameState.tarefas.length > 0) updateUI('render', gameState.tarefas);

if (gameState.moedas > 0) updateUI('moeda');