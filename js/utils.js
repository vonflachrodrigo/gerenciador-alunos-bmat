// ============================================================
// FUNÇÕES PURAS (UTILITÁRIAS)
// ============================================================

// 2.1 Normalização de código
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

// 2.4 Obtém equivalência
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

// 2.5 Obtém nome da disciplina
function getNomeDisciplina(codigo) {
    return CONFIG.nomesDisciplinas[codigo] || codigo;
}

// 2.6 Obtém pré-requisitos
function getPreRequisitos(codigo, curso) {
    if (curso === 'bmat') return CONFIG.prerequisitosBMAT[codigo] || [];
    if (curso === 'bcet') return CONFIG.prerequisitosBCET[codigo] || [];
    return [];
}

// 2.7 Processa disciplinas do histórico
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

            // Verifica equivalência (antigo → novo)
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

            // Verifica se é optativa
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

    // Prioridade: GCET200, GCET218, GCET673, GCET675 primeiro
    const prioridade = { 'GCET200': 1, 'GCET218': 2, 'GCET673': 3, 'GCET675': 4 };
    disponiveis.sort((a, b) => (prioridade[a] || 99) - (prioridade[b] || 99));

    for (let i = 0; i < Math.min(disponiveis.length, slotsDisponiveis.length); i++) {
        resultado[slotsDisponiveis[i]] = disponiveis[i];
    }

    return resultado;
}