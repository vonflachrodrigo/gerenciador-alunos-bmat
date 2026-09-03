// ============================================================
// ADMIN - VERSAO COMPLETA COM OPTATIVAS, PRIORIDADES, EXCECOES E STATUS DE ALUNOS
// ============================================================

console.log('Admin carregado!');

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
            excecoes: [],
            optativasInfo: [],
            obrigatoriasPlanejadas: [],
            quebras: {},
            equiv: {},
            curso: this.cursoAtivo,
            historico_completo: {},
            totalOptativasNecessarias: 0,
            optativasCursadas: 0,
            status: 'normal' // 'normal' | 'concluinte' | 'ingressante'
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
                
                for (var id in this.alunos) {
                    if (!this.alunos[id].excecoes) this.alunos[id].excecoes = [];
                    if (!this.alunos[id].optativasInfo) this.alunos[id].optativasInfo = [];
                    if (!this.alunos[id].obrigatoriasPlanejadas) this.alunos[id].obrigatoriasPlanejadas = [];
                    if (!this.alunos[id].status) this.alunos[id].status = 'normal';
                }
                
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
// FUNCOES AUXILIARES
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
// EXTRACAO DE OBRIGATORIAS PLANEJADAS (inclui excecoes)
// ============================================================

function extrairObrigatoriasPlanejadas(textoCompleto, excecoes) {
    excecoes = excecoes || [];
    var obrigatorias = [];
    var codigosVistos = {};

    console.log('Extraindo obrigatórias planejadas...');

    var seccaoMatch = textoCompleto.match(/OBRIGATORIAS PLANEJADAS[^:]*:([\s\S]*?)(?=RESUMO DE OPTATIVAS|OBRIGATORIAS PLANEJADAS|$)/i);
    if (seccaoMatch) {
        console.log('Seção "OBRIGATÓRIAS PLANEJADAS" encontrada!');
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
                console.log('Obrigatória (seção):', codigo, '-', nome);
            }
        }
    } else {
        console.log('Seção "OBRIGATÓRIAS PLANEJADAS" NÃO encontrada!');
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
            console.log('Obrigatória (fluxograma):', codigo);
        }
    }

    // Adiciona exceções que são obrigatórias
    for (var i = 0; i < excecoes.length; i++) {
        var exc = excecoes[i];
        if (exc.tipo === 'obrigatoria' && !codigosVistos[exc.codigo]) {
            codigosVistos[exc.codigo] = true;
            obrigatorias.push({
                codigo: exc.codigo,
                nome: exc.nome,
                fonte: 'excecao'
            });
            console.log('Obrigatória (exceção):', exc.codigo);
        }
    }

    console.log('Total de obrigatórias extraídas:', obrigatorias.length);
    return obrigatorias;
}

// ============================================================
// EXTRACAO DE OPTATIVAS PLANEJADAS (inclui excecoes)
// ============================================================

function extrairOptativasPlanejadas(textoCompleto, excecoes) {
    excecoes = excecoes || [];
    var optativas = [];
    var codigosVistos = {};

    console.log('Extraindo optativas planejadas...');

    var seccaoMatch = textoCompleto.match(/Optativas Planejadas[^:]*:([\s\S]*?)(?=Optativas já cursadas|ATENCAO|LEGENDA|RESUMO DE OPTATIVAS|$)/i);
    if (seccaoMatch) {
        console.log('Seção "Optativas Planejadas" encontrada!');
        var secaoTexto = seccaoMatch[1];
        
        var regex = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+?)\s*\(Prioridade\s*(\d+)\)/gi;
        var match;
        var encontrou = false;
        
        while ((match = regex.exec(secaoTexto)) !== null) {
            encontrou = true;
            var codigo = match[1].trim();
            var nome = match[2].trim();
            var prioridade = parseInt(match[3]);
            
            console.log('Optativa encontrada:', codigo, '-', nome, 'Prioridade:', prioridade);
            
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
            console.log('Tentando regex alternativo para optativas...');
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
                
                console.log('Optativa encontrada (alt):', codigo, '-', nome, 'Prioridade:', prioridade);
                
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
        console.log('Seção "Optativas Planejadas" NÃO encontrada!');
    }

    if (optativas.length === 0) {
        console.log('Procurando optativas no fluxograma...');
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
                console.log('Optativa no fluxograma:', codigo);
            }
        }
    }

    // Adiciona exceções que são optativas
    for (var i = 0; i < excecoes.length; i++) {
        var exc = excecoes[i];
        if (exc.tipo === 'optativa' && !codigosVistos[exc.codigo]) {
            codigosVistos[exc.codigo] = true;
            var prioridade = optativas.length + 1;
            optativas.push({
                codigo: exc.codigo,
                nome: exc.nome,
                prioridade: prioridade,
                fonte: 'excecao'
            });
            console.log('Optativa (exceção):', exc.codigo);
        }
    }

    console.log('Total de optativas extraídas:', optativas.length);
    return optativas;
}

// ============================================================
// CONSOLIDACAO - OBRIGATORIAS (inclui excecoes e status)
// ============================================================

function getDisciplinasConsolidadas() {
    var mapa = {};
    var alunos = gerenciador.getAlunos();

    for (var id in alunos) {
        var aluno = alunos[id];
        var obrigatorias = aluno.obrigatoriasPlanejadas || [];
        var excecoes = aluno.excecoes || [];
        var status = aluno.status || 'normal';

        for (var i = 0; i < obrigatorias.length; i++) {
            var codigo = obrigatorias[i];
            
            if (!mapa[codigo]) {
                mapa[codigo] = {
                    codigo: codigo,
                    nome: getNomeDisciplina(codigo),
                    alunos: [],
                    alunosConcluintes: [],
                    alunosIngressantes: [],
                    total: 0,
                    totalConcluintes: 0,
                    totalIngressantes: 0,
                    temEspeciais: false
                };
            }

            var jaExiste = false;
            for (var a = 0; a < mapa[codigo].alunos.length; a++) {
                if (mapa[codigo].alunos[a].id === id) { jaExiste = true; break; }
            }

            if (!jaExiste) {
                mapa[codigo].alunos.push({ id: id, nome: aluno.nome, status: status });
                mapa[codigo].total++;

                if (status === 'concluinte') {
                    mapa[codigo].alunosConcluintes.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalConcluintes++;
                    mapa[codigo].temEspeciais = true;
                } else if (status === 'ingressante') {
                    mapa[codigo].alunosIngressantes.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalIngressantes++;
                    mapa[codigo].temEspeciais = true;
                }
            }
        }

        // Adiciona exceções obrigatórias
        for (var i = 0; i < excecoes.length; i++) {
            var exc = excecoes[i];
            if (exc.tipo === 'obrigatoria') {
                var codigo = exc.codigo;
                
                if (!mapa[codigo]) {
                    mapa[codigo] = {
                        codigo: codigo,
                        nome: exc.nome || getNomeDisciplina(codigo),
                        alunos: [],
                        alunosConcluintes: [],
                        alunosIngressantes: [],
                        total: 0,
                        totalConcluintes: 0,
                        totalIngressantes: 0,
                        temEspeciais: false
                    };
                }

                var jaExiste = false;
                for (var a = 0; a < mapa[codigo].alunos.length; a++) {
                    if (mapa[codigo].alunos[a].id === id) { jaExiste = true; break; }
                }

                if (!jaExiste) {
                    var nomeExibicao = aluno.nome + ' (exceção)';
                    mapa[codigo].alunos.push({ id: id, nome: nomeExibicao, status: status });
                    mapa[codigo].total++;

                    if (status === 'concluinte') {
                        mapa[codigo].alunosConcluintes.push({ id: id, nome: nomeExibicao });
                        mapa[codigo].totalConcluintes++;
                        mapa[codigo].temEspeciais = true;
                    } else if (status === 'ingressante') {
                        mapa[codigo].alunosIngressantes.push({ id: id, nome: nomeExibicao });
                        mapa[codigo].totalIngressantes++;
                        mapa[codigo].temEspeciais = true;
                    }
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
// CONSOLIDACAO - OPTATIVAS (inclui excecoes e status)
// ============================================================

function getOptativasConsolidadas() {
    var mapa = {};
    var alunos = gerenciador.getAlunos();

    for (var id in alunos) {
        var aluno = alunos[id];
        var optativas = aluno.optativasInfo || [];
        var excecoes = aluno.excecoes || [];
        var status = aluno.status || 'normal';

        for (var i = 0; i < optativas.length; i++) {
            var opt = optativas[i];
            var codigo = opt.codigo;
            var prioridade = opt.prioridade || 0;
            
            if (!mapa[codigo]) {
                mapa[codigo] = {
                    codigo: codigo,
                    nome: getNomeDisciplina(codigo),
                    alunos: [],
                    alunosConcluintes: [],
                    alunosIngressantes: [],
                    alunosP1: [],
                    alunosP2: [],
                    alunosP3: [],
                    alunosP4: [],
                    alunosP5: [],
                    total: 0,
                    totalConcluintes: 0,
                    totalIngressantes: 0,
                    totalP1: 0,
                    totalP2: 0,
                    totalP3: 0,
                    totalP4: 0,
                    totalP5: 0,
                    temEspeciais: false
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
                    prioridade: prioridade,
                    status: status
                });
                mapa[codigo].total++;

                if (status === 'concluinte') {
                    mapa[codigo].alunosConcluintes.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalConcluintes++;
                    mapa[codigo].temEspeciais = true;
                } else if (status === 'ingressante') {
                    mapa[codigo].alunosIngressantes.push({ id: id, nome: aluno.nome });
                    mapa[codigo].totalIngressantes++;
                    mapa[codigo].temEspeciais = true;
                }

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

        // Adiciona exceções optativas
        for (var i = 0; i < excecoes.length; i++) {
            var exc = excecoes[i];
            if (exc.tipo === 'optativa') {
                var codigo = exc.codigo;
                var prioridade = 0;
                
                if (!mapa[codigo]) {
                    mapa[codigo] = {
                        codigo: codigo,
                        nome: exc.nome || getNomeDisciplina(codigo),
                        alunos: [],
                        alunosConcluintes: [],
                        alunosIngressantes: [],
                        alunosP1: [],
                        alunosP2: [],
                        alunosP3: [],
                        alunosP4: [],
                        alunosP5: [],
                        total: 0,
                        totalConcluintes: 0,
                        totalIngressantes: 0,
                        totalP1: 0,
                        totalP2: 0,
                        totalP3: 0,
                        totalP4: 0,
                        totalP5: 0,
                        temEspeciais: false
                    };
                }

                var jaExiste = false;
                for (var a = 0; a < mapa[codigo].alunos.length; a++) {
                    if (mapa[codigo].alunos[a].id === id) { jaExiste = true; break; }
                }

                if (!jaExiste) {
                    var nomeExibicao = aluno.nome + ' (exceção)';
                    mapa[codigo].alunos.push({ 
                        id: id, 
                        nome: nomeExibicao,
                        prioridade: prioridade,
                        status: status
                    });
                    mapa[codigo].total++;

                    if (status === 'concluinte') {
                        mapa[codigo].alunosConcluintes.push({ id: id, nome: nomeExibicao });
                        mapa[codigo].totalConcluintes++;
                        mapa[codigo].temEspeciais = true;
                    } else if (status === 'ingressante') {
                        mapa[codigo].alunosIngressantes.push({ id: id, nome: nomeExibicao });
                        mapa[codigo].totalIngressantes++;
                        mapa[codigo].temEspeciais = true;
                    }
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
// INICIALIZACAO
// ============================================================

function inicializarAdmin() {
    console.log('Inicializando Admin...');
    
    try {
        gerenciador = new GerenciadorSimples();
        console.log('Alunos:', Object.keys(gerenciador.getAlunos()).length);

        renderAlunoList();
        updateAlunoCount();
        renderConsolidacao();
        updateConsolidacaoBadge();

        gerenciador.adicionarListener(function(evento, dados) {
            console.log('Evento:', evento);
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
        
        console.log('Admin inicializado com sucesso!');
        showToast('Admin carregado com ' + keys.length + ' aluno(s)!', 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro: ' + error.message, 'error');
    }
}

// ============================================================
// RENDER - LISTA DE ALUNOS (com status e filtro)
// ============================================================

function renderAlunoList() {
    var container = document.getElementById('alunoList');
    if (!container) return;
    
    var alunos = gerenciador.getAlunos();
    var keys = Object.keys(alunos);

    // Aplica filtro
    var filtro = document.getElementById('statusFilter');
    var filtroValor = filtro ? filtro.value : 'todos';

    if (filtroValor !== 'todos') {
        keys = keys.filter(function(id) {
            return alunos[id].status === filtroValor;
        });
    }

    if (keys.length === 0) {
        container.innerHTML = '<div style="padding:16px;text-align:center;color:#999;">' + 
            (filtroValor !== 'todos' ? 'Nenhum aluno com este status' : 'Nenhum aluno importado') + 
            '</div>';
        return;
    }

    container.innerHTML = '';
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var aluno = alunos[id];
        var progresso = gerenciador.getProgresso(id);
        var pct = progresso ? progresso.pct || 0 : 0;
        var status = aluno.status || 'normal';

        var div = document.createElement('div');
        div.className = 'aluno-item-admin';
        
        // Adiciona classe de status para destaque
        if (status === 'concluinte') {
            div.classList.add('status-concluinte');
        } else if (status === 'ingressante') {
            div.classList.add('status-ingressante');
        }
        
        var matriculaStr = aluno.matricula ? ' (' + aluno.matricula + ')' : '';

        // Badge de status
        var statusBadge = '';
        if (status === 'concluinte') {
            statusBadge = '<span class="status-badge concluinte">🟢 Concluinte</span>';
        } else if (status === 'ingressante') {
            statusBadge = '<span class="status-badge ingressante">🟡 Ingressante</span>';
        }

        // Container para nome + badge (evita quebra)
        var nomeContainer = document.createElement('span');
        nomeContainer.className = 'nome';
        nomeContainer.innerHTML = aluno.nome + matriculaStr + ' ' + statusBadge;

        var progressSpan = document.createElement('span');
        progressSpan.className = 'progresso';
        progressSpan.textContent = progresso ? progresso.done + '/' + progresso.total + ' (' + pct + '%)' : '0/0 (0%)';

        // Select de status
        var select = document.createElement('select');
        select.className = 'status-select';
        select.id = 'status_' + id;
        select.innerHTML = `
            <option value="normal" ${status === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="concluinte" ${status === 'concluinte' ? 'selected' : ''}>🟢 Concluinte</option>
            <option value="ingressante" ${status === 'ingressante' ? 'selected' : ''}>🟡 Ingressante</option>
        `;
        select.onchange = (function(id) {
            return function() {
                alterarStatusAluno(id, this.value);
            };
        })(id);

        var btnRemove = document.createElement('button');
        btnRemove.className = 'btn-remove-aluno';
        btnRemove.textContent = '✕';
        btnRemove.title = 'Remover aluno';
        btnRemove.onclick = (function(id) {
            return function(e) {
                e.stopPropagation();
                removerAlunoHandler(id);
            };
        })(id);

        div.appendChild(nomeContainer);
        div.appendChild(progressSpan);
        div.appendChild(select);
        div.appendChild(btnRemove);
        container.appendChild(div);
    }
}

function alterarStatusAluno(id, novoStatus) {
    var aluno = gerenciador.getAluno(id);
    if (!aluno) return;
    
    aluno.status = novoStatus;
    gerenciador.salvar();
    
    var nomeStatus = novoStatus === 'concluinte' ? 'Concluinte' : 
                     novoStatus === 'ingressante' ? 'Ingressante' : 'Normal';
    showToast('Status de ' + aluno.nome + ' alterado para: ' + nomeStatus, 'info');
    
    renderAlunoList();
    renderConsolidacao();
}

function limparStatusTodos() {
    if (!confirm('Deseja limpar o status de TODOS os alunos para "Normal"?')) return;
    
    var alunos = gerenciador.getAlunos();
    for (var id in alunos) {
        alunos[id].status = 'normal';
    }
    gerenciador.salvar();
    renderAlunoList();
    renderConsolidacao();
    showToast('Status de todos os alunos foi limpo!', 'success');
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
        showToast('Aluno removido.', 'info');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// RENDER - CONSOLIDACAO (com destaque para alunos especiais)
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
                '<h3>Nenhum aluno cadastrado</h3>' +
                '<p>Importe relatórios para ver a consolidação.</p>' +
            '</div>';
        return;
    }

    if (obrigatorias.length === 0 && optativas.length === 0) {
        container.innerHTML = 
            '<div class="no-aluno" style="padding:40px 20px;">' +
                '<h3>Nenhuma disciplina planejada</h3>' +
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
                '<button onclick="gerarRelatorioConsolidado()" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#1a237e;color:white;">Gerar Relatório</button>' +
                '<button onclick="toggleAllOfertas(true)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#4caf50;color:white;">Oferecer todas</button>' +
                '<button onclick="toggleAllOfertas(false)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#ef5350;color:white;">Não oferecer todas</button>' +
            '</div>' +
        '</div>';

    if (obrigatorias.length > 0) {
        html += 
            '<div style="margin-bottom:16px;">' +
                '<div style="font-weight:bold;color:#1a237e;font-size:15px;margin-bottom:8px;">OBRIGATÓRIAS PLANEJADAS</div>' +
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
            
            // Destaque para disciplinas com alunos especiais
            var bgEspecial = '';
            var badgeEspecial = '';
            if (disc.temEspeciais) {
                bgEspecial = 'border-left:4px solid #ff6f00;';
                bgColor = '#fff8e1';
                var infoEspecial = [];
                if (disc.totalConcluintes > 0) {
                    infoEspecial.push(disc.totalConcluintes + ' concluinte(s)');
                }
                if (disc.totalIngressantes > 0) {
                    infoEspecial.push(disc.totalIngressantes + ' ingressante(s)');
                }
                badgeEspecial = '<span class="badge-especiais">🔶 ' + infoEspecial.join(', ') + '</span>';
            }

            var nomes = [];
            for (var j = 0; j < disc.alunos.length; j++) {
                var nomeAluno = disc.alunos[j].nome;
                var statusAluno = disc.alunos[j].status;
                if (statusAluno === 'concluinte') {
                    nomeAluno = '🟢 ' + nomeAluno;
                } else if (statusAluno === 'ingressante') {
                    nomeAluno = '🟡 ' + nomeAluno;
                }
                nomes.push(nomeAluno);
            }
            var alunosStr = nomes.join(', ');
            if (nomes.length > 5) {
                alunosStr = nomes.slice(0, 5).join(', ') + ' +' + (nomes.length - 5) + ' outros';
            }

            html += 
                '<div style="display:grid;grid-template-columns:3fr 1fr 2fr 1fr;padding:10px 14px;background:' + bgColor + ';border-bottom:1px solid #e0e0e0;gap:8px;align-items:center;font-size:13px;' + bgEspecial + '">' +
                    '<div>' +
                        '<strong>' + disc.codigo + '</strong>' +
                        '<span style="color:#666;font-size:12px;display:block;">' + disc.nome + '</span>' +
                        badgeEspecial +
                    '</div>' +
                    '<div style="text-align:center;font-weight:bold;font-size:18px;color:#1a237e;">' + disc.total + '</div>' +
                    '<div style="font-size:12px;color:#333;word-break:break-word;">' + (alunosStr || '-') + 
                        (nomes.length > 5 ? '<span style="color:#666;font-size:10px;display:block;">(' + nomes.length + ' total)</span>' : '') +
                    '</div>' +
                    '<div style="text-align:center;">' +
                        '<button onclick="toggleOferta(\'' + disc.codigo + '\')" style="padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;min-width:80px;background:' + (isOfertada ? '#4caf50' : '#ef5350') + ';color:white;">' +
                            (isOfertada ? 'Oferecer' : 'Não oferecer') +
                        '</button>' +
                    '</div>' +
                '</div>';
        }

        html += '</div></div>';
    }

    if (optativas.length > 0) {
        html += 
            '<div style="margin-bottom:16px;">' +
                '<div style="font-weight:bold;color:#4a148c;font-size:15px;margin-bottom:8px;">OPTATIVAS PLANEJADAS</div>' +
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
            
            // Destaque para optativas com alunos especiais
            var bgEspecial = '';
            var badgeEspecial = '';
            if (disc.temEspeciais) {
                bgEspecial = 'border-left:4px solid #ff6f00;';
                bgColor = '#fff8e1';
                var infoEspecial = [];
                if (disc.totalConcluintes > 0) {
                    infoEspecial.push(disc.totalConcluintes + ' concluinte(s)');
                }
                if (disc.totalIngressantes > 0) {
                    infoEspecial.push(disc.totalIngressantes + ' ingressante(s)');
                }
                badgeEspecial = '<span class="badge-especiais">🔶 ' + infoEspecial.join(', ') + '</span>';
            }

            var alunosInfo = [];
            for (var j = 0; j < disc.alunos.length; j++) {
                var a = disc.alunos[j];
                var nomeAluno = a.nome;
                var statusAluno = a.status;
                if (statusAluno === 'concluinte') {
                    nomeAluno = '🟢 ' + nomeAluno;
                } else if (statusAluno === 'ingressante') {
                    nomeAluno = '🟡 ' + nomeAluno;
                }
                alunosInfo.push(nomeAluno + ' (P' + a.prioridade + ')');
            }
            var alunosStr = alunosInfo.join(', ');
            if (alunosInfo.length > 3) {
                alunosStr = alunosInfo.slice(0, 3).join(', ') + ' +' + (alunosInfo.length - 3) + ' outros';
            }

            html += 
                '<div style="display:grid;grid-template-columns:2.5fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 1fr 1fr;padding:8px 12px;background:' + bgColor + ';border-bottom:1px solid #e0e0e0;gap:4px;align-items:center;font-size:11px;' + bgEspecial + '">' +
                    '<div>' +
                        '<strong>' + disc.codigo + '</strong>' +
                        '<span style="color:#666;font-size:10px;display:block;">' + disc.nome + '</span>' +
                        badgeEspecial +
                    '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP1 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP2 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP3 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP4 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP5 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;font-size:14px;color:#4a148c;">' + disc.total + '</div>' +
                    '<div style="text-align:center;">' +
                        '<button onclick="toggleOfertaOptativa(\'' + disc.codigo + '\')" style="padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:11px;min-width:60px;background:' + (isOfertada ? '#4caf50' : '#ef5350') + ';color:white;">' +
                            (isOfertada ? 'Sim' : 'Não') +
                        '</button>' +
                    '</div>' +
                '</div>';
        }

        html += '</div></div>';

        html += 
            '<div style="margin-top:4px;padding:6px 12px;background:#f5f5f5;border-radius:6px;font-size:11px;color:#666;">' +
                'P1 a P5 = Prioridade escolhida pelo aluno (P1 = maior prioridade)' +
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
            '<div><span style="font-weight:bold;">Oferecidas:</span> <span style="font-weight:bold;color:#2e7d32;">' + totalSelecionadas + '</span></div>' +
            '<div><span style="font-weight:bold;">Não oferecidas:</span> <span style="font-weight:bold;color:#c62828;">' + totalNaoSelecionadas + '</span></div>' +
            '<div><span style="font-weight:bold;">Total planejadas:</span> <span style="font-weight:bold;color:#1a237e;">' + (obrigatorias.length + optativas.length) + '</span></div>' +
            '<div><span style="font-weight:bold;">Total de alunos:</span> <span style="font-weight:bold;color:#1a237e;">' + totalAlunos + '</span></div>' +
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
    var msg = status ? 'Todas as disciplinas marcadas como oferecidas!' : 'Todas as disciplinas marcadas como não oferecidas!';
    showToast(msg, status ? 'success' : 'info');
}

// ============================================================
// GERAR RELATORIO PDF (COM INFO DE CONCLUINTES E INGRESSANTES)
// ============================================================

function gerarRelatorioConsolidado() {
    var obrigatorias = getDisciplinasConsolidadas();
    var optativas = getOptativasConsolidadas();

    if (obrigatorias.length === 0 && optativas.length === 0) {
        showToast('Nenhuma disciplina planejada para gerar relatório.', 'warning');
        return;
    }

    var texto = '='.repeat(80) + '\n';
    texto += 'RELATÓRIO DE OFERTA DE DISCIPLINAS\n';
    texto += '='.repeat(80) + '\n';
    texto += 'Data: ' + new Date().toLocaleString('pt-BR') + '\n';
    texto += 'Total de alunos: ' + gerenciador.getTotalAlunos() + '\n\n';

    // OBRIGATÓRIAS SELECIONADAS PARA OFERTA
    texto += 'OBRIGATÓRIAS SELECIONADAS PARA OFERTA\n';
    texto += '-'.repeat(80) + '\n\n';

    var temSelecionadas = false;
    for (var i = 0; i < obrigatorias.length; i++) {
        var disc = obrigatorias[i];
        if (ofertas[disc.codigo]) {
            temSelecionadas = true;
            texto += '[OFERTA] ' + disc.codigo + ' - ' + disc.nome + '\n';
            texto += '   ' + disc.total + ' aluno(s) planejaram\n';
            if (disc.totalConcluintes > 0) {
                texto += '   🟢 ' + disc.totalConcluintes + ' concluinte(s)\n';
            }
            if (disc.totalIngressantes > 0) {
                texto += '   🟡 ' + disc.totalIngressantes + ' ingressante(s)\n';
            }
            if (disc.alunos.length > 0) {
                var nomes = [];
                for (var j = 0; j < disc.alunos.length; j++) {
                    var nomeAluno = disc.alunos[j].nome;
                    var statusAluno = disc.alunos[j].status;
                    if (statusAluno === 'concluinte') {
                        nomeAluno = '[CONCLUINTE] ' + nomeAluno;
                    } else if (statusAluno === 'ingressante') {
                        nomeAluno = '[INGRESSANTE] ' + nomeAluno;
                    }
                    nomes.push(nomeAluno);
                }
                texto += '   Alunos: ' + nomes.join(', ') + '\n';
            }
            texto += '\n';
        }
    }
    if (!temSelecionadas) texto += 'Nenhuma obrigatória selecionada.\n\n';

    // OBRIGATÓRIAS NÃO OFERTADAS
    texto += 'OBRIGATÓRIAS NÃO OFERTADAS\n';
    texto += '-'.repeat(80) + '\n\n';

    var temNaoOfertadas = false;
    for (var i = 0; i < obrigatorias.length; i++) {
        var disc = obrigatorias[i];
        if (!ofertas[disc.codigo]) {
            temNaoOfertadas = true;
            texto += '[NÃO OFERTADA] ' + disc.codigo + ' - ' + disc.nome + '\n';
            texto += '   ' + disc.total + ' aluno(s) ficarão sem\n';
            if (disc.totalConcluintes > 0) {
                texto += '   🟢 ' + disc.totalConcluintes + ' concluinte(s) afetados\n';
            }
            if (disc.totalIngressantes > 0) {
                texto += '   🟡 ' + disc.totalIngressantes + ' ingressante(s) afetados\n';
            }
            if (disc.alunos.length > 0) {
                var nomes = [];
                for (var j = 0; j < disc.alunos.length; j++) {
                    var nomeAluno = disc.alunos[j].nome;
                    var statusAluno = disc.alunos[j].status;
                    if (statusAluno === 'concluinte') {
                        nomeAluno = '[CONCLUINTE] ' + nomeAluno;
                    } else if (statusAluno === 'ingressante') {
                        nomeAluno = '[INGRESSANTE] ' + nomeAluno;
                    }
                    nomes.push(nomeAluno);
                }
                texto += '   Alunos afetados: ' + nomes.join(', ') + '\n';
            }
            texto += '\n';
        }
    }
    if (!temNaoOfertadas) texto += 'Todas as obrigatórias planejadas foram selecionadas.\n\n';

    // OPTATIVAS OFERTADAS
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
                if (disc.totalConcluintes > 0) {
                    texto += '   🟢 ' + disc.totalConcluintes + ' concluinte(s)\n';
                }
                if (disc.totalIngressantes > 0) {
                    texto += '   🟡 ' + disc.totalIngressantes + ' ingressante(s)\n';
                }
                if (disc.alunos.length > 0) {
                    var nomes = [];
                    for (var j = 0; j < disc.alunos.length; j++) {
                        var a = disc.alunos[j];
                        var nomeAluno = a.nome;
                        var statusAluno = a.status;
                        if (statusAluno === 'concluinte') {
                            nomeAluno = '[CONCLUINTE] ' + nomeAluno;
                        } else if (statusAluno === 'ingressante') {
                            nomeAluno = '[INGRESSANTE] ' + nomeAluno;
                        }
                        nomes.push(nomeAluno + ' (P' + a.prioridade + ')');
                    }
                    texto += '   Alunos: ' + nomes.join(', ') + '\n';
                }
                texto += '\n';
            }
        }
        if (!temOptOfertadas) texto += 'Nenhuma optativa selecionada.\n\n';

        // OPTATIVAS NÃO OFERTADAS
        texto += 'OPTATIVAS NÃO OFERTADAS\n';
        texto += '-'.repeat(80) + '\n\n';

        var temOptNaoOfertadas = false;
        for (var i = 0; i < optativas.length; i++) {
            var disc = optativas[i];
            if (!ofertasOptativas[disc.codigo]) {
                temOptNaoOfertadas = true;
                texto += '[NÃO OFERTADA] ' + disc.codigo + ' - ' + disc.nome + '\n';
                texto += '   ' + disc.total + ' aluno(s) escolheram como alternativa\n';
                if (disc.totalConcluintes > 0) {
                    texto += '   🟢 ' + disc.totalConcluintes + ' concluinte(s) afetados\n';
                }
                if (disc.totalIngressantes > 0) {
                    texto += '   🟡 ' + disc.totalIngressantes + ' ingressante(s) afetados\n';
                }
                if (disc.alunos.length > 0) {
                    var nomes = [];
                    for (var j = 0; j < disc.alunos.length; j++) {
                        var a = disc.alunos[j];
                        var nomeAluno = a.nome;
                        var statusAluno = a.status;
                        if (statusAluno === 'concluinte') {
                            nomeAluno = '[CONCLUINTE] ' + nomeAluno;
                        } else if (statusAluno === 'ingressante') {
                            nomeAluno = '[INGRESSANTE] ' + nomeAluno;
                        }
                        nomes.push(nomeAluno + ' (P' + a.prioridade + ')');
                    }
                    texto += '   Alunos: ' + nomes.join(', ') + '\n';
                }
                texto += '\n';
            }
        }
        if (!temOptNaoOfertadas) texto += 'Todas as optativas planejadas foram selecionadas.\n\n';
    }

    texto += '='.repeat(80) + '\n';
    texto += 'Relatório gerado em ' + new Date().toLocaleString('pt-BR') + '\n';

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
        showToast('Relatório de ofertas gerado com sucesso!', 'success');
    } catch (e) {
        console.log(texto);
        showToast('Relatório gerado no console (F12)', 'info');
    }
}

// ============================================================
// HANDLER - IMPORTACAO DE RELATORIOS PDF (COM EXTRAÇÃO CORRIGIDA DO NOME)
// ============================================================

function importarRelatoriosHandler(event) {
    var files = event.target.files;
    if (!files || files.length === 0) return;

    var preview = document.getElementById('relatorioPreview');
    preview.style.display = 'block';
    preview.innerHTML = '<div class="info">Processando ' + files.length + ' relatório(s)...</div>';

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

                    // ============================================================
                    // EXTRAÇÃO CORRIGIDA DO NOME DO ALUNO
                    // ============================================================
                    var nomeAluno = '';
                    
                    // Tenta extrair o nome do aluno do conteúdo do PDF
                    // Padrão: "Aluno: Nome do Aluno Curso:"
                    var nomeMatch = textoCompleto.match(/Aluno:\s*([^C]+?)(?=\s*Curso:)/i);
                    if (nomeMatch) {
                        nomeAluno = nomeMatch[1].trim();
                        console.log('Nome extraído do PDF:', nomeAluno);
                    } else {
                        // Fallback: tenta outro padrão mais genérico
                        var nomeMatch2 = textoCompleto.match(/Aluno:\s*([^\n]+)/i);
                        if (nomeMatch2) {
                            nomeAluno = nomeMatch2[1].trim();
                            console.log('Nome extraído do PDF (fallback):', nomeAluno);
                        }
                    }
                    
                    // Se ainda não encontrou, usa o nome do arquivo como fallback
                    if (!nomeAluno || nomeAluno.length === 0 || nomeAluno.length > 50 || nomeAluno.indexOf('Progresso') !== -1) {
                        nomeAluno = file.name.replace('.pdf', '').replace('relatorio_', '').replace(/_/g, ' ');
                        nomeAluno = nomeAluno.replace(/\b\w/g, function(l) { return l.toUpperCase(); });
                        console.log('Nome extraído do arquivo:', nomeAluno);
                    }

                    var cursoMatch = textoCompleto.match(/Curso:\s*([^P]+?)\s*Progresso:/i);
                    var curso = 'bmat';
                    if (cursoMatch) {
                        var cursoTexto = cursoMatch[1].trim().toLowerCase();
                        if (cursoTexto.indexOf('bcet') !== -1) curso = 'bcet';
                    }

                    // Extrai exceções do relatório
                    var excecoesExtraidas = [];
                    var regexExcecao = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+)\([^)]*\)\s*\*EXCECAO\*/gi;
                    var matchExcecao;
                    while ((matchExcecao = regexExcecao.exec(textoCompleto)) !== null) {
                        var codigo = matchExcecao[1].trim();
                        var nome = matchExcecao[2].trim();
                        var isOpt = isOptativaGlobal(codigo);
                        excecoesExtraidas.push({
                            codigo: codigo,
                            nome: nome,
                            tipo: isOpt ? 'optativa' : 'obrigatoria'
                        });
                        console.log('Exceção encontrada no relatório:', codigo);
                    }

                    var obrigatorias = extrairObrigatoriasPlanejadas(textoCompleto, excecoesExtraidas);
                    console.log('Obrigatórias planejadas:', obrigatorias.length);

                    var optativas = extrairOptativasPlanejadas(textoCompleto, excecoesExtraidas);
                    console.log('Optativas planejadas:', optativas.length);

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

                    // Processa disciplinas do fluxograma
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

                    // Salva obrigatórias planejadas
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

                    // Salva optativas planejadas
                    var optativasInfo = [];
                    for (var i = 0; i < optativas.length; i++) {
                        optativasInfo.push({
                            codigo: optativas[i].codigo,
                            prioridade: optativas[i].prioridade || 0,
                            nome: optativas[i].nome
                        });
                    }
                    alunoExistente.optativasInfo = optativasInfo;

                    // Salva exceções
                    if (!alunoExistente.excecoes) alunoExistente.excecoes = [];
                    for (var i = 0; i < excecoesExtraidas.length; i++) {
                        var exc = excecoesExtraidas[i];
                        var jaExiste = alunoExistente.excecoes.some(function(e) { return e.codigo === exc.codigo; });
                        if (!jaExiste) {
                            alunoExistente.excecoes.push({
                                codigo: exc.codigo,
                                nome: exc.nome,
                                tipo: exc.tipo,
                                data: new Date().toISOString()
                            });
                            console.log('Exceção salva:', exc.codigo);
                        }
                    }

                    // Status do aluno (sempre normal ao importar)
                    if (!alunoExistente.status) {
                        alunoExistente.status = 'normal';
                    }

                    var totalOptMatch = textoCompleto.match(/Total de optativas necessárias:\s*(\d+)/i);
                    if (totalOptMatch) {
                        alunoExistente.totalOptativasNecessarias = parseInt(totalOptMatch[1]);
                    }
                    var cursadasOptMatch = textoCompleto.match(/Optativas já cursadas:\s*(\d+)/i);
                    if (cursadasOptMatch) {
                        alunoExistente.optativasCursadas = parseInt(cursadasOptMatch[1]);
                    }

                    gerenciador.salvar();
                    totalProcessados++;

                    var previewHtml = document.getElementById('relatorioPreview').innerHTML;
                    var newEntry = '<div style="padding:4px 8px;background:#e8f5e9;border-radius:4px;margin:2px 0;font-size:12px;">' +
                        ' <strong>' + nomeAluno + '</strong> ' +
                        '(' + obrigatorias.length + ' obrigatórias, ' + optativas.length + ' optativas' +
                        (excecoesExtraidas.length > 0 ? ', ' + excecoesExtraidas.length + ' exceções' : '') + ')' +
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
                        'Erro: <strong>' + file.name + '</strong>: ' + error.message +
                        '</div>';
                    document.getElementById('relatorioPreview').innerHTML = previewHtml + errorEntry;
                }
            };
        })(file);

        reader.readAsArrayBuffer(file);
    }

    setTimeout(function() {
        var msg = totalProcessados + ' relatório(s) importado(s)!';
        if (erros.length > 0) {
            msg += ' ' + erros.length + ' erro(s)';
        }
        showToast(msg, erros.length > 0 ? 'warning' : 'success');
    }, 1000);

    event.target.value = '';
}

// ============================================================
// EXPOSICAO GLOBAL
// ============================================================

window.importarRelatoriosHandler = importarRelatoriosHandler;
window.toggleOferta = toggleOferta;
window.toggleOfertaOptativa = toggleOfertaOptativa;
window.toggleAllOfertas = toggleAllOfertas;
window.gerarRelatorioConsolidado = gerarRelatorioConsolidado;
window.showToast = showToast;
window.removerAlunoHandler = removerAlunoHandler;
window.renderAlunoList = renderAlunoList;
window.limparStatusTodos = limparStatusTodos;

console.log('admin.js completo (com optativas, prioridades, exceções, status de alunos e extração corrigida do nome) carregado!');