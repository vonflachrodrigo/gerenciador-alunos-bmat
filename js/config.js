// ============================================================
// CONFIGURAÇÃO CENTRALIZADA
// ============================================================

const CONFIG = {
    // === MAPA DE CÓDIGOS OBSOLETOS ===
    codigosObsoletos: {
        'GCETAN': 'GCET678'
    },

    // === EQUIVALÊNCIAS OFICIAIS (PPC p. 211-214) ===
    equivalencias: {
        simples: {
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
        },
        duplas: {
            'GCET095': ['GCET821', 'GCET825'],
            'GCET099': ['GCET822', 'GCET826'],
            'GCET102': ['GCET823', 'GCET827'],
            'GCET106': ['GCET824', 'GCET828'],
            'GCET066': ['GCET988', 'GCET989'],
            'GCET176': ['GCET1050', 'GCET1056'],
            'GCET717': ['GCET1025', 'GCET1026'],
            'GCET729': ['GCET1030', 'GCET1031']
        }
    },

    // === OPTATIVAS DO BMAT ===
    optativasBMAT: {
        opt1: [
            { codigo: 'GCET152', nome: 'Cálculo Numérico II', pre: 'GCET059' },
            { codigo: 'GCET153', nome: 'Equações Diferenciais', pre: 'Nenhum' },
            { codigo: 'GCET155', nome: 'Álgebra III', pre: 'GCET178' },
            { codigo: 'GCET184', nome: 'Métodos Matemáticos', pre: 'Nenhum' },
            { codigo: 'GCET194', nome: 'Funções Analíticas', pre: 'GCET147' },
            { codigo: 'GCET200', nome: 'Tópicos Especiais em Matemática I', pre: 'Nenhum' },
            { codigo: 'GCET201', nome: 'Tópicos Especiais em Matemática II', pre: 'Nenhum' },
            { codigo: 'GCET218', nome: 'Desenho Técnico', pre: 'Nenhum' },
            { codigo: 'GCET508', nome: 'Matemática Discreta', pre: 'Nenhum' }
        ],
        outras: [
            { codigo: 'GCET152', nome: 'Cálculo Numérico II', pre: 'GCET059' },
            { codigo: 'GCET155', nome: 'Álgebra III', pre: 'GCET178' },
            { codigo: 'GCET194', nome: 'Funções Analíticas', pre: 'GCET147' },
            { codigo: 'GCET200', nome: 'Tópicos Especiais em Matemática I', pre: 'Nenhum' },
            { codigo: 'GCET201', nome: 'Tópicos Especiais em Matemática II', pre: 'Nenhum' },
            { codigo: 'GCET218', nome: 'Desenho Técnico I', pre: 'Nenhum' },
            { codigo: 'GCET665', nome: 'Análise Funcional', pre: 'GCET175, GCET180' },
            { codigo: 'GCET666', nome: 'Geometria Não Euclidiana', pre: 'GCET176' },
            { codigo: 'GCET667', nome: 'História da Matemática', pre: 'GCET174' },
            { codigo: 'GCET668', nome: 'Introdução às Curvas Algébricas', pre: 'GCET178' },
            { codigo: 'GCET669', nome: 'Introdução aos Sistemas Dinâmicos', pre: 'GCET148, GCET179, GCET189' },
            { codigo: 'GCET670', nome: 'Matemática Financeira', pre: 'Nenhum' },
            { codigo: 'GCET671', nome: 'Modelagem e Simulação Matemática', pre: 'GCET152' },
            { codigo: 'GCET672', nome: 'Otimização de Sistemas', pre: 'GCET152' },
            { codigo: 'GCET673', nome: 'Teoria dos Números', pre: 'GCET178' },
            { codigo: 'GCET674', nome: 'Tópicos de Álgebra', pre: 'GCET178' },
            { codigo: 'GCET675', nome: 'Tópicos de Análise', pre: 'GCET173' },
            { codigo: 'GCET676', nome: 'Tópicos de Geometria', pre: 'GCET177' },
            { codigo: 'GCETIMC', nome: 'Introdução à Matemática Computacional', pre: 'GCET174' },
            { codigo: 'GCETMD', nome: 'Matemática Discreta', pre: 'GCET174' },
            { codigo: 'GCF247', nome: 'Língua Brasileira de Sinais - LIBRAS', pre: 'Nenhum' }
        ]
    },

    // === OPTATIVAS DO BCET ===
    optativasBCET: [
        { codigo: 'GCET1055', nome: 'Biomatemática', pre: 'GCET993' },
        { codigo: 'GCET1056', nome: 'Geometria Espacial', pre: 'GCET1050' },
        { codigo: 'GCET1057', nome: 'Geometria Não Euclidiana', pre: 'GCET1050, GCET1044' },
        { codigo: 'GCET1058', nome: 'História da Matemática', pre: 'GCET987, GCET1050' },
        { codigo: 'GCET1059', nome: 'Matemática Financeira', pre: 'GCET987' },
        { codigo: 'GCET1060', nome: 'Programação Linear', pre: 'GCET991' },
        { codigo: 'GCET1061', nome: 'Tópicos Especiais de Matemática I', pre: 'Nenhum' },
        { codigo: 'GCET1062', nome: 'Tópicos Especiais de Matemática II', pre: 'Nenhum' },
        { codigo: 'GCET1063', nome: 'Fundamentos de Lógica e Teoria dos Conjuntos', pre: 'Nenhum' },
        { codigo: 'GCF247', nome: 'Libras', pre: 'Nenhum' }
    ],

    // === PRÉ-REQUISITOS DO BMAT ===
    prerequisitosBMAT: {
        'GCET146': [], 'GCET095': [], 'GCET061': [], 'GCET150': [], 'GCET066': [],
        'GCCA283': [], 'GCET147': ['GCET146'], 'GCET099': ['GCET095'], 'GCET065': [],
        'GCET151': ['GCET150'], 'GCCA235': [], 'GCCA310': [], 'GCET148': ['GCET147'],
        'GCET102': ['GCET099'], 'GCET060': ['GCET147'], 'GCET059': ['GCET065', 'GCET147', 'GCET151'],
        'GCET174': ['GCET065'], 'GCET149': ['GCET148'], 'GCET106': ['GCET102'],
        'GCET172': ['GCET148', 'GCET175'], 'GCET175': ['GCET061'], 'GCET510': [],
        'GCET173': ['GCET148', 'GCET175'], 'GCET176': ['GCET061'], 'GCET178': ['GCET172'],
        'GCET511': [], 'GCET663': ['GCET148', 'GCET060'], 'GCET161': ['GCCA283'],
        'GCET177': ['GCET149', 'GCET178'], 'GCET179': ['GCET147'],
        'GCET180': ['GCET172', 'GCET173'], 'GCET189': ['GCET173'],
        'GCET660': ['GCET180'], 'GCET661': ['GCET148'], 'GCET678': [],
        'GCET677': ['GCCA283'], 'GCET152': ['GCET059'], 'GCET155': ['GCET178'],
        'GCET194': ['GCET147'], 'GCET200': [], 'GCET201': [], 'GCET218': [],
        'GCET665': ['GCET175', 'GCET180'], 'GCET666': ['GCET176'],
        'GCET667': ['GCET174'], 'GCET668': ['GCET178'],
        'GCET669': ['GCET148', 'GCET179', 'GCET189'], 'GCET670': [],
        'GCET671': ['GCET152'], 'GCET672': ['GCET152'], 'GCET673': ['GCET178'],
        'GCET674': ['GCET178'], 'GCET675': ['GCET173'], 'GCET676': ['GCET177'],
        'GCETIMC': ['GCET174'], 'GCETMD': ['GCET174'], 'GCF247': []
    },

    // === PRÉ-REQUISITOS DO BCET ===
    prerequisitosBCET: {
        'GCCA1358': [], 'GCET985': [], 'GCET986': [], 'GCET987': [], 'GCET988': [],
        'GCET989': ['GCET988'], 'GCET990': [], 'GCET060': ['GCET987'],
        'GCET991': ['GCET986'], 'GCET992': ['GCET987'], 'GCET821': ['GCET987'],
        'GCET825': [], 'GCET995': [], 'GCET1044': ['GCET991'], 'GCCA283': [],
        'GCET993': ['GCET992'], 'GCET822': ['GCET821'], 'GCET826': ['GCET825'],
        'GCET996': [], 'GCET1045': [], 'GCET1046': ['GCET992'],
        'GCET994': ['GCET991', 'GCET992'], 'GCET823': ['GCET822'],
        'GCET827': ['GCET826'], 'GCET997': [], 'GCET1047': ['GCET1045'],
        'GCET1048': ['GCET1045'], 'GCET1049': ['GCET993'], 'GCET1050': [],
        'GCET998': [], 'GCET1051': ['GCET060'], 'GCET1052': ['GCET1048'],
        'GCET1053': ['GCET1049'], 'GCET1054': ['GCET992'],
        'GCET1055': ['GCET993'], 'GCET1056': ['GCET1050'],
        'GCET1057': ['GCET1050', 'GCET1044'], 'GCET1058': ['GCET987', 'GCET1050'],
        'GCET1059': ['GCET987'], 'GCET1060': ['GCET991'], 'GCET1061': [],
        'GCET1062': [], 'GCET1063': [], 'GCF247': []
    },

    // === CURRÍCULO BMAT ===
    curriculoBMAT: [
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
            { codigo: 'GCET179', horas: '68h' }, { codigo: 'GCET180', horas: '85h' },
            { codigo: 'OPT1', horas: '68h', isOptativa: true }
        ]},
        { nome: '7º Semestre', cls: 's7', disciplinas: [
            { codigo: 'GCET189', horas: '68h' }, { codigo: 'GCET660', horas: '68h' },
            { codigo: 'GCET661', horas: '68h' }, { codigo: 'GCET678', horas: '68h' },
            { codigo: 'OPT2', horas: '68h', isOptativa: true }
        ]},
        { nome: '8º Semestre', cls: 's8', disciplinas: [
            { codigo: 'GCET677', horas: '17h' },
            { codigo: 'OPT3', horas: '68h', isOptativa: true },
            { codigo: 'OPT4', horas: '68h', isOptativa: true },
            { codigo: 'OPT5', horas: '68h', isOptativa: true }
        ]}
    ],

    // === CURRÍCULO BCET ===
    curriculoBCET: [
        { nome: '1º Semestre', cls: 's1', disciplinas: [
            { codigo: 'GCCA1358', horas: '34h' }, { codigo: 'GCET985', horas: '68h' },
            { codigo: 'GCET986', horas: '68h' }, { codigo: 'GCET987', horas: '102h' },
            { codigo: 'GCET988', horas: '34h' }, { codigo: 'GCET989', horas: '34h' }
        ]},
        { nome: '2º Semestre', cls: 's2', disciplinas: [
            { codigo: 'GCET990', horas: '68h' }, { codigo: 'GCET060', horas: '68h' },
            { codigo: 'GCET991', horas: '68h' }, { codigo: 'GCET992', horas: '102h' },
            { codigo: 'GCET821', horas: '68h' }, { codigo: 'GCET825', horas: '34h' }
        ]},
        { nome: '3º Semestre', cls: 's3', disciplinas: [
            { codigo: 'GCET995', horas: '68h' }, { codigo: 'GCET1044', horas: '68h' },
            { codigo: 'GCCA283', horas: '68h' }, { codigo: 'GCET993', horas: '102h' },
            { codigo: 'GCET822', horas: '68h' }, { codigo: 'GCET826', horas: '34h' }
        ]},
        { nome: '4º Semestre', cls: 's4', disciplinas: [
            { codigo: 'GCET996', horas: '68h' }, { codigo: 'GCET1045', horas: '68h' },
            { codigo: 'GCET1046', horas: '68h' }, { codigo: 'GCET994', horas: '68h' },
            { codigo: 'GCET823', horas: '68h' }, { codigo: 'GCET827', horas: '34h' }
        ]},
        { nome: '5º Semestre', cls: 's5', disciplinas: [
            { codigo: 'GCET997', horas: '68h' }, { codigo: 'GCET1047', horas: '68h' },
            { codigo: 'GCET1048', horas: '68h' }, { codigo: 'GCET1049', horas: '68h' },
            { codigo: 'GCET1050', horas: '68h' },
            { codigo: 'OPT_BCET_1', horas: '68h', isOptativa: true }
        ]},
        { nome: '6º Semestre', cls: 's6', disciplinas: [
            { codigo: 'GCET998', horas: '68h' }, { codigo: 'GCET1051', horas: '68h' },
            { codigo: 'GCET1052', horas: '68h' }, { codigo: 'GCET1053', horas: '68h' },
            { codigo: 'GCET1054', horas: '68h' },
            { codigo: 'OPT_BCET_2', horas: '68h', isOptativa: true }
        ]}
    ],

    // === NOMES DAS DISCIPLINAS (BMAT + BCET) ===
    nomesDisciplinas: {
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
        'GCET815': 'Trabalho de Conclusão de Curso (TCC antigo)',
        'GCET821': 'Física I',
        'GCET822': 'Física II',
        'GCET823': 'Física III',
        'GCET825': 'Física Experimental I',
        'GCET826': 'Física Experimental II',
        'GCET827': 'Física Experimental III',
        'GCET824': 'Física IV',
        'GCET828': 'Física Experimental IV',
        'GCET200': 'Tópicos Especiais em Matemática I',
        'GCET673': 'Teoria dos Números',
        'GCET675': 'Tópicos de Análise',
        'GCET1040': 'Termodinâmica',
        'GCET1041': 'Eletromagnetismo I',
        'GCET1064': 'Desenho Técnico e Expressão Gráfica I',
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
        'GCET1025': 'Eletrônica Analógica I',
        'GCET1026': 'Laboratório de Eletrônica Analógica I',
        'GCET1027': 'Sinais e Sistemas',
        'GCET1028': 'Conversão de Energia Elétrica',
        'GCET1029': 'Sistemas Microcontrolados',
        'GCET1030': 'Eletrônica Analógica II',
        'GCET1031': 'Laboratório de Eletrônica Analógica II',
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
        'GCET1001': 'Desenho Arquitetônico',
        'GCET985': 'Algorítmos e Programação de Computadores',
        'GCET986': 'Geometria Analítica',
        'GCET987': 'Cálculo I',
        'GCET988': 'Química Geral Teórica',
        'GCET989': 'Química Geral Prática',
        'GCET990': 'Diversidade e Relações Étnico-raciais (EAD)',
        'GCET1044': 'Álgebra Linear II',
        'GCET1045': 'Teoria dos Números',
        'GCET1046': 'Cálculo IV',
        'GCET994': 'Cálculo Numérico',
        'GCET997': 'ACE III',
        'GCET1047': 'Análise Combinatória',
        'GCET1048': 'Grupos e Anéis I',
        'GCET1049': 'Análise na Reta I',
        'GCET1050': 'Geometria Plana',
        'GCET998': 'ACE IV',
        'GCET1051': 'Probabilidade',
        'GCET1052': 'Grupos e Anéis II',
        'GCET1053': 'Análise na Reta II',
        'GCET1054': 'Funções de Uma Variável Complexa I',
        'GCET1055': 'Biomatemática',
        'GCET1056': 'Geometria Espacial',
        'GCET1057': 'Geometria Não Euclidiana',
        'GCET1058': 'História da Matemática',
        'GCET1059': 'Matemática Financeira',
        'GCET1060': 'Programação Linear',
        'GCET1061': 'Tópicos Especiais de Matemática I',
        'GCET1062': 'Tópicos Especiais de Matemática II',
        'GCET1063': 'Fundamentos de Lógica e Teoria dos Conjuntos',
        'GCCA1358': 'Tecnologia, Sociedade e Ambiente',
        'GCET995': 'ACE I',
        'GCET996': 'ACE II',
        'GCF247': 'Libras'
    }
};