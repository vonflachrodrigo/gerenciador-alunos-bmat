// ============================================================
// ADMIN - VERSÃO COM MARCAÇÃO CONCLUINTE/INGRESSANTE
// ============================================================

console.log('🚀 admin.js carregado!');

let gerenciador = null;
let toastTimeout = null;
let ofertas = {};
let ofertasOptativas = {};
let ocultarBasicas = false;

// ============================================================
// LISTA DE DISCIPLINAS BÁSICAS
// ============================================================

const DISCIPLINAS_BASICAS = [
    // BMAT
    'GCET146', 'GCET095', 'GCET061', 'GCET150', 'GCET066', 'GCCA283',
    'GCET147', 'GCET099', 'GCET065', 'GCET151', 'GCCA235', 'GCCA310',
    'GCET148', 'GCET102', 'GCET060', 'GCET059',
    'GCET149', 'GCET106',
    // BCET
    'GCCA1358', 'GCET985', 'GCET986', 'GCET987', 'GCET988', 'GCET989',
    'GCET990', 'GCET060', 'GCET991', 'GCET992', 'GCET821', 'GCET825',
    'GCET995', 'GCCA283', 'GCET993', 'GCET822', 'GCET826',
    'GCET994', 'GCET823', 'GCET827'
];

function isDisciplinaBasica(codigo) {
    if (DISCIPLINAS_BASICAS.indexOf(codigo) !== -1) return true;
    
    if (typeof codigo === 'string' && codigo.indexOf('|') !== -1) {
        var codigos = codigo.split('|');
        for (var i = 0; i < codigos.length; i++) {
            if (DISCIPLINAS_BASICAS.indexOf(codigos[i]) !== -1) return true;
        }
    }
    
    return false;
}

// ============================================================
// MAPA DE EQUIVALÊNCIAS SIMPLES (BMAT <-> BCET)
// ============================================================

const EQUIVALENCIAS_SIMPLES = {
    'GCET146': 'GCET987', 'GCET147': 'GCET992', 'GCET148': 'GCET993',
    'GCET149': 'GCET1046', 'GCET061': 'GCET986', 'GCET065': 'GCET991',
    'GCET175': 'GCET1044', 'GCET172': 'GCET1048', 'GCET178': 'GCET1052',
    'GCET173': 'GCET1049', 'GCET179': 'GCET1054', 'GCET663': 'GCET1051',
    'GCET667': 'GCET1058', 'GCET670': 'GCET1059', 'GCET666': 'GCET1057',
    'GCET174': 'GCET1063', 'GCET200': 'GCET1061', 'GCET201': 'GCET1062',
    'GCET673': 'GCET1045', 'GCET059': 'GCET994', 'GCET150': 'GCET985',
    'GCET218': 'GCET1064', 'GCET815': 'GCET161', 'GCET168': 'GCET1040',
    'GCET169': 'GCET1041', 'GCET236': 'GCET1065', 'GCET702': 'GCET1008',
    'GCET701': 'GCET1009', 'GCET231': 'GCET1009', 'GCET502': 'GCET1010',
    'GCET235': 'GCET1012', 'GCET515': 'GCET1013', 'GCET226.T': 'GCET1014',
    'GCET226.P': 'GCET1015', 'GCET514': 'GCET1016', 'GCET528': 'GCET1018',
    'GCET509': 'GCET1027', 'GCET232': 'GCET1028', 'GCET527': 'GCET1029',
    'GCET230': 'GCET1023', 'GCET103': 'GCET999', 'GCET100': 'GCET1021',
    'GCET104': 'GCET1034', 'GCET028': 'GCET1036', 'GCET166': 'GCET1037',
    'GCET241': 'GCET1066', 'GCET115': 'GCET1038', 'GCET171': 'GCET1039',
    'GCET243': 'GCET1067', 'GCET057': 'GCET1003', 'GCET105': 'GCET1004',
    'GCET217': 'GCET1004', 'GCET285': 'GCET1001'
};

const EQUIVALENCIAS_REVERSO = {};
for (var bmat in EQUIVALENCIAS_SIMPLES) {
    var bcet = EQUIVALENCIAS_SIMPLES[bmat];
    if (!EQUIVALENCIAS_REVERSO[bcet]) {
        EQUIVALENCIAS_REVERSO[bcet] = bmat;
    }
}

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
            optativasCursadas: 0,
            isConcluinte: false,
            isIngressante: false
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
                
                // Garante que os campos de marcação existam
                for (var id in this.alunos) {
                    if (typeof this.alunos[id].isConcluinte === 'undefined') {
                        this.alunos[id].isConcluinte = false;
                    }
                    if (typeof this.alunos[id].isIngressante === 'undefined') {
                        this.alunos[id].isIngressante = false;
                    }
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
        'GCET676': 'Tópicos de Geometria',
        'GCET987': 'Cálculo I',
        'GCET992': 'Cálculo II',
        'GCET993': 'Cálculo III',
        'GCET1046': 'Cálculo IV',
        'GCET986': 'Geometria Analítica',
        'GCET991': 'Álgebra Linear I',
        'GCET1044': 'Álgebra Linear II',
        'GCET1048': 'Grupos e Anéis I',
        'GCET1052': 'Grupos e Anéis II',
        'GCET1049': 'Análise na Reta I',
        'GCET1054': 'Funções de Uma Variável Complexa I',
        'GCET1051': 'Probabilidade',
        'GCET1058': 'História da Matemática',
        'GCET1059': 'Matemática Financeira',
        'GCET1057': 'Geometria Não Euclidiana',
        'GCET1063': 'Fundamentos de Lógica e Teoria dos Conjuntos',
        'GCET1061': 'Tópicos Especiais de Matemática I',
        'GCET1062': 'Tópicos Especiais de Matemática II',
        'GCET1045': 'Teoria dos Números',
        'GCET994': 'Cálculo Numérico',
        'GCET985': 'Algoritmos e Programação de Computadores',
        'GCET1064': 'Desenho Técnico e Expressão Gráfica I',
        'GCET1040': 'Termodinâmica',
        'GCET1041': 'Eletromagnetismo I',
        'GCET1065': 'Princípios de Orientação a Objetos',
        'GCET1008': 'Estruturas de Dados',
        'GCET1009': 'Sistemas Digitais I',
        'GCET1010': 'Engenharia de Software I',
        'GCET1012': 'Arquitetura de Computadores I',
        'GCET1013': 'Princípios de Eletrônica Analógica',
        'GCET1014': 'Circuitos Elétricos I',
        'GCET1015': 'Laboratório de Circuitos Elétricos I',
        'GCET1016': 'Banco de Dados',
        'GCET1018': 'Sistemas Embarcados',
        'GCET1027': 'Sinais e Sistemas',
        'GCET1028': 'Conversão de Energia Elétrica',
        'GCET1029': 'Sistemas Microcontrolados',
        'GCET1023': 'Circuitos Elétricos Polifásicos',
        'GCET999': 'Mecânica dos Fluidos',
        'GCET1021': 'Estática dos Sólidos',
        'GCET1034': 'Resistência dos Materiais',
        'GCET1036': 'Eletricidade',
        'GCET1037': 'Dinâmica dos Sólidos',
        'GCET1066': 'Ciência e Tecnologia dos Materiais',
        'GCET1038': 'Materiais de Construção Mecânica',
        'GCET1039': 'Transferência de Calor e Massa',
        'GCET1067': 'Comportamento Mecânico dos Materiais',
        'GCET1003': 'Geologia e Pedologia',
        'GCET1004': 'Topografia e Geodésia',
        'GCET1001': 'Desenho Arquitetônico'
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
        'GCET676', 'GCETIMC', 'GCETMD', 'GCF247',
        'GCET1055', 'GCET1056', 'GCET1057', 'GCET1058',
        'GCET1059', 'GCET1060', 'GCET1061', 'GCET1062', 'GCET1063'
    ];
    return optativas.indexOf(codigo) !== -1;
}

// ============================================================
// AGRUPAMENTO DE EQUIVALÊNCIAS
// ============================================================

function getChaveGrupo(codigo) {
    if (EQUIVALENCIAS_SIMPLES[codigo]) {
        var par = EQUIVALENCIAS_SIMPLES[codigo];
        return [codigo, par].sort().join('|');
    }
    if (EQUIVALENCIAS_REVERSO[codigo]) {
        var par = EQUIVALENCIAS_REVERSO[codigo];
        return [codigo, par].sort().join('|');
    }
    return codigo;
}

function getCodigosDoGrupo(codigo) {
    var chave = getChaveGrupo(codigo);
    return chave.split('|');
}

function getNomeGrupo(codigo) {
    var codigos = getCodigosDoGrupo(codigo);
    var nomes = [];
    for (var i = 0; i < codigos.length; i++) {
        nomes.push(getNomeDisciplina(codigos[i]));
    }
    return nomes.join(' / ');
}

function getCodigoGrupo(codigo) {
    var codigos = getCodigosDoGrupo(codigo);
    return codigos.join(' / ');
}

// ============================================================
// EXTRAÇÃO DE OBRIGATÓRIAS PLANEJADAS
// ============================================================

function extrairObrigatoriasPlanejadas(textoCompleto) {
    var obrigatorias = [];
    var codigosVistos = {};

    var seccaoMatch = textoCompleto.match(/OBRIGATORIAS PLANEJADAS[^:]*:([\s\S]*?)(?=RESUMO DE OPTATIVAS|OBRIGATORIAS PLANEJADAS|$)/i);
    if (seccaoMatch) {
        var secaoTexto = seccaoMatch[1];
        var regex = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+?)\s*\(\d+h\)/gi;
        var match;
        while ((match = regex.exec(secaoTexto)) !== null) {
            var codigo = match[1].trim();
            var nome = match[2].trim();
            if (!codigosVistos[codigo]) {
                codigosVistos[codigo] = true;
                obrigatorias.push({ codigo: codigo, nome: nome, fonte: 'secao_obrigatorias' });
            }
        }
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
            obrigatorias.push({ codigo: codigo, nome: matchFluxo[2].trim(), fonte: 'fluxograma' });
        }
    }

    return obrigatorias;
}

// ============================================================
// EXTRAÇÃO DE OPTATIVAS PLANEJADAS
// ============================================================

function extrairOptativasPlanejadas(textoCompleto) {
    var optativas = [];
    var codigosVistos = {};

    var seccaoMatch = textoCompleto.match(/Optativas Planejadas[^:]*:([\s\S]*?)(?=Optativas ja cursadas|ATENCAO|LEGENDA|RESUMO DE OPTATIVAS|$)/i);
    if (seccaoMatch) {
        var secaoTexto = seccaoMatch[1];
        var regex = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+?)\s*\(Prioridade\s*(\d+)\)/gi;
        var match;
        var encontrou = false;
        while ((match = regex.exec(secaoTexto)) !== null) {
            encontrou = true;
            var codigo = match[1].trim();
            var nome = match[2].trim();
            var prioridade = parseInt(match[3]);
            if (!codigosVistos[codigo]) {
                codigosVistos[codigo] = true;
                optativas.push({ codigo: codigo, nome: nome, prioridade: prioridade, fonte: 'secao_optativas' });
            }
        }
        if (!encontrou) {
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
                if (!codigosVistos[codigo]) {
                    codigosVistos[codigo] = true;
                    optativas.push({ codigo: codigo, nome: nome, prioridade: prioridade, fonte: 'secao_optativas' });
                }
            }
        }
    }

    if (optativas.length === 0) {
        var regexFluxo = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+)\([^)]*optativa[^)]*\)/gi;
        var matchFluxo;
        while ((matchFluxo = regexFluxo.exec(textoCompleto)) !== null) {
            var codigo = matchFluxo[1].trim();
            if (!codigosVistos[codigo]) {
                codigosVistos[codigo] = true;
                optativas.push({ codigo: codigo, nome: matchFluxo[2].trim(), prioridade: 0, fonte: 'fluxograma' });
            }
        }
    }

    return optativas;
}

// ============================================================
// CONSOLIDAÇÃO - OBRIGATÓRIAS (COM AGRUPAMENTO E MARCAÇÃO)
// ============================================================

function getDisciplinasConsolidadas() {
    var grupos = {};
    var alunos = gerenciador.getAlunos();

    for (var id in alunos) {
        var aluno = alunos[id];
        var obrigatorias = aluno.obrigatoriasPlanejadas || [];

        for (var i = 0; i < obrigatorias.length; i++) {
            var codigoOriginal = obrigatorias[i];
            var chave = getChaveGrupo(codigoOriginal);

            if (!grupos[chave]) {
                grupos[chave] = {
                    chave: chave,
                    codigos: getCodigosDoGrupo(codigoOriginal),
                    codigoFormatado: getCodigoGrupo(codigoOriginal),
                    nomeFormatado: getNomeGrupo(codigoOriginal),
                    isBasica: isDisciplinaBasica(chave),
                    alunos: [],
                    total: 0,
                    totalConcluintes: 0,
                    totalIngressantes: 0
                };
            }

            var jaExiste = false;
            for (var a = 0; a < grupos[chave].alunos.length; a++) {
                if (grupos[chave].alunos[a].id === id) { jaExiste = true; break; }
            }

            if (!jaExiste) {
                grupos[chave].alunos.push({ 
                    id: id, 
                    nome: aluno.nome,
                    isConcluinte: aluno.isConcluinte || false,
                    isIngressante: aluno.isIngressante || false
                });
                grupos[chave].total++;
                if (aluno.isConcluinte) grupos[chave].totalConcluintes++;
                if (aluno.isIngressante) grupos[chave].totalIngressantes++;
            }
        }
    }

    var resultado = [];
    for (var chave in grupos) {
        resultado.push(grupos[chave]);
    }
    resultado.sort(function(a, b) { return b.total - a.total; });
    return resultado;
}

// ============================================================
// CONSOLIDAÇÃO - OPTATIVAS (COM AGRUPAMENTO E MARCAÇÃO)
// ============================================================

function getOptativasConsolidadas() {
    var grupos = {};
    var alunos = gerenciador.getAlunos();

    for (var id in alunos) {
        var aluno = alunos[id];
        var optativas = aluno.optativasInfo || [];

        for (var i = 0; i < optativas.length; i++) {
            var opt = optativas[i];
            var codigoOriginal = opt.codigo;
            var prioridade = opt.prioridade || 0;
            var chave = getChaveGrupo(codigoOriginal);

            if (!grupos[chave]) {
                grupos[chave] = {
                    chave: chave,
                    codigos: getCodigosDoGrupo(codigoOriginal),
                    codigoFormatado: getCodigoGrupo(codigoOriginal),
                    nomeFormatado: getNomeGrupo(codigoOriginal),
                    isBasica: isDisciplinaBasica(chave),
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
                    totalP5: 0,
                    totalConcluintes: 0,
                    totalIngressantes: 0
                };
            }

            var jaExiste = false;
            for (var a = 0; a < grupos[chave].alunos.length; a++) {
                if (grupos[chave].alunos[a].id === id) { jaExiste = true; break; }
            }

            if (!jaExiste) {
                grupos[chave].alunos.push({ 
                    id: id, 
                    nome: aluno.nome,
                    prioridade: prioridade,
                    isConcluinte: aluno.isConcluinte || false,
                    isIngressante: aluno.isIngressante || false
                });
                grupos[chave].total++;
                if (aluno.isConcluinte) grupos[chave].totalConcluintes++;
                if (aluno.isIngressante) grupos[chave].totalIngressantes++;

                if (prioridade === 1) {
                    grupos[chave].alunosP1.push({ id: id, nome: aluno.nome });
                    grupos[chave].totalP1++;
                } else if (prioridade === 2) {
                    grupos[chave].alunosP2.push({ id: id, nome: aluno.nome });
                    grupos[chave].totalP2++;
                } else if (prioridade === 3) {
                    grupos[chave].alunosP3.push({ id: id, nome: aluno.nome });
                    grupos[chave].totalP3++;
                } else if (prioridade === 4) {
                    grupos[chave].alunosP4.push({ id: id, nome: aluno.nome });
                    grupos[chave].totalP4++;
                } else if (prioridade === 5) {
                    grupos[chave].alunosP5.push({ id: id, nome: aluno.nome });
                    grupos[chave].totalP5++;
                }
            }
        }
    }

    var resultado = [];
    for (var chave in grupos) {
        resultado.push(grupos[chave]);
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
// INICIALIZAÇÃO AUTOMÁTICA
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarAdmin);
} else {
    inicializarAdmin();
}

// ============================================================
// MARCAR / DESMARCAR CONCLUINTE E INGRESSANTE
// ============================================================

function toggleConcluinte(id) {
    var aluno = gerenciador.getAluno(id);
    if (!aluno) return;
    
    if (aluno.isConcluinte) {
        aluno.isConcluinte = false;
    } else {
        aluno.isConcluinte = true;
        aluno.isIngressante = false;  // exclusivo
    }
    
    gerenciador.salvar();
    renderAlunoList();
    renderConsolidacao();
    updateConsolidacaoBadge();
}

function toggleIngressante(id) {
    var aluno = gerenciador.getAluno(id);
    if (!aluno) return;
    
    if (aluno.isIngressante) {
        aluno.isIngressante = false;
    } else {
        aluno.isIngressante = true;
        aluno.isConcluinte = false;  // exclusivo
    }
    
    gerenciador.salvar();
    renderAlunoList();
    renderConsolidacao();
    updateConsolidacaoBadge();
}

// ============================================================
// RENDER - LISTA DE ALUNOS (COM BOTÕES DE MARCAÇÃO)
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

        // Container dos botões de marcação
        var marcacaoDiv = document.createElement('div');
        marcacaoDiv.className = 'marcacao-botoes';

        // Botão Concluinte
        var btnConcluinte = document.createElement('button');
        btnConcluinte.className = 'btn-concluinte' + (aluno.isConcluinte ? ' ativo' : '');
        btnConcluinte.textContent = '🎓';
        btnConcluinte.title = aluno.isConcluinte ? 'Clique para desmarcar como concluinte' : 'Marcar como concluinte';
        btnConcluinte.onclick = (function(id) {
            return function(e) {
                e.stopPropagation();
                toggleConcluinte(id);
            };
        })(id);
        marcacaoDiv.appendChild(btnConcluinte);

        // Botão Ingressante
        var btnIngressante = document.createElement('button');
        btnIngressante.className = 'btn-ingressante' + (aluno.isIngressante ? ' ativo' : '');
        btnIngressante.textContent = '📥';
        btnIngressante.title = aluno.isIngressante ? 'Clique para desmarcar como ingressante' : 'Marcar como ingressante';
        btnIngressante.onclick = (function(id) {
            return function(e) {
                e.stopPropagation();
                toggleIngressante(id);
            };
        })(id);
        marcacaoDiv.appendChild(btnIngressante);

        // Botão Remover
        var btnRemove = document.createElement('button');
        btnRemove.textContent = '✕';
        btnRemove.style.cssText = 'background:none;border:none;cursor:pointer;color:#c62828;font-size:16px;font-weight:bold;padding:0 4px;width:auto;height:auto;';
        btnRemove.title = 'Remover aluno';
        btnRemove.onclick = (function(id) {
            return function(e) {
                e.stopPropagation();
                removerAlunoHandler(id);
            };
        })(id);

        div.appendChild(infoSpan);
        div.appendChild(marcacaoDiv);
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
// APAGAR TODOS OS ALUNOS
// ============================================================

function apagarTodosAlunos() {
    var total = gerenciador.getTotalAlunos();
    
    if (total === 0) {
        showToast('⚠️ Nenhum aluno para apagar.', 'warning');
        return;
    }
    
    var msg = '⚠️ Tem certeza que deseja apagar TODOS os ' + total + ' aluno(s) importado(s)?\n\n' +
              'Esta ação não pode ser desfeita.';
    
    if (!confirm(msg)) return;
    
    try {
        gerenciador.alunos = {};
        gerenciador.nextId = 1;
        gerenciador.alunoAtivoId = null;
        
        localStorage.removeItem('gerenciador_simples');
        
        ofertas = {};
        ofertasOptativas = {};
        
        renderAlunoList();
        updateAlunoCount();
        renderConsolidacao();
        updateConsolidacaoBadge();
        
        var preview = document.getElementById('relatorioPreview');
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
        
        showToast('🗑️ Todos os alunos foram apagados!', 'info');
        
    } catch (error) {
        showToast('❌ Erro ao apagar: ' + error.message, 'error');
        console.error('Erro ao apagar alunos:', error);
    }
}

// ============================================================
// TOGGLE OCULTAR BÁSICAS
// ============================================================

function toggleOcultarBasicas() {
    ocultarBasicas = !ocultarBasicas;
    renderConsolidacao();
    updateConsolidacaoBadge();
    
    var msg = ocultarBasicas 
        ? '👁️ Disciplinas básicas ocultadas (movidas para o final)' 
        : '👁️ Todas as disciplinas visíveis';
    showToast(msg, 'info');
}

// ============================================================
// FUNÇÃO AUXILIAR - GERA ÍCONES DE MARCAÇÃO
// ============================================================

function gerarIconesMarcacao(disc) {
    var html = '';
    
    // Concluintes
    if (disc.totalConcluintes > 0) {
        if (disc.totalConcluintes === 1) {
            html += '<span class="icone-concluinte" title="1 concluinte">🎓</span>';
        } else {
            html += '<span class="icone-concluinte" title="' + disc.totalConcluintes + ' concluintes">🎓 = ' + disc.totalConcluintes + '</span>';
        }
    }
    
    // Ingressantes
    if (disc.totalIngressantes > 0) {
        if (html) html += '  ';
        if (disc.totalIngressantes === 1) {
            html += '<span class="icone-ingressante" title="1 ingressante">📥</span>';
        } else {
            html += '<span class="icone-ingressante" title="' + disc.totalIngressantes + ' ingressantes">📥 = ' + disc.totalIngressantes + '</span>';
        }
    }
    
    if (html) {
        return '<span class="marcacao-icones">' + html + '</span>';
    }
    return '';
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
        var chave = obrigatorias[i].chave;
        if (!(chave in ofertas)) {
            ofertas[chave] = true;
        }
    }
    for (var i = 0; i < optativas.length; i++) {
        var chave = optativas[i].chave;
        if (!(chave in ofertasOptativas)) {
            ofertasOptativas[chave] = true;
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

    var btnClass = ocultarBasicas ? 'btn-ocultar-basicas ativo' : 'btn-ocultar-basicas inativo';
    var btnText = ocultarBasicas ? '👁️ Mostrar disciplinas básicas' : '👁️ Ocultar disciplinas básicas';

    html += 
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">' +
            '<div>' +
                '<span style="font-size:14px;color:#666;">' +
                    (obrigatorias.length + optativas.length) + ' disciplina(s) planejada(s) · ' + totalAlunos + ' aluno(s)' +
                '</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button onclick="toggleOcultarBasicas()" class="' + btnClass + '">' + btnText + '</button>' +
                '<button onclick="gerarRelatorioConsolidado()" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#1a237e;color:white;">📄 Gerar Relatório</button>' +
                '<button onclick="toggleAllOfertas(true)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#4caf50;color:white;">✅ Oferecer todas</button>' +
                '<button onclick="toggleAllOfertas(false)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#ef5350;color:white;">❌ Não oferecer todas</button>' +
            '</div>' +
        '</div>';

    var obrigatoriasNormais = [];
    var obrigatoriasBasicas = [];

    for (var i = 0; i < obrigatorias.length; i++) {
        if (obrigatorias[i].isBasica) {
            obrigatoriasBasicas.push(obrigatorias[i]);
        } else {
            obrigatoriasNormais.push(obrigatorias[i]);
        }
    }

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

        for (var i = 0; i < obrigatoriasNormais.length; i++) {
            html += renderLinhaObrigatoria(obrigatoriasNormais[i], false);
        }

        if (ocultarBasicas && obrigatoriasBasicas.length > 0) {
            for (var i = 0; i < obrigatoriasBasicas.length; i++) {
                html += renderLinhaObrigatoria(obrigatoriasBasicas[i], true);
            }
        } else if (!ocultarBasicas) {
            for (var i = 0; i < obrigatoriasBasicas.length; i++) {
                html += renderLinhaObrigatoria(obrigatoriasBasicas[i], false);
            }
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
            var isOfertada = ofertasOptativas[disc.chave] !== false;
            var bgColor = isOfertada ? '#f3e5f5' : '#fce4ec';
            var temMarcacao = disc.totalConcluintes > 0 || disc.totalIngressantes > 0;
            
            // Se tem marcação, aplica destaque amarelo
            if (temMarcacao) {
                bgColor = '#fff9c4';
            }

            var icones = gerarIconesMarcacao(disc);

            html += 
                '<div class="' + (temMarcacao ? 'linha-destaque' : '') + '" style="display:grid;grid-template-columns:2.5fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 1fr 1fr;padding:8px 12px;background:' + bgColor + ';border-bottom:1px solid #e0e0e0;gap:4px;align-items:center;font-size:11px;">' +
                    '<div>' +
                        icones +
                        '<strong>' + disc.codigoFormatado + '</strong>' +
                        '<span style="color:#666;font-size:10px;display:block;">' + disc.nomeFormatado + '</span>' +
                    '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP1 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP2 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP3 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP4 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;color:#1a237e;">' + disc.totalP5 + '</div>' +
                    '<div style="text-align:center;font-weight:bold;font-size:14px;color:#4a148c;">' + disc.total + '</div>' +
                    '<div style="text-align:center;">' +
                        '<button onclick="toggleOfertaOptativa(\'' + disc.chave + '\')" style="padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:11px;min-width:60px;background:' + (isOfertada ? '#4caf50' : '#ef5350') + ';color:white;">' +
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

function renderLinhaObrigatoria(disc, isOculta) {
    var isOfertada = ofertas[disc.chave] !== false;
    var bgColor = isOfertada ? '#e8f5e9' : '#ffebee';
    var linhaClass = isOculta ? ' linha-oculta' : '';

    var temMarcacao = disc.totalConcluintes > 0 || disc.totalIngressantes > 0;

    // Se tem marcação (e não está oculta), aplica destaque amarelo
    if (temMarcacao && !isOculta) {
        bgColor = '#fff9c4';
        linhaClass += ' linha-destaque';
    }

    var nomes = [];
    for (var j = 0; j < disc.alunos.length; j++) {
        nomes.push(disc.alunos[j].nome);
    }
    var alunosStr = nomes.join(', ');
    if (nomes.length > 5) {
        alunosStr = nomes.slice(0, 5).join(', ') + ' +' + (nomes.length - 5) + ' outros';
    }

    var badgeOculta = isOculta ? '<span class="badge-oculta">Oculta</span>' : '';
    var icones = !isOculta ? gerarIconesMarcacao(disc) : '';

    return '<div class="' + linhaClass + '" style="display:grid;grid-template-columns:3fr 1fr 2fr 1fr;padding:10px 14px;background:' + bgColor + ';border-bottom:1px solid #e0e0e0;gap:8px;align-items:center;font-size:13px;">' +
        '<div>' +
            icones +
            '<strong>' + disc.codigoFormatado + '</strong>' + badgeOculta +
            '<span style="color:#666;font-size:12px;display:block;">' + disc.nomeFormatado + '</span>' +
        '</div>' +
        '<div style="text-align:center;font-weight:bold;font-size:18px;color:#1a237e;">' + disc.total + '</div>' +
        '<div style="font-size:12px;color:#333;word-break:break-word;">' + (alunosStr || '-') + 
            (nomes.length > 5 ? '<span style="color:#666;font-size:10px;display:block;">(' + nomes.length + ' total)</span>' : '') +
        '</div>' +
        '<div style="text-align:center;">' +
            '<button onclick="toggleOferta(\'' + disc.chave + '\')" style="padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;min-width:80px;background:' + (isOfertada ? '#4caf50' : '#ef5350') + ';color:white;">' +
                (isOfertada ? '✅ Oferecer' : '❌ Não oferecer') +
            '</button>' +
        '</div>' +
    '</div>';
}

// ============================================================
// CONTROLES DE OFERTA
// ============================================================

function toggleOferta(chave) {
    ofertas[chave] = !ofertas[chave];
    renderConsolidacao();
}

function toggleOfertaOptativa(chave) {
    ofertasOptativas[chave] = !ofertasOptativas[chave];
    renderConsolidacao();
}

function toggleAllOfertas(status) {
    for (var chave in ofertas) {
        ofertas[chave] = status;
    }
    for (var chave in ofertasOptativas) {
        ofertasOptativas[chave] = status;
    }
    renderConsolidacao();
    var msg = status ? '✅ Todas as disciplinas marcadas como oferecidas!' : '❌ Todas as disciplinas marcadas como não oferecidas!';
    showToast(msg, status ? 'success' : 'info');
}

// ============================================================
// GERAR RELATÓRIO PDF
// ============================================================

function gerarRelatorioConsolidado() {
    var obrigatorias = getDisciplinasConsolidadas();
    var optativas = getOptativasConsolidadas();

    if (ocultarBasicas) {
        var obrigatoriasFiltradas = [];
        for (var i = 0; i < obrigatorias.length; i++) {
            if (!obrigatorias[i].isBasica) {
                obrigatoriasFiltradas.push(obrigatorias[i]);
            }
        }
        obrigatorias = obrigatoriasFiltradas;
    }

    if (obrigatorias.length === 0 && optativas.length === 0) {
        showToast('⚠️ Nenhuma disciplina planejada para gerar relatório.', 'warning');
        return;
    }

    var texto = '='.repeat(80) + '\n';
    texto += 'RELATORIO DE OFERTA DE DISCIPLINAS\n';
    texto += '='.repeat(80) + '\n';
    texto += 'Data: ' + new Date().toLocaleString('pt-BR') + '\n';
    texto += 'Total de alunos: ' + gerenciador.getTotalAlunos() + '\n\n';

    texto += 'OBRIGATORIAS SELECIONADAS PARA OFERTA\n';
    texto += '-'.repeat(80) + '\n\n';

    var temSelecionadas = false;
    for (var i = 0; i < obrigatorias.length; i++) {
        var disc = obrigatorias[i];
        if (ofertas[disc.chave]) {
            temSelecionadas = true;
            texto += '[OFERTA] ' + disc.codigoFormatado + '\n';
            texto += '   ' + disc.nomeFormatado + '\n';
            
            // Contagem com concluintes/ingressantes
            var partes = [disc.total + ' aluno(s) planejaram'];
            var detalhes = [];
            if (disc.totalConcluintes > 0) {
                detalhes.push(disc.totalConcluintes + ' concluinte' + (disc.totalConcluintes > 1 ? 's' : ''));
            }
            if (disc.totalIngressantes > 0) {
                detalhes.push(disc.totalIngressantes + ' ingressante' + (disc.totalIngressantes > 1 ? 's' : ''));
            }
            if (detalhes.length > 0) {
                texto += '   ' + partes[0] + ' (' + detalhes.join(', ') + ')\n';
            } else {
                texto += '   ' + partes[0] + '\n';
            }
            
            if (disc.alunos.length > 0) {
                var nomes = [];
                for (var j = 0; j < disc.alunos.length; j++) {
                    var a = disc.alunos[j];
                    var marcador = '';
                    if (a.isConcluinte) marcador = ' (concluinte)';
                    else if (a.isIngressante) marcador = ' (ingressante)';
                    nomes.push(a.nome + marcador);
                }
                texto += '   Alunos: ' + nomes.join(', ') + '\n';
            }
            texto += '\n';
        }
    }
    if (!temSelecionadas) texto += 'Nenhuma obrigatoria selecionada.\n\n';

    texto += 'OBRIGATORIAS NAO OFERTADAS\n';
    texto += '-'.repeat(80) + '\n\n';

    var temNaoOfertadas = false;
    for (var i = 0; i < obrigatorias.length; i++) {
        var disc = obrigatorias[i];
        if (!ofertas[disc.chave]) {
            temNaoOfertadas = true;
            texto += '[NAO OFERTADA] ' + disc.codigoFormatado + '\n';
            texto += '   ' + disc.nomeFormatado + '\n';
            
            var partes = [disc.total + ' aluno(s) ficarao sem'];
            var detalhes = [];
            if (disc.totalConcluintes > 0) {
                detalhes.push(disc.totalConcluintes + ' concluinte' + (disc.totalConcluintes > 1 ? 's' : ''));
            }
            if (disc.totalIngressantes > 0) {
                detalhes.push(disc.totalIngressantes + ' ingressante' + (disc.totalIngressantes > 1 ? 's' : ''));
            }
            if (detalhes.length > 0) {
                texto += '   ' + partes[0] + ' (' + detalhes.join(', ') + ')\n';
            } else {
                texto += '   ' + partes[0] + '\n';
            }
            
            if (disc.alunos.length > 0) {
                var nomes = [];
                for (var j = 0; j < disc.alunos.length; j++) {
                    var a = disc.alunos[j];
                    var marcador = '';
                    if (a.isConcluinte) marcador = ' (concluinte)';
                    else if (a.isIngressante) marcador = ' (ingressante)';
                    nomes.push(a.nome + marcador);
                }
                texto += '   Alunos afetados: ' + nomes.join(', ') + '\n';
            }
            texto += '\n';
        }
    }
    if (!temNaoOfertadas) texto += 'Todas as obrigatorias planejadas foram selecionadas.\n\n';

    if (optativas.length > 0) {
        texto += 'OPTATIVAS OFERTADAS\n';
        texto += '-'.repeat(80) + '\n\n';

        var temOptOfertadas = false;
        for (var i = 0; i < optativas.length; i++) {
            var disc = optativas[i];
            if (ofertasOptativas[disc.chave]) {
                temOptOfertadas = true;
                texto += '[OFERTA] ' + disc.codigoFormatado + '\n';
                texto += '   ' + disc.nomeFormatado + '\n';
                
                var partes = ['Total: ' + disc.total + ' aluno(s)'];
                var detalhes = [];
                if (disc.totalConcluintes > 0) {
                    detalhes.push(disc.totalConcluintes + ' concluinte' + (disc.totalConcluintes > 1 ? 's' : ''));
                }
                if (disc.totalIngressantes > 0) {
                    detalhes.push(disc.totalIngressantes + ' ingressante' + (disc.totalIngressantes > 1 ? 's' : ''));
                }
                if (detalhes.length > 0) {
                    texto += '   ' + partes[0] + ' (' + detalhes.join(', ') + ')\n';
                } else {
                    texto += '   ' + partes[0] + '\n';
                }
                
                if (disc.alunos.length > 0) {
                    var nomes = [];
                    for (var j = 0; j < disc.alunos.length; j++) {
                        var a = disc.alunos[j];
                        var marcador = '';
                        if (a.isConcluinte) marcador = ', concluinte';
                        else if (a.isIngressante) marcador = ', ingressante';
                        nomes.push(a.nome + ' (P' + a.prioridade + marcador + ')');
                    }
                    texto += '   Alunos: ' + nomes.join(', ') + '\n';
                }
                texto += '\n';
            }
        }
        if (!temOptOfertadas) texto += 'Nenhuma optativa selecionada.\n\n';

        texto += 'OPTATIVAS NAO OFERTADAS\n';
        texto += '-'.repeat(80) + '\n\n';

        var temOptNaoOfertadas = false;
        for (var i = 0; i < optativas.length; i++) {
            var disc = optativas[i];
            if (!ofertasOptativas[disc.chave]) {
                temOptNaoOfertadas = true;
                texto += '[NAO OFERTADA] ' + disc.codigoFormatado + '\n';
                texto += '   ' + disc.nomeFormatado + '\n';
                
                var partes = [disc.total + ' aluno(s) escolheram como alternativa'];
                var detalhes = [];
                if (disc.totalConcluintes > 0) {
                    detalhes.push(disc.totalConcluintes + ' concluinte' + (disc.totalConcluintes > 1 ? 's' : ''));
                }
                if (disc.totalIngressantes > 0) {
                    detalhes.push(disc.totalIngressantes + ' ingressante' + (disc.totalIngressantes > 1 ? 's' : ''));
                }
                if (detalhes.length > 0) {
                    texto += '   ' + partes[0] + ' (' + detalhes.join(', ') + ')\n';
                } else {
                    texto += '   ' + partes[0] + '\n';
                }
                
                if (disc.alunos.length > 0) {
                    var nomes = [];
                    for (var j = 0; j < disc.alunos.length; j++) {
                        var a = disc.alunos[j];
                        var marcador = '';
                        if (a.isConcluinte) marcador = ', concluinte';
                        else if (a.isIngressante) marcador = ', ingressante';
                        nomes.push(a.nome + ' (P' + a.prioridade + marcador + ')');
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

    if (!gerenciador) {
        console.error('❌ ERRO: gerenciador é null!');
        showToast('⚠️ Sistema não inicializado. Recarregue a página.', 'error');
        return;
    }

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

                    var cursoMatch = textoCompleto.match(/Curso:\s*([^P]+?)\s*Progresso:/i);
                    var curso = 'bmat';
                    if (cursoMatch) {
                        var cursoTexto = cursoMatch[1].trim().toLowerCase();
                        if (cursoTexto.includes('bcet')) curso = 'bcet';
                    }

                    var obrigatorias = extrairObrigatoriasPlanejadas(textoCompleto);
                    var optativas = extrairOptativasPlanejadas(textoCompleto);

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

                    // Garante que os campos de marcação existam
                    if (typeof alunoExistente.isConcluinte === 'undefined') alunoExistente.isConcluinte = false;
                    if (typeof alunoExistente.isIngressante === 'undefined') alunoExistente.isIngressante = false;

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

window.importarRelatoriosHandler = importarRelatoriosHandler;
window.toggleOferta = toggleOferta;
window.toggleOfertaOptativa = toggleOfertaOptativa;
window.toggleAllOfertas = toggleAllOfertas;
window.toggleOcultarBasicas = toggleOcultarBasicas;
window.toggleConcluinte = toggleConcluinte;
window.toggleIngressante = toggleIngressante;
window.gerarRelatorioConsolidado = gerarRelatorioConsolidado;
window.showToast = showToast;
window.removerAlunoHandler = removerAlunoHandler;
window.apagarTodosAlunos = apagarTodosAlunos;

console.log('✅ admin.js completo (com marcação concluinte/ingressante) carregado!');