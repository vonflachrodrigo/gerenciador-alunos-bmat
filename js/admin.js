// ============================================================
// ADMIN - VERSÃO COMPLETA COM OPTATIVAS E PRIORIDADES
// ============================================================

console.log('🚀 admin.js carregado!');

const ADMIN_SENHA = 'admin123';
let gerenciador = null;
let toastTimeout = null;
let ofertas = {};
let ofertasOptativas = {};

// ============================================================
// GERENCIADOR SIMPLES
// ============================================================

class GerenciadorSimples {
    constructor() {
        this.alunos = {};
        this.nextId = 1;
        this.alunoAtivoId = null;
        this.cursoAtivo = 'bmat';
        this.listeners = [];
        this.carregar();
    }

    getAlunos() { return this.alunos; }
    getAluno(id) { return this.alunos[id] || null; }
    getAlunoAtivo() { return this.alunoAtivoId ? this.alunos[this.alunoAtivoId] : null; }
    getTotalAlunos() { return Object.keys(this.alunos).length; }

    adicionarAluno(nome, matricula) {
        if (!nome || nome.trim() === '') throw new Error('Nome é obrigatório');
        var id = String(this.nextId++);
        this.alunos[id] = {
            nome: nome.trim(),
            matricula: matricula || '',
            progresso: {},
            optativas: {},
            optativasPlanejadas: [],
            optativasInfo: [],
            obrigatoriasPlanejadas: [],
            quebras: {},
            equiv: {},
            curso: this.cursoAtivo,
            historico_completo: {},
            totalOptativasNecessarias: 0,
            optativasCursadas: 0
        };
        this.salvar();
        this._notificar('adicionar', id);
        return id;
    }

    removerAluno(id) {
        if (!this.alunos[id]) throw new Error('Aluno não encontrado');
        var nome = this.alunos[id].nome;
        delete this.alunos[id];
        if (this.alunoAtivoId === id) {
            var keys = Object.keys(this.alunos);
            this.alunoAtivoId = keys.length > 0 ? keys[0] : null;
        }
        this.salvar();
        this._notificar('remover', { id: id, nome: nome });
        return { id: id, nome: nome };
    }

    selecionarAluno(id) {
        if (!this.alunos[id]) throw new Error('Aluno não encontrado');
        this.alunoAtivoId = id;
        this._notificar('selecionar', id);
    }

    getProgresso(id) {
        var aluno = this.getAluno(id);
        if (!aluno) return null;
        
        var curriculo = getCurriculo('bmat');
        var total = 0, done = 0, pending = 0, planned = 0;
        
        for (var s = 0; s < curriculo.length; s++) {
            var disciplinas = curriculo[s].disciplinas;
            for (var d = 0; d < disciplinas.length; d++) {
                var codigo = disciplinas[d].codigo;
                var status = aluno.progresso[codigo]?.status || 'not-started';
                total++;
                if (status === 'done' || status === 'equiv-done') done++;
                else if (status === 'pending') pending++;
                else if (status === 'planned') planned++;
            }
        }
        
        return { 
            total: total, 
            done: done, 
            pending: pending, 
            planned: planned, 
            pct: total > 0 ? Math.round((done / total) * 100) : 0 
        };
    }

    salvar() {
        try {
            localStorage.setItem('gerenciador_simples', JSON.stringify({
                alunos: this.alunos,
                nextId: this.nextId,
                cursoAtivo: this.cursoAtivo
            }));
        } catch (e) {}
    }

    carregar() {
        try {
            var saved = localStorage.getItem('gerenciador_simples');
            if (saved) {
                var data = JSON.parse(saved);
                this.alunos = data.alunos || {};
                this.nextId = data.nextId || 1;
                this.cursoAtivo = data.cursoAtivo || 'bmat';
                var keys = Object.keys(this.alunos);
                this.alunoAtivoId = keys.length > 0 ? keys[0] : null;
            }
        } catch (e) {}
    }

    _notificar(evento, dados) {
        for (var i = 0; i < this.listeners.length; i++) {
            try { this.listeners[i](evento, dados); } catch (e) {}
        }
    }

    adicionarListener(fn) {
        this.listeners.push(fn);
    }
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function getNomeDisciplina(codigo) {
    if (typeof CONFIG !== 'undefined' && CONFIG.nomesDisciplinas) {
        return CONFIG.nomesDisciplinas[codigo] || codigo;
    }
    var nomes = {
        'GCET146': 'Cálculo Diferencial e Integral I',
        'GCET147': 'Cálculo Diferencial e Integral II',
        'GCET148': 'Cálculo Diferencial e Integral III',
        'GCET149': 'Cálculo Diferencial e Integral IV',
        'GCET095': 'Física Geral e Experimental I',
        'GCET099': 'Física Geral e Experimental II',
        'GCET102': 'Física Geral e Experimental III',
        'GCET106': 'Física Geral e Experimental IV',
        'GCET061': 'Geometria Analítica',
        'GCET065': 'Álgebra Linear I',
        'GCET175': 'Álgebra Linear II',
        'GCET172': 'Álgebra I',
        'GCET178': 'Álgebra II',
        'GCET173': 'Análise I',
        'GCET174': 'Técnicas de Demonstração',
        'GCET150': 'Processamento de Dados I',
        'GCET151': 'Processamento de Dados II',
        'GCET059': 'Cálculo Numérico',
        'GCET060': 'Métodos Estatísticos',
        'GCET066': 'Química Geral',
        'GCET510': 'Construção de Números',
        'GCET511': 'Introdução às Curvas Planas',
        'GCET176': 'Geometria Plana e Espacial',
        'GCET177': 'Geometria Diferencial',
        'GCET179': 'Funções de Variável Complexa',
        'GCET180': 'Topologia Geral',
        'GCET189': 'Cálculo Avançado',
        'GCET660': 'Teoria da Medida e Integração',
        'GCET661': 'Equações Diferenciais Parciais',
        'GCET663': 'Probabilidade',
        'GCET161': 'Trabalho de Conclusão de Curso I (TCC)',
        'GCET677': 'TCC (BMAT)',
        'GCET678': 'Análise Numérica',
        'GCCA235': 'Fundamentos da Filosofia',
        'GCCA283': 'Metodologia da Pesquisa Científica',
        'GCCA310': 'Ética e Sustentabilidade',
        'GCET152': 'Cálculo Numérico II',
        'GCET153': 'Equações Diferenciais',
        'GCET155': 'Álgebra III',
        'GCET184': 'Métodos Matemáticos',
        'GCET194': 'Funções Analíticas',
        'GCET200': 'Tópicos Especiais em Matemática I',
        'GCET201': 'Tópicos Especiais em Matemática II',
        'GCET218': 'Desenho Técnico',
        'GCET508': 'Matemática Discreta',
        'GCET665': 'Análise Funcional',
        'GCET666': 'Geometria Não Euclidiana',
        'GCET667': 'História da Matemática',
        'GCET668': 'Introdução às Curvas Algébricas',
        'GCET669': 'Introdução aos Sistemas Dinâmicos',
        'GCET670': 'Matemática Financeira',
        'GCET671': 'Modelagem e Simulação Matemática',
        'GCET672': 'Otimização de Sistemas',
        'GCET673': 'Teoria dos Números',
        'GCET674': 'Tópicos de Álgebra',
        'GCET675': 'Tópicos de Análise',
        'GCET676': 'Tópicos de Geometria'
    };
    return nomes[codigo] || codigo;
}

function getCurriculo(curso) {
    if (typeof CONFIG !== 'undefined' && CONFIG.curriculoBMAT) {
        return CONFIG.curriculoBMAT;
    }
    return [
        { nome: '1º Semestre', cls: 's1', disciplinas: [
            { codigo: 'GCET146', horas: '85h' }, { codigo: 'GCET095', horas: '85h' },
            { codigo: 'GCET061', horas: '68h' }, { codigo: 'GCET150', horas: '68h' },
            { codigo: 'GCET066', horas: '68h' }, { codigo: 'GCCA283', horas: '68h' }
        ]},
        { nome: '2º Semestre', cls: 's2', disciplinas: [
            { codigo: 'GCET147', horas: '85h' }, { codigo: 'GCET099', horas: '85h' },
            { codigo: 'GCET065', horas: '68h' }, { codigo: 'GCET151', horas: '68h' },
            { codigo: 'GCCA235', horas: '68h' }, { codigo: 'GCCA310', horas: '34h' }
        ]},
        { nome: '3º Semestre', cls: 's3', disciplinas: [
            { codigo: 'GCET148', horas: '85h' }, { codigo: 'GCET102', horas: '85h' },
            { codigo: 'GCET060', horas: '68h' }, { codigo: 'GCET059', horas: '68h' },
            { codigo: 'GCET174', horas: '68h' }
        ]},
        { nome: '4º Semestre', cls: 's4', disciplinas: [
            { codigo: 'GCET149', horas: '85h' }, { codigo: 'GCET106', horas: '85h' },
            { codigo: 'GCET172', horas: '85h' }, { codigo: 'GCET175', horas: '68h' },
            { codigo: 'GCET510', horas: '68h' }
        ]},
        { nome: '5º Semestre', cls: 's5', disciplinas: [
            { codigo: 'GCET173', horas: '85h' }, { codigo: 'GCET176', horas: '68h' },
            { codigo: 'GCET178', horas: '68h' }, { codigo: 'GCET511', horas: '68h' },
            { codigo: 'GCET663', horas: '68h' }
        ]},
        { nome: '6º Semestre', cls: 's6', disciplinas: [
            { codigo: 'GCET161', horas: '51h' }, { codigo: 'GCET177', horas: '68h' },
            { codigo: 'GCET179', horas: '68h' }, { codigo: 'GCET180', horas: '85h' }
        ]},
        { nome: '7º Semestre', cls: 's7', disciplinas: [
            { codigo: 'GCET189', horas: '68h' }, { codigo: 'GCET660', horas: '68h' },
            { codigo: 'GCET661', horas: '68h' }, { codigo: 'GCET678', horas: '68h' }
        ]},
        { nome: '8º Semestre', cls: 's8', disciplinas: [
            { codigo: 'GCET677', horas: '17h' }
        ]}
    ];
}

function isOptativaGlobal(codigo) {
    var optativas = [
        'GCET152', 'GCET153', 'GCET155', 'GCET184', 'GCET194',
        'GCET200', 'GCET201', 'GCET218', 'GCET508', 'GCET665',
        'GCET666', 'GCET667', 'GCET668', 'GCET669', 'GCET670',
        'GCET671', 'GCET672', 'GCET673', 'GCET674', 'GCET675',
        'GCET676', 'GCETIMC', 'GCETMD', 'GCF247'
    ];
    return optativas.indexOf(codigo) !== -1;
}

// ============================================================
// EXTRAÇÃO DE OBRIGATÓRIAS PLANEJADAS
// ============================================================

function extrairObrigatoriasPlanejadas(textoCompleto) {
    var obrigatorias = [];
    var codigosVistos = {};

    console.log('🔍 Extraindo obrigatórias planejadas...');

    var seccaoMatch = textoCompleto.match(/OBRIGATORIAS PLANEJADAS[^:]*:([\s\S]*?)(?=RESUMO DE OPTATIVAS|OBRIGATORIAS PLANEJADAS|$)/i);
    if (seccaoMatch) {
        console.log('📌 Seção "OBRIGATORIAS PLANEJADAS" encontrada!');
        var secaoTexto = seccaoMatch[1];
        
        var regex = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+?)\s*\(\d+h\)/gi;
        var match;
        while ((match = regex.exec(secaoTexto)) !== null) {
            var codigo = match[1].trim();
            var nome = match[2].trim();
            
            if (!codigosVistos[codigo]) {
                codigosVistos[codigo] = true;
                obrigatorias.push({ 
                    codigo: codigo, 
                    nome: nome, 
                    fonte: 'secao_obrigatorias' 
                });
                console.log('📌 Obrigatória (seção):', codigo, '-', nome);
            }
        }
    } else {
        console.log('⚠️ Seção "OBRIGATORIAS PLANEJADAS" NÃO encontrada!');
    }

    var regexFluxo = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+)\((\d+h)\)/gi;
    var matchFluxo;
    while ((matchFluxo = regexFluxo.exec(textoCompleto)) !== null) {
        var codigo = matchFluxo[1].trim();
        var nomeCompleto = matchFluxo[2].trim();
        var isOptativa = isOptativaGlobal(codigo);
        if (nomeCompleto.toLowerCase().indexOf('optativa') !== -1) {
            isOptativa = true;
        }
        if (!isOptativa && !codigosVistos[codigo]) {
            codigosVistos[codigo] = true;
            obrigatorias.push({ 
                codigo: codigo, 
                nome: matchFluxo[2].trim(), 
                fonte: 'fluxograma' 
            });
            console.log('📌 Obrigatória (fluxograma):', codigo);
        }
    }

    console.log('📊 Total de obrigatórias extraídas:', obrigatorias.length);
    return obrigatorias;
}

// ============================================================
// EXTRAÇÃO DE OPTATIVAS PLANEJADAS
// ============================================================

function extrairOptativasPlanejadas(textoCompleto) {
    var optativas = [];
    var codigosVistos = {};

    console.log('🔍 Extraindo optativas planejadas...');

    var seccaoMatch = textoCompleto.match(/Optativas Planejadas[^:]*:([\s\S]*?)(?=Optativas ja cursadas|ATENCAO|LEGENDA|RESUMO DE OPTATIVAS|$)/i);
    if (seccaoMatch) {
        console.log('📌 Seção "Optativas Planejadas" encontrada!');
        var secaoTexto = seccaoMatch[1];
        
        var regex = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+?)\s*\(Prioridade\s*(\d+)\)/gi;
        var match;
        var encontrou = false;
        
        while ((match = regex.exec(secaoTexto)) !== null) {
            encontrou = true;
            var codigo = match[1].trim();
            var nome = match[2].trim();
            var prioridade = parseInt(match[3]);
            
            console.log('📌 Optativa encontrada:', codigo, '-', nome, 'Prioridade:', prioridade);
            
            if (!codigosVistos[codigo]) {
                codigosVistos[codigo] = true;
                optativas.push({ 
                    codigo: codigo, 
                    nome: nome, 
                    prioridade: prioridade,
                    fonte: 'secao_optativas'
                });
            }
        }
        
        if (!encontrou) {
            console.log('⚠️ Tentando regex alternativo para optativas...');
            var regexAlt = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+)/gi;
            var matchAlt;
            while ((matchAlt = regexAlt.exec(secaoTexto)) !== null) {
                var codigo = matchAlt[1].trim();
                var nome = matchAlt[2].trim();
                
                var prioridade = 0;
                var prioridadeMatch = matchAlt[0].match(/Prioridade\s*(\d+)/i);
                if (prioridadeMatch) {
                    prioridade = parseInt(prioridadeMatch[1]);
                }
                
                console.log('📌 Optativa encontrada (alt):', codigo, '-', nome, 'Prioridade:', prioridade);
                
                if (!codigosVistos[codigo]) {
                    codigosVistos[codigo] = true;
                    optativas.push({ 
                        codigo: codigo, 
                        nome: nome, 
                        prioridade: prioridade,
                        fonte: 'secao_optativas'
                    });
                }
            }
        }
    } else {
        console.log('⚠️ Seção "Optativas Planejadas" NÃO encontrada!');
    }

    if (optativas.length === 0) {
        console.log('🔍 Procurando optativas no fluxograma...');
        var regexFluxo = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+)\([^)]*optativa[^)]*\)/gi;
        var matchFluxo;
        while ((matchFluxo = regexFluxo.exec(textoCompleto)) !== null) {
            var codigo = matchFluxo[1].trim();
            if (!codigosVistos[codigo]) {
                codigosVistos[codigo] = true;
                optativas.push({ 
                    codigo: codigo, 
                    nome: matchFluxo[2].trim(), 
                    prioridade: 0,
                    fonte: 'fluxograma'
                });
                console.log('📌 Optativa no fluxograma:', codigo);
            }
        }
    }

    console.log('📊 Total de optativas extraídas:', optativas.length);
    return optativas;
}

// ============================================================
// CONSOLIDAÇÃO - OBRIGATÓRIAS
// ============================================================

function getDisciplinasConsolidadas() {
    var mapa = {};
    var alunos = gerenciador.getAlunos();

    for (var id in alunos) {
        var aluno = alunos[id];
        var obrigatorias = aluno.obrigatoriasPlanejadas || [];

        for (var i = 0; i < obrigatorias.length; i++) {
            var codigo = obrigatorias[i];
            
            if (!mapa[codigo]) {
                mapa[codigo] = {
                    codigo: codigo,
                    nome: getNomeDisciplina(codigo),
                    alunos: [],
                    total: 0
                };
            }

            var jaExiste = false;
            for (var a = 0; a < mapa[codigo].alunos.length; a++) {
                if (mapa[codigo].alunos[a].id === id) { jaExiste = true; break; }
            }

            if (!jaExiste) {
                mapa[codigo].alunos.push({ id: id, nome: aluno.nome });
                mapa[codigo].total++;
            }
        }
    }

    var resultado = [];
    for (var cod in mapa) {
        resultado.push(mapa[cod]);
    }
    resultado.sort(function(a, b) { return b.total - a.total; });
    return resultado;
}

// ============================================================
// CONSOLIDAÇÃO - OPTATIVAS
// ============================================================

function getOptativasConsolidadas() {
    var mapa = {};
    var alunos = gerenciador.getAlunos();

    for (var id in alunos) {
        var aluno = alunos[id];
        var optativas = aluno.optativasInfo || [];

        for (var i = 0; i < optativas.length; i++) {
            var opt = optativas[i];
            var codigo = opt.codigo;
            var prioridade = opt.prioridade || 0;
            
            if (!mapa[codigo]) {
                mapa[codigo] = {
                    codigo: codigo,
                    nome: getNomeDisciplina(codigo),
                    alunos: [],
                    alunosP1: [],
                    alunosP2: [],
                    alunosP3: [],
                    alunosP4: [],
                    alunosP5: [],
                    total: 0,
                    totalP1: 0,
                    totalP2: 0,
                    totalP3: 0,
                    totalP4: 0,
                    totalP5: 0
                };
            }

            var jaExiste = false;
            for (var a = 0; a < mapa[codigo].alunos.length; a++) {
                if (mapa[codigo].alunos[a].id === id) { jaExiste = true; break; }
            }

            if (!jaExiste) {
                mapa[codigo].alunos.push({ 
                    id: id, 
                    nome: aluno.nome,
                    prioridade: prioridade
                });
                mapa[codigo].total++;

                if (prioridade === 1) {
                    mapa[codigo].alunosP1.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalP1++;
                } else if (prioridade === 2) {
                    mapa[codigo].alunosP2.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalP2++;
                } else if (prioridade === 3) {
                    mapa[codigo].alunosP3.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalP3++;
                } else if (prioridade === 4) {
                    mapa[codigo].alunosP4.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalP4++;
                } else if (prioridade === 5) {
                    mapa[codigo].alunosP5.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalP5++;
                }
            }
        }
    }

    var resultado = [];
    for (var cod in mapa) {
        resultado.push(mapa[cod]);
    }
    resultado.sort(function(a, b) { return b.total - a.total; });
    return resultado;
}

// ============================================================
// LOGIN / LOGOUT
// ============================================================

function fazerLogin() {
    console.log('🔐 fazerLogin chamado');
    
    var senhaInput = document.getElementById('loginSenha');
    var erroEl = document.getElementById('loginErro');
    var senha = senhaInput.value.trim();

    if (senha === ADMIN_SENHA) {
        console.log('✅ Login correto!');
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('adminApp').style.display = 'block';
        erroEl.textContent = '';
        senhaInput.value = '';
        inicializarAdmin();
    } else {
        console.log('❌ Senha incorreta');
        erroEl.textContent = '❌ Senha incorreta. Tente novamente.';
        senhaInput.value = '';
        senhaInput.focus();
        setTimeout(function() { erroEl.textContent = ''; }, 3000);
    }
}

function fazerLogout() {
    if (!confirm('Tem certeza que deseja sair?')) return;
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('adminApp').style.display = 'none';
    document.getElementById('loginSenha').value = '';
    document.getElementById('loginErro').textContent = '';
}

// ============================================================
// TOAST
// ============================================================

function showToast(msg, type) {
    type = type || 'info';
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + type + ' show';
    clearTimeout(toastTimeout);
    el.onclick = function() { el.classList.remove('show'); clearTimeout(toastTimeout); };
    toastTimeout = setTimeout(function() { el.classList.remove('show'); }, 4000);
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

function inicializarAdmin() {
    console.log('🚀 Inicializando Admin...');
    
    try {
        gerenciador = new GerenciadorSimples();
        console.log('📚 Alunos:', Object.keys(gerenciador.getAlunos()).length);

        renderAlunoList();
        updateAlunoCount();
        renderConsolidacao();
        updateConsolidacaoBadge();

        gerenciador.adicionarListener(function(evento, dados) {
            console.log('📢 Evento:', evento);
            renderAlunoList();
            updateAlunoCount();
            renderConsolidacao();
            updateConsolidacaoBadge();
            gerenciador.salvar();
        });

        var keys = Object.keys(gerenciador.getAlunos());
        if (keys.length > 0 && !gerenciador.alunoAtivoId) {
            gerenciador.selecionarAluno(keys[0]);
        }
        
        console.log('✅ Admin inicializado com sucesso!');
        showToast('✅ Admin carregado com ' + keys.length + ' aluno(s)!', 'success');

    } catch (error) {
        console.error('❌ Erro:', error);
        showToast('❌ Erro: ' + error.message, 'error');
    }
}

// ============================================================
// RENDER - LISTA DE ALUNOS
// ============================================================

function renderAlunoList() {
    var container = document.getElementById('alunoList');
    if (!container) return;
    
    var alunos = gerenciador.getAlunos();
    var keys = Object.keys(alunos);

    if (keys.length === 0) {
        container.innerHTML = '<div style="padding:16px;text-align:center;color:#999;">Nenhum aluno importado</div>';
        return;
    }

    container.innerHTML = '';
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var aluno = alunos[id];
        var progresso = gerenciador.getProgresso(id);
        var pct = progresso ? progresso.pct || 0 : 0;

        var div = document.createElement('div');
        div.className = 'aluno-item-admin';
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;margin-bottom:4px;background:#f5f5f5;border-left:3px solid #1a237e;';
        
        var matriculaStr = aluno.matricula ? ' (' + aluno.matricula + ')' : '';

        var infoSpan = document.createElement('span');
        infoSpan.className = 'nome';
        infoSpan.textContent = aluno.nome + matriculaStr + ' - ' + (progresso ? progresso.done + '/' + progresso.total + ' (' + pct + '%)' : '0/0 (0%)');

        var btnRemove = document.createElement('button');
        btnRemove.textContent = '✕';
        btnRemove.style.cssText = 'background:none;border:none;cursor:pointer;color:#c62828;font-size:16px;font-weight:bold;padding:0 4px;';
        btnRemove.title = 'Remover aluno';
        btnRemove.onclick = (function(id) {
            return function(e) {
                e.stopPropagation();
                removerAlunoHandler(id);
            };
        })(id);

        div.appendChild(infoSpan);
        div.appendChild(btnRemove);
        container.appendChild(div);
    }
}

function updateAlunoCount() {
    var el = document.getElementById('alunoCount');
    if (el) el.textContent = gerenciador.getTotalAlunos();
}

function updateConsolidacaoBadge() {
    var obrigatorias = getDisciplinasConsolidadas();
    var optativas = getOptativasConsolidadas();
    var total = obrigatorias.length + optativas.length;
    var badge = document.getElementById('consolidacaoBadge');
    if (badge) badge.textContent = total;
}

// ============================================================
// REMOVER ALUNO
// ============================================================

function removerAlunoHandler(id) {
    var aluno = gerenciador.getAluno(id);
    if (!aluno) return;
    if (!confirm('Remover aluno "' + aluno.nome + '"?')) return;

    try {
        gerenciador.removerAluno(id);
        showToast('🗑️ Aluno removido.', 'info');
    } catch (error) {
        showToast('❌ ' + error.message, 'error');
    }
}

// ============================================================
// RENDER - CONSOLIDAÇÃO
// ============================================================

function renderConsolidacao() {
    var container = document.getElementById('consolidacaoContent');
    if (!container) return;

    var obrigatorias = getDisciplinasConsolidadas();
    var optativas = getOptativasConsolidadas();
    var totalAlunos = gerenciador.getTotalAlunos();

    for (var i = 0; i < obrigatorias.length; i++) {
        var cod = obrigatorias[i].codigo;
        if (!(cod in ofertas)) {
            ofertas[cod] = true;
        }
    }
    for (var i = 0; i < optativas.length; i++) {
        var cod = optativas[i].codigo;
        if (!(cod in ofertasOptativas)) {
            ofertasOptativas[cod] = true;
        }
    }

    if (totalAlunos === 0) {
        container.innerHTML = 
            '<div class="no-aluno" style="padding:40px 20px;">' +
                '<h3>👨‍🎓 Nenhum aluno cadastrado</h3>' +
                '<p>Importe relatórios para ver a consolidação.</p>' +
            '</div>';
        return;
    }

    if (obrigatorias.length === 0 && optativas.length === 0) {
        container.innerHTML = 
            '<div class="no-aluno" style="padding:40px 20px;">' +
                '<h3>📌 Nenhuma disciplina planejada</h3>' +
                '<p>Nenhum aluno marcou disciplinas como planejadas [P].</p>' +
            '</div>';
        return;
    }

    var html = '';

    html += 
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">' +
            '<div>' +
                '<span style="font-size:14px;color:#666;">' +
                    (obrigatorias.length + optativas.length) + ' disciplina(s) planejada(s) · ' + totalAlunos + ' aluno(s)' +
                '</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button onclick="gerarRelatorioConsolidado()" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#1a237e;color:white;">📄 Gerar Relatório</button>' +
                '<button onclick="toggleAllOfertas(true)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#4caf50;color:white;">✅ Oferecer todas</button>' +
                '<button onclick="toggleAllOfertas(false)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#ef5350;color:white;">❌ Não oferecer todas</button>' +
            '</div>' +
        '</div>';

    if (obrigatorias.length > 0) {
        html += 
            '<div style="margin-bottom:16px;">' +
                '<div style="font-weight:bold;color:#1a237e;font-size:15px;margin-bottom:8px;">📚 OBRIGATÓRIAS PLANEJADAS</div>' +
                '<div style="background:#f8f9fa;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">' +
                    '<div style="display:grid;grid-template-columns:3fr 1fr 2fr 1fr;background:#1a237e;color:white;padding:10px 14px;font-weight:bold;font-size:13px;gap:8px;">' +
                        '<div>Disciplina</div>' +
                        '<div style="text-align:center;">Alunos</div>' +
                        '<div>Lista de Alunos</div>' +
                        '<div style="text-align:center;">Oferecer?</div>' +
                    '</div>';

        for (var i = 0; i < obrigatorias.length; i++) {
            var disc = obrigatorias[i];
            var isOfertada = ofertas[disc.codigo] !== false;
            var bgColor = isOfertada ? '#e8f5e9' : '#ffebee';

            var nomes = [];
            for (var j = 0; j < disc.alunos.length; j++) {
                nomes.push(disc.alunos[j].nome);
            }
            var alunosStr = nomes.join(', ');
            if (nomes.length > 5) {
                alunosStr = nomes.slice(0, 5).join(', ') + ' +' + (nomes.length - 5) + ' outros';
            }

            html += 
                '<div style="display:grid;grid-template-columns:3fr 1fr 2fr 1fr;padding:10px 14px;background:' + bgColor + ';border-bottom:1px solid #e0e0e0;gap:8px;align-items:center;font-size:13px;">' +
                    '<div>' +
                        '<strong>' + disc.codigo + '</strong>' +
                        '<span style="color:#666;font-size:12px;display:block;">' + disc.nome + '</span>' +
                    '</div>' +
                    '<div style="text-align:center;font-weight:bold;font-size:18px;color:#1a237e;">' + disc.total + '</div>' +
                    '<div style="font-size:12px;color:#333;word-break:break-word;">' + (alunosStr || '-') + 
                        (nomes.length > 5 ? '<span style="color:#666;font-size:10px;display:block;">(' + nomes.length + ' total)</span>' : '') +
                    '</div>' +
                    '<div style="text-align:center;">' +
                        '<button onclick="toggleOferta(\'' + disc.codigo + '\')" style="padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;min-width:80px;background:' + (isOfertada ? '#4caf50' : '#ef5350') + ';color:white;">' +
                            (isOfertada ? '✅ Oferecer' : '❌ Não oferecer') +
                        '</button>' +
                    '</div>' +
                '</div>';
        }

        html += '</div></div>';
    }

    if (optativas.length > 0) {
        html += 
            '<div style="margin-bottom:16px;">' +
                '<div style="font-weight:bold;color:#4a148c;font-size:15px;margin-bottom:8px;">📌 OPTATIVAS PLANEJADAS</div>' +
                '<div style="background:#f8f9fa;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">' +
                    '<div style="display:grid;grid-template-columns:2.5fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 1fr 1fr;background:#4a148c;color:white;padding:10px 14px;font-weight:bold;font-size:11px;gap:4px;">' +
                        '<div>Optativa</div>' +
                        '<div style="text-align:center;cursor:help;" title="Prioridade 1">P1</div>' +
                        '<div style="text-align:center;cursor:help;" title="Prioridade 2">P2</div>' +
                        '<div style="text-align:center;cursor:help;" title="Prioridade 3">P3</div>' +
                        '<div style="text-align:center;cursor:help;" title="Prioridade 4">P4</div>' +
                        '<div style="text-align:center;cursor:help;" title="Prioridade 5">P5</div>' +
                        '<div style="text-align:center;">Total</div>' +
                        '<div style="text-align:center;">Oferecer?</div>' +
                    '</div>';

        for (var i = 0; i < optativas.length; i++) {
            var disc = optativas[i];
            var isOfertada = ofertasOptativas[disc.codigo] !== false;
            var bgColor = isOfertada ? '#f3e5f5' : '#fce4ec';

            var alunosInfo = [];
            for (var j = 0; j < disc.alunos.length; j++) {
                var a = disc.alunos[j];
                alunosInfo.push(a.nome + ' (P' + a.prioridade + ')');
            }
            var alunosStr = alunosInfo.join(', ');
            if (alunosInfo.length > 3) {
                alunosStr = alunosInfo.slice(0, 3).join(', ') + ' +' + (alunosInfo.length - 3) + ' outros';
            }

            html += 
                '<div style="display:grid;grid-template-columns:2.5fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 1fr 1fr;padding:8px 12px;background:' + bgColor + ';border-bottom:1px solid #e0e0e0;gap:4px;align-items:center;font-size:11px;">' +
                    '<div>' +
                        '<strong>' + disc.codigo + '</strong>' +
                        '<span style="color:#666;font-size:10px;display:block;">' + disc.nome + '</span>' +
                    '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP1 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP2 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP3 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP4 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP5 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;font-size:14px;color:#4a148c;">' + disc.total + '</div>' +
                    '<div style="text-align:center;">' +
                        '<button onclick="toggleOfertaOptativa(\'' + disc.codigo + '\')" style="padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:11px;min-width:60px;background:' + (isOfertada ? '#4caf50' : '#ef5350') + ';color:white;">' +
                            (isOfertada ? '✅ Sim' : '❌ Não') +
                        '</button>' +
                    '</div>' +
                '</div>';
        }

        html += '</div></div>';

        html += 
            '<div style="margin-top:4px;padding:6px 12px;background:#f5f5f5;border-radius:6px;font-size:11px;color:#666;">' +
                '📌 <strong>P1 a P5</strong> = Prioridade escolhida pelo aluno (P1 = maior prioridade)' +
            '</div>';
    }

    var totalSelecionadas = 0;
    var totalNaoSelecionadas = 0;
    for (var c in ofertas) {
        if (ofertas[c]) totalSelecionadas++;
        else totalNaoSelecionadas++;
    }
    for (var c in ofertasOptativas) {
        if (ofertasOptativas[c]) totalSelecionadas++;
        else totalNaoSelecionadas++;
    }

    html += 
        '<div style="margin-top:12px;padding:10px 14px;background:#e3f2fd;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;font-size:13px;">' +
            '<div><span style="font-weight:bold;">✅ Oferecidas:</span> <span style="font-weight:bold;color:#2e7d32;">' + totalSelecionadas + '</span></div>' +
            '<div><span style="font-weight:bold;">❌ Não oferecidas:</span> <span style="font-weight:bold;color:#c62828;">' + totalNaoSelecionadas + '</span></div>' +
            '<div><span style="font-weight:bold;">📚 Total planejadas:</span> <span style="font-weight:bold;color:#1a237e;">' + (obrigatorias.length + optativas.length) + '</span></div>' +
            '<div><span style="font-weight:bold;">👨‍🎓 Total de alunos:</span> <span style="font-weight:bold;color:#1a237e;">' + totalAlunos + '</span></div>' +
        '</div>';

    container.innerHTML = html;
}

// ============================================================
// CONTROLES DE OFERTA
// ============================================================

function toggleOferta(codigo) {
    ofertas[codigo] = !ofertas[codigo];
    renderConsolidacao();
}

function toggleOfertaOptativa(codigo) {
    ofertasOptativas[codigo] = !ofertasOptativas[codigo];
    renderConsolidacao();
}

function toggleAllOfertas(status) {
    for (var cod in ofertas) {
        ofertas[cod] = status;
    }
    for (var cod in ofertasOptativas) {
        ofertasOptativas[cod] = status;
    }
    renderConsolidacao();
    var msg = status ? '✅ Todas as disciplinas marcadas como oferecidas!' : '❌ Todas as disciplinas marcadas como não oferecidas!';
    showToast(msg, status ? 'success' : 'info');
}

// ============================================================
// GERAR RELATÓRIO PDF (SEM EMOJIS)
// ============================================================

function gerarRelatorioConsolidado() {
    var obrigatorias = getDisciplinasConsolidadas();
    var optativas = getOptativasConsolidadas();

    if (obrigatorias.length === 0 && optativas.length === 0) {
        showToast('⚠️ Nenhuma disciplina planejada para gerar relatório.', 'warning');
        return;
    }

    var texto = '='.repeat(80) + '\n';
    texto += 'RELATORIO DE OFERTA DE DISCIPLINAS\n';
    texto += '='.repeat(80) + '\n';
    texto += 'Data: ' + new Date().toLocaleString('pt-BR') + '\n';
    texto += 'Total de alunos: ' + gerenciador.getTotalAlunos() + '\n\n';

    // ============================================================
    // OBRIGATÓRIAS SELECIONADAS PARA OFERTA
    // ============================================================
    texto += 'OBRIGATORIAS SELECIONADAS PARA OFERTA\n';
    texto += '-'.repeat(80) + '\n\n';

    var temSelecionadas = false;
    for (var i = 0; i < obrigatorias.length; i++) {
        var disc = obrigatorias[i];
        if (ofertas[disc.codigo]) {
            temSelecionadas = true;
            texto += '[OFERTA] ' + disc.codigo + ' - ' + disc.nome + '\n';
            texto += '   ' + disc.total + ' aluno(s) planejaram\n';
            if (disc.alunos.length > 0) {
                var nomes = [];
                for (var j = 0; j < disc.alunos.length; j++) {
                    nomes.push(disc.alunos[j].nome);
                }
                texto += '   Alunos: ' + nomes.join(', ') + '\n';
            }
            texto += '\n';
        }
    }
    if (!temSelecionadas) texto += 'Nenhuma obrigatoria selecionada.\n\n';

    // ============================================================
    // OBRIGATÓRIAS NÃO OFERTADAS
    // ============================================================
    texto += 'OBRIGATORIAS NAO OFERTADAS\n';
    texto += '-'.repeat(80) + '\n\n';

    var temNaoOfertadas = false;
    for (var i = 0; i < obrigatorias.length; i++) {
        var disc = obrigatorias[i];
        if (!ofertas[disc.codigo]) {
            temNaoOfertadas = true;
            texto += '[NAO OFERTADA] ' + disc.codigo + ' - ' + disc.nome + '\n';
            texto += '   ' + disc.total + ' aluno(s) ficarao sem\n';
            if (disc.alunos.length > 0) {
                var nomes = [];
                for (var j = 0; j < disc.alunos.length; j++) {
                    nomes.push(disc.alunos[j].nome);
                }
                texto += '   Alunos afetados: ' + nomes.join(', ') + '\n';
            }
            texto += '\n';
        }
    }
    if (!temNaoOfertadas) texto += 'Todas as obrigatorias planejadas foram selecionadas.\n\n';

    // ============================================================
    // OPTATIVAS OFERTADAS
    // ============================================================
    if (optativas.length > 0) {
        texto += 'OPTATIVAS OFERTADAS\n';
        texto += '-'.repeat(80) + '\n\n';

        var temOptOfertadas = false;
        for (var i = 0; i < optativas.length; i++) {
            var disc = optativas[i];
            if (ofertasOptativas[disc.codigo]) {
                temOptOfertadas = true;
                texto += '[OFERTA] ' + disc.codigo + ' - ' + disc.nome + '\n';
                texto += '   Total: ' + disc.total + ' aluno(s)\n';
                if (disc.alunos.length > 0) {
                    var nomes = [];
                    for (var j = 0; j < disc.alunos.length; j++) {
                        nomes.push(disc.alunos[j].nome + ' (P' + disc.alunos[j].prioridade + ')');
                    }
                    texto += '   Alunos: ' + nomes.join(', ') + '\n';
                }
                texto += '\n';
            }
        }
        if (!temOptOfertadas) texto += 'Nenhuma optativa selecionada.\n\n';

        // ============================================================
        // OPTATIVAS NÃO OFERTADAS
        // ============================================================
        texto += 'OPTATIVAS NAO OFERTADAS\n';
        texto += '-'.repeat(80) + '\n\n';

        var temOptNaoOfertadas = false;
        for (var i = 0; i < optativas.length; i++) {
            var disc = optativas[i];
            if (!ofertasOptativas[disc.codigo]) {
                temOptNaoOfertadas = true;
                texto += '[NAO OFERTADA] ' + disc.codigo + ' - ' + disc.nome + '\n';
                texto += '   ' + disc.total + ' aluno(s) escolheram como alternativa\n';
                if (disc.alunos.length > 0) {
                    var nomes = [];
                    for (var j = 0; j < disc.alunos.length; j++) {
                        nomes.push(disc.alunos[j].nome + ' (P' + disc.alunos[j].prioridade + ')');
                    }
                    texto += '   Alunos: ' + nomes.join(', ') + '\n';
                }
                texto += '\n';
            }
        }
        if (!temOptNaoOfertadas) texto += 'Todas as optativas planejadas foram selecionadas.\n\n';
    }

    texto += '='.repeat(80) + '\n';
    texto += 'Relatorio gerado em ' + new Date().toLocaleString('pt-BR') + '\n';

    // ============================================================
    // GERAR PDF
    // ============================================================
    try {
        var { jsPDF } = window.jspdf;
        var pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        var margin = 20;
        var pageWidth = pdf.internal.pageSize.getWidth();
        var pageHeight = pdf.internal.pageSize.getHeight();
        var maxWidth = pageWidth - 2 * margin;
        var lineHeight = 5;
        var y = margin;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');

        var lines = texto.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var wrapped = pdf.splitTextToSize(lines[i], maxWidth);
            for (var j = 0; j < wrapped.length; j++) {
                if (y + lineHeight > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                }
                pdf.text(wrapped[j], margin, y);
                y += lineHeight;
            }
        }

        var nomeArquivo = 'relatorio_ofertas_' + new Date().toISOString().slice(0, 10) + '.pdf';
        pdf.save(nomeArquivo);
        showToast('📄 Relatorio de ofertas gerado com sucesso!', 'success');
    } catch (e) {
        console.log(texto);
        showToast('📄 Relatorio gerado no console (F12)', 'info');
    }
}

// ============================================================
// HANDLER - IMPORTAÇÃO DE RELATÓRIOS PDF
// ============================================================

function importarRelatoriosHandler(event) {
    var files = event.target.files;
    if (!files || files.length === 0) return;

    var preview = document.getElementById('relatorioPreview');
    preview.style.display = 'block';
    preview.innerHTML = '<div class="info">⏳ Processando ' + files.length + ' relatório(s)...</div>';

    var totalProcessados = 0;
    var erros = [];

    for (var f = 0; f < files.length; f++) {
        var file = files[f];
        var reader = new FileReader();
        
        reader.onload = (function(file) {
            return async function(e) {
                try {
                    var arrayBuffer = e.target.result;
                    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    var textoCompleto = '';

                    for (var i = 1; i <= pdf.numPages; i++) {
                        var page = await pdf.getPage(i);
                        var textContent = await page.getTextContent();
                        var pageText = textContent.items.map(function(item) { return item.str; }).join(' ');
                        textoCompleto += pageText + '\n';
                    }

                    var nomeMatch = textoCompleto.match(/Aluno:\s*([^C]+?)\s*Curso:/i);
                    var nomeAluno = nomeMatch ? nomeMatch[1].trim() : file.name.replace('.pdf', '');
                    nomeAluno = nomeAluno.replace(/^Aluno:\s*/i, '').trim();

                    if (nomeAluno.length > 50 || nomeAluno.includes('Progresso')) {
                        nomeAluno = file.name.replace('.pdf', '').replace('relatorio_', '').replace(/_/g, ' ');
                        nomeAluno = nomeAluno.replace(/\b\w/g, function(l) { return l.toUpperCase(); });
                    }

                    console.log('📌 Nome extraído:', nomeAluno);

                    var cursoMatch = textoCompleto.match(/Curso:\s*([^P]+?)\s*Progresso:/i);
                    var curso = 'bmat';
                    if (cursoMatch) {
                        var cursoTexto = cursoMatch[1].trim().toLowerCase();
                        if (cursoTexto.includes('bcet')) curso = 'bcet';
                    }

                    var obrigatorias = extrairObrigatoriasPlanejadas(textoCompleto);
                    console.log('📚 Obrigatórias planejadas:', obrigatorias.length);

                    var optativas = extrairOptativasPlanejadas(textoCompleto);
                    console.log('📌 Optativas planejadas:', optativas.length);

                    var alunos = gerenciador.getAlunos();
                    var alunoId = null;
                    var alunoExistente = null;

                    for (var id in alunos) {
                        if (alunos[id].nome.toLowerCase() === nomeAluno.toLowerCase()) {
                            alunoId = id;
                            alunoExistente = alunos[id];
                            break;
                        }
                    }

                    if (!alunoExistente) {
                        alunoId = gerenciador.adicionarAluno(nomeAluno, '');
                        alunoExistente = gerenciador.getAluno(alunoId);
                    }

                    alunoExistente.curso = curso;

                    var regex = /\[([XP\s])\]\s*([A-Z0-9]+)\s*-\s*([^(]+)\((\d+h)\)/gi;
                    var match;
                    while ((match = regex.exec(textoCompleto)) !== null) {
                        var marcador = match[1].trim();
                        var codigo = match[2].trim();
                        var nome = match[3].trim();
                        var horas = match[4].trim();

                        if (marcador === 'X') {
                            alunoExistente.progresso[codigo] = {
                                status: 'done',
                                origem: 'importado_relatorio',
                                data: new Date().toISOString()
                            };
                            if (!alunoExistente.historico_completo) alunoExistente.historico_completo = {};
                            alunoExistente.historico_completo[codigo] = {
                                status: 'done',
                                origem: 'importado_relatorio',
                                data: new Date().toISOString()
                            };
                        } else if (marcador === 'P') {
                            if (!isOptativaGlobal(codigo)) {
                                var nomeLower = nome.toLowerCase();
                                if (nomeLower.indexOf('optativa') === -1) {
                                    alunoExistente.progresso[codigo] = {
                                        status: 'planned',
                                        origem: 'importado_relatorio',
                                        data: new Date().toISOString()
                                    };
                                    if (!alunoExistente.historico_completo) alunoExistente.historico_completo = {};
                                    alunoExistente.historico_completo[codigo] = {
                                        status: 'planned',
                                        origem: 'importado_relatorio',
                                        data: new Date().toISOString()
                                    };
                                }
                            }
                        } else if (marcador === '' || marcador === ' ') {
                            if (!alunoExistente.progresso[codigo]) {
                                alunoExistente.progresso[codigo] = {
                                    status: 'not-started',
                                    origem: 'importado_relatorio',
                                    data: new Date().toISOString()
                                };
                            }
                        }
                    }

                    var obrigatoriasCodigos = [];
                    for (var i = 0; i < obrigatorias.length; i++) {
                        obrigatoriasCodigos.push(obrigatorias[i].codigo);
                        alunoExistente.progresso[obrigatorias[i].codigo] = {
                            status: 'planned',
                            origem: 'secao_obrigatorias',
                            data: new Date().toISOString()
                        };
                        if (!alunoExistente.historico_completo) alunoExistente.historico_completo = {};
                        alunoExistente.historico_completo[obrigatorias[i].codigo] = {
                            status: 'planned',
                            origem: 'secao_obrigatorias',
                            data: new Date().toISOString()
                        };
                    }
                    alunoExistente.obrigatoriasPlanejadas = obrigatoriasCodigos;

                    var optativasInfo = [];
                    for (var i = 0; i < optativas.length; i++) {
                        optativasInfo.push({
                            codigo: optativas[i].codigo,
                            prioridade: optativas[i].prioridade || 0,
                            nome: optativas[i].nome
                        });
                    }
                    alunoExistente.optativasInfo = optativasInfo;

                    var totalOptMatch = textoCompleto.match(/Total de optativas necessarias:\s*(\d+)/i);
                    if (totalOptMatch) {
                        alunoExistente.totalOptativasNecessarias = parseInt(totalOptMatch[1]);
                    }
                    var cursadasOptMatch = textoCompleto.match(/Optativas ja cursadas:\s*(\d+)/i);
                    if (cursadasOptMatch) {
                        alunoExistente.optativasCursadas = parseInt(cursadasOptMatch[1]);
                    }

                    gerenciador.salvar();
                    totalProcessados++;

                    var previewHtml = document.getElementById('relatorioPreview').innerHTML;
                    var newEntry = '<div style="padding:4px 8px;background:#e8f5e9;border-radius:4px;margin:2px 0;font-size:12px;">' +
                        '📌 <strong>' + nomeAluno + '</strong> ' +
                        '(' + obrigatorias.length + ' obrigatórias, ' + optativas.length + ' optativas)' +
                        '</div>';
                    document.getElementById('relatorioPreview').innerHTML = previewHtml + newEntry;

                    renderAlunoList();
                    updateAlunoCount();
                    renderConsolidacao();
                    updateConsolidacaoBadge();

                } catch (error) {
                    console.error('Erro ao processar ' + file.name + ':', error);
                    erros.push({ arquivo: file.name, erro: error.message });
                    var previewHtml = document.getElementById('relatorioPreview').innerHTML;
                    var errorEntry = '<div style="padding:4px 8px;background:#ffebee;border-radius:4px;margin:2px 0;font-size:12px;color:#c62828;">' +
                        '❌ <strong>' + file.name + '</strong>: ' + error.message +
                        '</div>';
                    document.getElementById('relatorioPreview').innerHTML = previewHtml + errorEntry;
                }
            };
        })(file);

        reader.readAsArrayBuffer(file);
    }

    setTimeout(function() {
        var msg = '✅ ' + totalProcessados + ' relatório(s) importado(s)!';
        if (erros.length > 0) {
            msg += ' ⚠️ ' + erros.length + ' erro(s)';
        }
        showToast(msg, erros.length > 0 ? 'warning' : 'success');
    }, 1000);

    event.target.value = '';
}

// ============================================================
// EXPOSIÇÃO GLOBAL
// ============================================================

window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
window.importarRelatoriosHandler = importarRelatoriosHandler;
window.toggleOferta = toggleOferta;
window.toggleOfertaOptativa = toggleOfertaOptativa;
window.toggleAllOfertas = toggleAllOfertas;
window.gerarRelatorioConsolidado = gerarRelatorioConsolidado;
window.showToast = showToast;
window.removerAlunoHandler = removerAlunoHandler;

console.log('✅ admin.js completo (com optativas e prioridades) carregado!');