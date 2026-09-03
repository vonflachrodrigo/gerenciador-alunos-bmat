// ============================================================
// FUNCOES PURAS (UTILITARIAS)
// ============================================================

// 2.1 Normalizacao de codigo
function normalizarCodigo(codigo) {
    if (!codigo) return '';
    let base = codigo.replace(/\.[PT].*$/, '').replace(/\.PRATICA$/, '').replace(/\.TEORICA$/, '');
    return CONFIG.codigosObsoletos[base] || base;
}

// 2.2 Verifica se é optativa no curso atual
function isOptativa(codigo, curso) {
    const base = normalizarCodigo(codigo);
    if (curso === 'bmat') {
        const todas = [...CONFIG.optativasBMAT.opt1, ...CONFIG.optativasBMAT.outras];
        return todas.some(o => o.codigo === base);
    }
    if (curso === 'bcet') {
        return CONFIG.optativasBCET.some(o => o.codigo === base);
    }
    return false;
}

// 2.3 Verifica se é optativa em qualquer curso
function isOptativaGlobal(codigo) {
    const base = normalizarCodigo(codigo);
    const todas = [
        ...CONFIG.optativasBMAT.opt1,
        ...CONFIG.optativasBMAT.outras,
        ...CONFIG.optativasBCET
    ];
    return todas.some(o => o.codigo === base);
}

// 2.4 Obtém equivalencia
function getEquivalencia(codigo, direcao) {
    const base = normalizarCodigo(codigo);
    const simples = CONFIG.equivalencias.simples;
    const duplas = CONFIG.equivalencias.duplas;

    if (direcao === 'antigo_para_novo') {
        if (simples[base]) return { tipo: 'simples', codigo: simples[base] };
        if (duplas[base]) return { tipo: 'dupla', codigos: duplas[base] };
        return null;
    }

    if (direcao === 'novo_para_antigo') {
        for (const [antigo, novo] of Object.entries(simples)) {
            if (novo === base) return { tipo: 'simples', codigo: antigo };
        }
        for (const [antigo, novos] of Object.entries(duplas)) {
            if (novos.includes(base)) return { tipo: 'dupla', codigo: antigo };
        }
        return null;
    }

    return null;
}

// 2.5 Obtem nome da disciplina
function getNomeDisciplina(codigo) {
    return CONFIG.nomesDisciplinas[codigo] || codigo;
}

// 2.6 Obtem pre-requisitos
function getPreRequisitos(codigo, curso) {
    if (curso === 'bmat') return CONFIG.prerequisitosBMAT[codigo] || [];
    if (curso === 'bcet') return CONFIG.prerequisitosBCET[codigo] || [];
    return [];
}

// 2.7 Processa disciplinas do historico
function processarHistorico(disciplinasPDF, cursoAtual) {
    const resultado = {
        disciplinas: {},
        optativas: [],
        equivalencias: {}
    };

    const agrupado = {};
    for (const disc of disciplinasPDF) {
        const base = normalizarCodigo(disc.codigo);
        if (!agrupado[base]) agrupado[base] = { situacoes: [], semestre: disc.semestre };
        agrupado[base].situacoes.push(disc.situacao);
    }

    for (const [codigo, info] of Object.entries(agrupado)) {
        const temAprovacao = info.situacoes.some(s => s === 'APR' || s === 'DISP' || s === 'DISPCN');
        const temMatricula = info.situacoes.some(s => s === 'MATR');

        if (temAprovacao) {
            resultado.disciplinas[codigo] = { status: 'done', origem: 'historico' };

            const equiv = getEquivalencia(codigo, 'antigo_para_novo');
            if (equiv) {
                if (equiv.tipo === 'simples') {
                    resultado.disciplinas[equiv.codigo] = { status: 'done', origem: 'equivalencia' };
                    resultado.equivalencias[equiv.codigo] = { via: codigo };
                } else if (equiv.tipo === 'dupla') {
                    for (const sub of equiv.codigos) {
                        resultado.disciplinas[sub] = { status: 'done', origem: 'equivalencia' };
                        resultado.equivalencias[sub] = { via: codigo };
                    }
                }
            }

            if (isOptativa(codigo, cursoAtual) || isOptativaGlobal(codigo)) {
                if (!resultado.optativas.includes(codigo)) {
                    resultado.optativas.push(codigo);
                }
            }

        } else if (temMatricula) {
            resultado.disciplinas[codigo] = { status: 'pending', origem: 'historico' };
        }
    }

    return resultado;
}

// 2.8 Aloca optativas
function alocarOptativas(optativasCursadas, slotsExistentes, slotsDisponiveis) {
    const resultado = { ...slotsExistentes };
    const jaAlocadas = new Set(Object.values(slotsExistentes));
    const disponiveis = optativasCursadas.filter(c => !jaAlocadas.has(c));

    const prioridade = { 'GCET200': 1, 'GCET218': 2, 'GCET673': 3, 'GCET675': 4 };
    disponiveis.sort((a, b) => (prioridade[a] || 99) - (prioridade[b] || 99));

    for (let i = 0; i < Math.min(disponiveis.length, slotsDisponiveis.length); i++) {
        resultado[slotsDisponiveis[i]] = disponiveis[i];
    }

    return resultado;
}

// 2.9 Calcula progresso
function calcularProgresso(curriculo, disciplinas, optativas) {
    let total = 0,
        done = 0,
        pending = 0,
        planned = 0;

    for (const semestre of curriculo) {
        for (const disc of semestre.disciplinas) {
            if (disc.isOptativa) {
                total++;
                const codigo = optativas[disc.codigo];
                if (codigo && disciplinas[codigo]?.status === 'done') done++;
                else if (codigo && disciplinas[codigo]?.status === 'pending') pending++;
                else if (codigo && disciplinas[codigo]?.status === 'planned') planned++;
            } else {
                total++;
                const status = disciplinas[disc.codigo]?.status || 'not-started';
                if (status === 'done') done++;
                else if (status === 'pending') pending++;
                else if (status === 'planned') planned++;
            }
        }
    }

    return { total, done, pending, planned, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// 2.10 Verifica se pre-requisitos estao cumpridos
function verificarPreRequisitos(codigo, curso, disciplinas, quebras) {
    const prereqs = getPreRequisitos(codigo, curso);
    if (prereqs.length === 0) return { status: 'none', lista: [] };
    if (quebras && quebras[codigo]) return { status: 'quebra', lista: prereqs, quebra: true };

    const resultados = [];
    let todosOk = true,
        temPendente = false;
    for (const pre of prereqs) {
        const status = disciplinas[pre]?.status || 'not-started';
        resultados.push({ codigo: pre, status });
        if (status === 'not-started') todosOk = false;
        if (status === 'pending') temPendente = true;
    }
    if (todosOk) return { status: 'ok', lista: resultados };
    if (temPendente) return { status: 'pending', lista: resultados };
    return { status: 'blocked', lista: resultados };
}

// 2.11 Obtem todas as optativas (BMAT + BCET)
function getTodasOptativas() {
    const todas = [];
    const codigosVistos = new Set();

    for (const opt of CONFIG.optativasBMAT.opt1) {
        if (!codigosVistos.has(opt.codigo)) {
            todas.push({ ...opt, origem: 'bmat' });
            codigosVistos.add(opt.codigo);
        }
    }
    for (const opt of CONFIG.optativasBMAT.outras) {
        if (!codigosVistos.has(opt.codigo)) {
            todas.push({ ...opt, origem: 'bmat' });
            codigosVistos.add(opt.codigo);
        }
    }
    for (const opt of CONFIG.optativasBCET) {
        if (!codigosVistos.has(opt.codigo)) {
            todas.push({ ...opt, origem: 'bcet' });
            codigosVistos.add(opt.codigo);
        }
    }

    return todas;
}

// 2.12 Obtem curriculo do curso atual
function getCurriculo(curso) {
    return curso === 'bmat' ? CONFIG.curriculoBMAT : CONFIG.curriculoBCET;
}

// 2.13 Obtem slots de optativa do curso atual
function getSlotsOptativa(curso) {
    if (curso === 'bmat') return ['OPT1', 'OPT2', 'OPT3', 'OPT4', 'OPT5'];
    return ['OPT_BCET_1', 'OPT_BCET_2'];
}

// ============================================================
// 2.14 FUNCOES PARA EXCECOES
// ============================================================

/**
 * Verifica se uma disciplina esta no curriculo de um curso
 */
function isDisciplinaNoCurriculo(codigo, curso) {
    const curriculo = getCurriculo(curso);
    for (const semestre of curriculo) {
        for (const disc of semestre.disciplinas) {
            if (disc.codigo === codigo) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Obtem todas as disciplinas de um curso (obrigatorias + optativas)
 */
function getTodasDisciplinasDoCurso(curso) {
    const curriculo = getCurriculo(curso);
    const resultado = [];
    const codigosVistos = new Set();

    // Obrigatorias
    for (const semestre of curriculo) {
        for (const disc of semestre.disciplinas) {
            if (!disc.isOptativa && !codigosVistos.has(disc.codigo)) {
                resultado.push({
                    codigo: disc.codigo,
                    nome: getNomeDisciplina(disc.codigo),
                    tipo: 'obrigatoria',
                    origem: curso,
                    horas: disc.horas || '68h'
                });
                codigosVistos.add(disc.codigo);
            }
        }
    }

    // Optativas
    const todasOptativas = getTodasOptativas();
    for (const opt of todasOptativas) {
        if (opt.origem === curso && !codigosVistos.has(opt.codigo)) {
            resultado.push({
                codigo: opt.codigo,
                nome: opt.nome,
                tipo: 'optativa',
                origem: curso,
                pre: opt.pre || 'Nenhum',
                horas: '68h'
            });
            codigosVistos.add(opt.codigo);
        }
    }

    return resultado;
}

/**
 * Obtem disciplinas que estao em um curso mas nao no outro
 */
function getDisciplinasForaDoCurriculo(cursoAluno) {
    const outroCurso = cursoAluno === 'bmat' ? 'bcet' : 'bmat';
    const disciplinasAluno = getTodasDisciplinasDoCurso(cursoAluno);
    const disciplinasOutro = getTodasDisciplinasDoCurso(outroCurso);

    const codigosAluno = new Set();
    for (const disc of disciplinasAluno) {
        codigosAluno.add(disc.codigo);
    }

    const resultado = [];
    for (const disc of disciplinasOutro) {
        if (!codigosAluno.has(disc.codigo)) {
            resultado.push(disc);
        }
    }

    return resultado;
}