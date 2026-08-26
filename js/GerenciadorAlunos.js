// ============================================================
// GERENCIADOR DE ALUNOS - CLASSE PRINCIPAL
// ============================================================

class GerenciadorAlunos {
    constructor() {
        this.alunos = {};
        this.nextId = 1;
        this.alunoAtivoId = null;
        this.cursoAtivo = 'bmat';
        this.listeners = [];
    }

    // ============================================================
    // MÉTODOS DE ESTADO (já existentes)
    // ============================================================

    getAlunos() {
        return this.alunos;
    }

    getAluno(id) {
        return this.alunos[id] || null;
    }

    getAlunoAtivo() {
        return this.alunoAtivoId ? this.alunos[this.alunoAtivoId] : null;
    }

    getCursoAtivo() {
        return this.cursoAtivo;
    }

    getAlunosArray() {
        return Object.values(this.alunos);
    }

    getAlunosKeys() {
        return Object.keys(this.alunos);
    }

    getTotalAlunos() {
        return Object.keys(this.alunos).length;
    }

    // ============================================================
    // MÉTODOS DE MANIPULAÇÃO (já existentes)
    // ============================================================

    adicionarAluno(nome, matricula = '', curso = null) {
        if (!nome || nome.trim() === '') {
            throw new Error('Nome do aluno é obrigatório');
        }

        const id = String(this.nextId++);
        const cursoFinal = curso || this.cursoAtivo;

        this.alunos[id] = {
            nome: nome.trim(),
            matricula: matricula.trim() || '',
            progresso: {},
            optativas: {},
            optativasPlanejadas: [], // NOVO: array para optativas planejadas
            quebras: {},
            equiv: {},
            historico_completo: {},
            historico_optativas: {},
            curso: cursoFinal,
            dadosPessoais: {}
        };

        this._notifyListeners('adicionar', id);
        return id;
    }

    adicionarMultiplosAlunos(linhas) {
        const resultados = {
            adicionados: [],
            ignorados: [],
            erros: []
        };

        const nomesExistentes = new Set();
        const matriculasExistentes = new Set();

        for (const id in this.alunos) {
            nomesExistentes.add(this.alunos[id].nome.toLowerCase().trim());
            if (this.alunos[id].matricula) {
                matriculasExistentes.add(this.alunos[id].matricula);
            }
        }

        for (const linha of linhas) {
            try {
                const partes = linha.split('|').map(s => s.trim());
                const nome = partes[0];
                const matricula = partes[1] || '';

                if (!nome) continue;

                const nomeLower = nome.toLowerCase().trim();
                if (nomesExistentes.has(nomeLower)) {
                    resultados.ignorados.push({ nome, motivo: 'Nome duplicado' });
                    continue;
                }
                if (matricula && matriculasExistentes.has(matricula)) {
                    resultados.ignorados.push({ nome, matricula, motivo: 'Matrícula duplicada' });
                    continue;
                }

                const id = this.adicionarAluno(nome, matricula);
                resultados.adicionados.push({ id, nome, matricula });
                nomesExistentes.add(nomeLower);
                if (matricula) matriculasExistentes.add(matricula);

            } catch (error) {
                resultados.erros.push({ linha, erro: error.message });
            }
        }

        this._notifyListeners('adicionarMultiplos', resultados);
        return resultados;
    }

    removerAluno(id) {
        if (!this.alunos[id]) {
            throw new Error('Aluno não encontrado');
        }

        const nome = this.alunos[id].nome;
        delete this.alunos[id];

        if (this.alunoAtivoId === id) {
            const keys = Object.keys(this.alunos);
            this.alunoAtivoId = keys.length > 0 ? keys[0] : null;
        }

        this._notifyListeners('remover', { id, nome });
        return { id, nome };
    }

    selecionarAluno(id) {
        if (!this.alunos[id]) {
            throw new Error('Aluno não encontrado');
        }
        this.alunoAtivoId = id;
        this._notifyListeners('selecionar', id);
        return id;
    }

    selecionarCurso(curso) {
        if (curso !== 'bmat' && curso !== 'bcet') {
            throw new Error('Curso inválido. Use "bmat" ou "bcet"');
        }
        this.cursoAtivo = curso;

        if (this.alunoAtivoId && this.alunos[this.alunoAtivoId]) {
            this.alunos[this.alunoAtivoId].curso = curso;
        }

        this._notifyListeners('selecionarCurso', curso);
        return curso;
    }

    // ============================================================
    // MÉTODOS DE PROGRESSO (já existentes)
    // ============================================================

    getProgresso(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return null;

        const curso = aluno.curso || 'bmat';
        const curriculo = getCurriculo(curso);
        return calcularProgresso(curriculo, aluno.progresso, aluno.optativas);
    }

    getProgressoAtivo() {
        return this.alunoAtivoId ? this.getProgresso(this.alunoAtivoId) : null;
    }

    // ============================================================
    // MÉTODOS DE OPTATIVAS - NOVOS
    // ============================================================

    /**
     * Obtém todas as optativas disponíveis para um aluno
     * Exclui as que já estão alocadas em slots
     */
    getOptativasDisponiveis(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];

        const curso = aluno.curso || 'bmat';
        const todasOptativas = getTodasOptativas();

        // Optativas já alocadas em slots
        const slotsOcupados = new Set();
        const slots = getSlotsOptativa(curso);
        for (const slot of slots) {
            if (aluno.optativas[slot]) {
                slotsOcupados.add(aluno.optativas[slot]);
            }
        }

        // Optativas já planejadas
        const planejadas = new Set(aluno.optativasPlanejadas || []);

        return todasOptativas.filter(opt => {
            // Já foi cursada?
            if (aluno.progresso[opt.codigo]?.status === 'done') return false;
            // Já está alocada em algum slot?
            if (slotsOcupados.has(opt.codigo)) return false;
            // Já está planejada?
            if (planejadas.has(opt.codigo)) return false;
            return true;
        });
    }

    /**
     * Obtém a disciplina atual de um slot de optativa
     */
    getOptativaDoSlot(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return null;
        return aluno.optativas[slotCodigo] || null;
    }

    /**
     * Verifica se uma disciplina já está alocada em algum slot
     */
    isOptativaAlocada(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return false;

        const slots = getSlotsOptativa(aluno.curso || 'bmat');
        for (const slot of slots) {
            if (aluno.optativas[slot] === codigo) {
                return true;
            }
        }
        return false;
    }

    /**
     * Obtém o slot onde uma optativa está alocada
     */
    getSlotDaOptativa(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return null;

        const slots = getSlotsOptativa(aluno.curso || 'bmat');
        for (const slot of slots) {
            if (aluno.optativas[slot] === codigo) {
                return slot;
            }
        }
        return null;
    }

    /**
     * ETAPA 1: Selecionar disciplina para um slot
     * Retorna a lista de optativas disponíveis para escolha
     */
    getOptativasParaSlot(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];

        const curso = aluno.curso || 'bmat';
        const todasOptativas = getTodasOptativas();
        const slots = getSlotsOptativa(curso);

        // Optativas já alocadas em outros slots
        const slotsOcupados = new Set();
        for (const slot of slots) {
            if (slot !== slotCodigo && aluno.optativas[slot]) {
                slotsOcupados.add(aluno.optativas[slot]);
            }
        }

        // Optativas já planejadas
        const planejadas = new Set(aluno.optativasPlanejadas || []);

        return todasOptativas.map(opt => {
            const isAlocada = slotsOcupados.has(opt.codigo);
            const isPlanejada = planejadas.has(opt.codigo);
            const isAtual = aluno.optativas[slotCodigo] === opt.codigo;
            const isValida = isOptativa(opt.codigo, curso);

            return {
                ...opt,
                isAlocada,
                isPlanejada,
                isAtual,
                isValida,
                disponivel: !isAlocada && !isPlanejada && !isAtual
            };
        });
    }

    /**
     * ETAPA 1: Selecionar disciplina para um slot
     * Retorna informações do slot e da disciplina atual
     */
    getInfoSlot(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return null;

        const slots = getSlotsOptativa(aluno.curso || 'bmat');
        if (!slots.includes(slotCodigo)) {
            throw new Error('Slot de optativa inválido');
        }

        const disciplinaAtual = aluno.optativas[slotCodigo] || null;
        const statusAtual = disciplinaAtual ? (aluno.progresso[disciplinaAtual]?.status || 'not-started') : 'not-started';

        return {
            slot: slotCodigo,
            disciplinaAtual,
            statusAtual,
            temDisciplina: !!disciplinaAtual
        };
    }

    /**
     * ETAPA 2: Selecionar disciplina para um slot (completo)
     * Escolhe a disciplina e define o status
     */
    selecionarOptativaCompleta(alunoId, slotCodigo, optativaCodigo, status) {
    const aluno = this.getAluno(alunoId);
    if (!aluno) throw new Error('Aluno não encontrado');

    if (!aluno.historico_optativas) aluno.historico_optativas = {};
    if (!aluno.historico_completo) aluno.historico_completo = {};
    if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

    const curso = aluno.curso || 'bmat';
    const slots = getSlotsOptativa(curso);

    if (!slots.includes(slotCodigo)) {
        throw new Error('Slot de optativa inválido');
    }

    if (!isOptativaGlobal(optativaCodigo)) {
        throw new Error(`${optativaCodigo} não é uma optativa válida`);
    }

    // Verifica duplicidade em outros slots
    for (const slot of slots) {
        if (slot === slotCodigo) continue;
        if (aluno.optativas[slot] === optativaCodigo) {
            throw new Error(`A optativa ${optativaCodigo} já está alocada em ${slot}`);
        }
    }

    if (aluno.optativasPlanejadas.includes(optativaCodigo)) {
        throw new Error(`A optativa ${optativaCodigo} já está na lista de planejadas`);
    }

    if (status === 'planned') {
        if (aluno.optativasPlanejadas.length >= 5) {
            throw new Error('Máximo de 5 optativas planejadas atingido');
        }
    }

    // Remove disciplina anterior do slot
    if (aluno.optativas[slotCodigo]) {
        const antiga = aluno.optativas[slotCodigo];
        if (aluno.progresso[antiga]) {
            delete aluno.progresso[antiga];
        }
    }

    // Se for "Planejada", NÃO coloca no fluxograma
    if (status === 'planned') {
        delete aluno.optativas[slotCodigo];
        if (!aluno.optativasPlanejadas.includes(optativaCodigo)) {
            aluno.optativasPlanejadas.push(optativaCodigo);
        }
    } else {
        aluno.optativas[slotCodigo] = optativaCodigo;
        aluno.progresso[optativaCodigo] = {
            status: status,
            origem: 'manual',
            data: new Date().toISOString()
        };
        aluno.historico_completo[optativaCodigo] = {
            status: status,
            origem: curso,
            data: new Date().toISOString()
        };
        aluno.historico_optativas[slotCodigo] = {
            codigo: optativaCodigo,
            origem: curso,
            data: new Date().toISOString()
        };
        aluno.optativasPlanejadas = aluno.optativasPlanejadas.filter(c => c !== optativaCodigo);
    }

    // CORREÇÃO: Notifica apenas se não estiver em um loop
    this._notifyListeners('selecionarOptativa', { 
        alunoId, 
        slotCodigo, 
        optativaCodigo, 
        status,
        isPlanejada: status === 'planned'
    });

    return { slotCodigo, optativaCodigo, status, isPlanejada: status === 'planned' };
}

    /**
     * Move uma optativa de um slot para outro
     */
    moverOptativa(alunoId, slotOrigem, slotDestino) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        const slots = getSlotsOptativa(aluno.curso || 'bmat');
        if (!slots.includes(slotOrigem) || !slots.includes(slotDestino)) {
            throw new Error('Slot de optativa inválido');
        }

        const codigo = aluno.optativas[slotOrigem];
        if (!codigo) {
            throw new Error(`Nenhuma optativa em ${slotOrigem}`);
        }

        // Remove do slot de origem
        delete aluno.optativas[slotOrigem];

        // Adiciona no slot de destino
        aluno.optativas[slotDestino] = codigo;

        // Atualiza histórico
        aluno.historico_optativas[slotDestino] = {
            codigo: codigo,
            origem: 'movido',
            data: new Date().toISOString()
        };
        delete aluno.historico_optativas[slotOrigem];

        this._notifyListeners('moverOptativa', { alunoId, slotOrigem, slotDestino, codigo });
        return { slotOrigem, slotDestino, codigo };
    }

    /**
     * Remove optativa de um slot (volta para "não cursada")
     */
    removerOptativaDoSlot(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        const codigo = aluno.optativas[slotCodigo];
        if (!codigo) {
            throw new Error(`Nenhuma optativa em ${slotCodigo}`);
        }

        delete aluno.optativas[slotCodigo];
        delete aluno.progresso[codigo];
        delete aluno.historico_optativas[slotCodigo];

        this._notifyListeners('removerOptativa', { alunoId, slotCodigo, codigo });
        return { slotCodigo, codigo };
    }

    /**
     * Obtém a lista de optativas planejadas
     */
    getOptativasPlanejadas(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];
        return aluno.optativasPlanejadas || [];
    }

    /**
     * Remove uma optativa da lista de planejadas
     * Ela volta para "não cursada" no fluxograma (slot vazio)
     */
    removerOptativaPlanejada(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        const index = aluno.optativasPlanejadas.indexOf(codigo);
        if (index === -1) {
            throw new Error(`A optativa ${codigo} não está na lista de planejadas`);
        }

        aluno.optativasPlanejadas.splice(index, 1);

        // Remove do progresso se existir (garantia)
        if (aluno.progresso[codigo]) {
            delete aluno.progresso[codigo];
        }

        this._notifyListeners('removerOptativaPlanejada', { alunoId, codigo });
        return { codigo };
    }

    /**
     * Reordena a lista de optativas planejadas
     */
    reordenarOptativasPlanejadas(alunoId, novaOrdem) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        // Verifica se todos os códigos existem
        const setAtual = new Set(aluno.optativasPlanejadas);
        const setNovo = new Set(novaOrdem);
        if (setAtual.size !== setNovo.size || !novaOrdem.every(c => setAtual.has(c))) {
            throw new Error('Ordem inválida');
        }

        aluno.optativasPlanejadas = novaOrdem;

        this._notifyListeners('reordenarOptativas', { alunoId, novaOrdem });
        return { novaOrdem };
    }

    /**
     * Limpa todas as optativas planejadas
     */
    limparOptativasPlanejadas(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        // Remove do progresso
        for (const codigo of aluno.optativasPlanejadas) {
            if (aluno.progresso[codigo]) {
                delete aluno.progresso[codigo];
            }
        }

        aluno.optativasPlanejadas = [];

        this._notifyListeners('limparOptativasPlanejadas', { alunoId });
        return { removidas: 0 };
    }

    /**
     * Verifica se uma optativa está planejada
     */
    isOptativaPlanejada(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return false;
        return (aluno.optativasPlanejadas || []).includes(codigo);
    }

    /**
     * Obtém estatísticas de optativas do aluno
     */
    getEstatisticasOptativas(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return null;

        const curso = aluno.curso || 'bmat';
        const slots = getSlotsOptativa(curso);
        const totalNecessario = slots.length;

        // Conta optativas cursadas (status 'done')
        let cursadas = 0;
        const cursadasLista = [];
        for (const slot of slots) {
            const codigo = aluno.optativas[slot];
            if (codigo && aluno.progresso[codigo]?.status === 'done') {
                cursadas++;
                cursadasLista.push(codigo);
            }
        }

        // Optativas planejadas
        const planejadas = aluno.optativasPlanejadas || [];
        const planejadasLista = planejadas;

        // Optativas em andamento (status 'pending')
        let emAndamento = 0;
        for (const slot of slots) {
            const codigo = aluno.optativas[slot];
            if (codigo && aluno.progresso[codigo]?.status === 'pending') {
                emAndamento++;
            }
        }

        const faltando = totalNecessario - cursadas - planejadas.length;

        return {
            totalNecessario,
            cursadas,
            cursadasLista,
            planejadas: planejadas.length,
            planejadasLista,
            emAndamento,
            faltando: Math.max(0, faltando),
            concluido: faltando <= 0 && planejadas.length === 0
        };
    }

    // ============================================================
    // MÉTODO TOGGLE DISCIPLINA (MODIFICADO)
    // ============================================================

    toggleDisciplina(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.progresso) aluno.progresso = {};
        if (!aluno.historico_completo) aluno.historico_completo = {};

        const curso = aluno.curso || 'bmat';
        const slots = getSlotsOptativa(curso);

        // Verifica se é equivalência
        if (aluno.equiv && aluno.equiv[codigo]) {
            return { status: 'equiv', mensagem: 'Disciplina cursada por equivalência' };
        }

        // Se for slot de optativa - ABRE MODAL (não faz toggle automático)
        if (slots.includes(codigo)) {
            return { 
                status: 'optativa', 
                mensagem: 'Abrir modal de optativa', 
                acao: 'abrirModal',
                slot: codigo
            };
        }

        // Verifica se é optativa selecionada (disciplina específica em um slot)
        let slotEncontrado = null;
        for (const slot of slots) {
            if (aluno.optativas[slot] === codigo) {
                slotEncontrado = slot;
                break;
            }
        }

        if (slotEncontrado) {
            // É uma optativa específica - faz ciclo de status
            const states = ['pending', 'done', 'planned'];
            const current = aluno.progresso[codigo]?.status || 'pending';
            
            // Se for 'planned', volta para 'pending' (não fica planejada no fluxograma)
            let nextIndex;
            if (current === 'planned') {
                nextIndex = 0; // Volta para 'pending'
            } else {
                nextIndex = (states.indexOf(current) + 1) % states.length;
                if (states[nextIndex] === 'planned') {
                    // Se for 'planned', não coloca no fluxograma
                    // Move para a lista de planejadas
                    if (aluno.optativasPlanejadas.length >= 5) {
                        return { 
                            status: 'erro', 
                            mensagem: '⚠️ Máximo de 5 optativas planejadas atingido',
                            acao: 'erro'
                        };
                    }
                    
                    // Remove do slot
                    delete aluno.optativas[slotEncontrado];
                    delete aluno.progresso[codigo];
                    
                    // Adiciona à lista de planejadas
                    if (!aluno.optativasPlanejadas.includes(codigo)) {
                        aluno.optativasPlanejadas.push(codigo);
                    }
                    
                    this._notifyListeners('alterarProgresso', { alunoId, codigo, status: 'planned', isPlanejada: true });
                    return { 
                        status: 'planned', 
                        mensagem: `📌 ${codigo} adicionada às optativas planejadas`,
                        isPlanejada: true
                    };
                }
            }
            
            const next = states[nextIndex];
            aluno.progresso[codigo] = { status: next, origem: 'manual' };
            aluno.historico_completo[codigo] = {
                status: next,
                origem: curso,
                data: new Date().toISOString()
            };

            this._notifyListeners('alterarProgresso', { alunoId, codigo, status: next });
            return { status: next, mensagem: `📌 ${codigo} ${this._statusParaTexto(next)}` };
        }

        // Disciplina normal (não optativa)
        const prereqCheck = verificarPreRequisitos(codigo, curso, aluno.progresso, aluno.quebras);
        if (prereqCheck.status === 'blocked') {
            return { status: 'blocked', mensagem: 'Pré-requisitos bloqueados', acao: 'abrirQuebra' };
        }

        const states = ['not-started', 'pending', 'done', 'planned'];
        const current = aluno.progresso[codigo]?.status || 'not-started';
        const nextIndex = (states.indexOf(current) + 1) % states.length;
        const next = states[nextIndex];

        aluno.progresso[codigo] = { status: next, origem: 'manual' };
        aluno.historico_completo[codigo] = {
            status: next,
            origem: curso,
            data: new Date().toISOString()
        };

        this._notifyListeners('alterarProgresso', { alunoId, codigo, status: next });
        return { status: next, mensagem: `📌 ${codigo} ${this._statusParaTexto(next)}` };
    }

    _statusParaTexto(status) {
        const mapa = {
            'done': '✅ cursada',
            'pending': '🟡 cursando',
            'planned': '📌 planejada',
            'not-started': '⏳ não iniciada'
        };
        return mapa[status] || status;
    }

    // ============================================================
    // MÉTODO TOGGLE PLANEJADA (para clicar na lista abaixo)
    // ============================================================

    toggleOptativaPlanejada(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        if (aluno.optativasPlanejadas.includes(codigo)) {
            // Se já está planejada, pergunta se quer remover ou mudar status
            return { 
                status: 'ja_planejada', 
                mensagem: `${codigo} já está na lista de planejadas`,
                acao: 'abrirModalStatus'
            };
        }

        // Adiciona à lista de planejadas
        if (aluno.optativasPlanejadas.length >= 5) {
            throw new Error('Máximo de 5 optativas planejadas atingido');
        }

        aluno.optativasPlanejadas.push(codigo);

        // Remove do progresso se existir (garantia)
        if (aluno.progresso[codigo]) {
            delete aluno.progresso[codigo];
        }

        this._notifyListeners('adicionarOptativaPlanejada', { alunoId, codigo });
        return { status: 'adicionada', mensagem: `📌 ${codigo} adicionada às optativas planejadas` };
    }

    // ============================================================
    // MÉTODOS DE QUEBRA (já existentes)
    // ============================================================

    concederQuebra(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.quebras) aluno.quebras = {};
        aluno.quebras[codigo] = true;

        if (!aluno.progresso[codigo] || aluno.progresso[codigo]?.status === 'not-started') {
            aluno.progresso[codigo] = { status: 'pending', origem: 'quebra' };
        }

        this._notifyListeners('concederQuebra', { alunoId, codigo });
        return { codigo, status: 'concedida' };
    }

    removerQuebra(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (aluno.quebras && aluno.quebras[codigo]) {
            delete aluno.quebras[codigo];
            this._notifyListeners('removerQuebra', { alunoId, codigo });
            return { codigo, status: 'removida' };
        }

        throw new Error('Nenhuma quebra encontrada para esta disciplina');
    }

    // ============================================================
    // MÉTODOS DE IMPORTAÇÃO (já existentes)
    // ============================================================

    importarHistorico(alunoId, disciplinasPDF) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        const curso = aluno.curso || 'bmat';

        const resultado = processarHistorico(disciplinasPDF, curso);

        for (const [codigo, info] of Object.entries(resultado.disciplinas)) {
            aluno.progresso[codigo] = { status: info.status, origem: info.origem };
            if (info.origem === 'equivalencia' && resultado.equivalencias[codigo]) {
                aluno.equiv[codigo] = resultado.equivalencias[codigo];
            }
            aluno.historico_completo[codigo] = {
                status: info.status,
                origem: curso,
                data: new Date().toISOString()
            };
        }

        const slots = getSlotsOptativa(curso);
        const slotsDisponiveis = slots.filter(s => !aluno.optativas[s]);
        const novasOptativas = alocarOptativas(resultado.optativas, aluno.optativas, slotsDisponiveis);

        for (const [slot, codigo] of Object.entries(novasOptativas)) {
            if (!aluno.optativas[slot]) {
                aluno.optativas[slot] = codigo;
                if (!aluno.historico_optativas[slot]) {
                    aluno.historico_optativas[slot] = {
                        codigo: codigo,
                        origem: 'importado',
                        data: new Date().toISOString()
                    };
                }
            }
        }

        aluno.curso = curso;

        this._notifyListeners('importarHistorico', { alunoId, resultado });
        return resultado;
    }

    // ============================================================
    // MÉTODOS DE PLANEJAMENTO (PRÉ-MATRÍCULA) - MODIFICADOS
    // ============================================================

    obterDisciplinasPlanejaveis(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return { obrigatorias: [], optativas: [] };

        const curso = aluno.curso || 'bmat';
        const curriculo = getCurriculo(curso);

        const obrigatorias = [];
        const optativas = [];

        // Obrigatórias não cursadas
        for (const semestre of curriculo) {
            for (const disc of semestre.disciplinas) {
                if (disc.isOptativa) continue;
                const status = aluno.progresso[disc.codigo]?.status || 'not-started';
                if (status !== 'done' && status !== 'equiv-done') {
                    obrigatorias.push({
                        codigo: disc.codigo,
                        nome: getNomeDisciplina(disc.codigo),
                        horas: disc.horas,
                        semestre: semestre.nome,
                        jaPlanejada: status === 'planned'
                    });
                }
            }
        }

        // Optativas disponíveis (que não estão em slots nem planejadas)
        const optativasDisponiveis = this.getOptativasDisponiveis(alunoId);
        for (const opt of optativasDisponiveis) {
            optativas.push({
                codigo: opt.codigo,
                nome: opt.nome,
                pre: opt.pre,
                origem: opt.origem,
                jaPlanejada: (aluno.optativasPlanejadas || []).includes(opt.codigo)
            });
        }

        return { obrigatorias, optativas };
    }

    /**
     * Salva planejamento - NÃO ALTERA optativas existentes
     * Apenas adiciona à lista de planejadas
     */
    salvarPlanejamento(alunoId, codigosPlanejados, prioridade = null) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        // Filtra apenas optativas
        const optativasSelecionadas = codigosPlanejados.filter(c => isOptativaGlobal(c));
        const obrigatoriasSelecionadas = codigosPlanejados.filter(c => !isOptativaGlobal(c));

        // Remove planejamentos antigos de optativas (apenas as que estão sendo substituídas)
        // Mas NÃO remove optativas que não estão na nova seleção
        // Isso permite que o usuário mantenha optativas planejadas que não foram desselecionadas

        // Remove optativas que foram desselecionadas
        const atuais = new Set(aluno.optativasPlanejadas);
        const novas = new Set(optativasSelecionadas);
        const remover = [];
        for (const codigo of atuais) {
            if (!novas.has(codigo)) {
                remover.push(codigo);
            }
        }

        for (const codigo of remover) {
            const index = aluno.optativasPlanejadas.indexOf(codigo);
            if (index !== -1) {
                aluno.optativasPlanejadas.splice(index, 1);
            }
            if (aluno.progresso[codigo]) {
                delete aluno.progresso[codigo];
            }
        }

        // Adiciona novas optativas (que não estão na lista ainda)
        for (const codigo of optativasSelecionadas) {
            if (!aluno.optativasPlanejadas.includes(codigo)) {
                if (aluno.optativasPlanejadas.length >= 5) {
                    throw new Error(`Máximo de 5 optativas planejadas atingido. Não foi possível adicionar ${codigo}`);
                }
                aluno.optativasPlanejadas.push(codigo);
            }
        }

        // Se prioridade foi fornecida, reordena
        if (prioridade && Array.isArray(prioridade)) {
            // Verifica se todos os códigos existem
            const setAtual = new Set(aluno.optativasPlanejadas);
            const setNovo = new Set(prioridade);
            if (setAtual.size === setNovo.size && prioridade.every(c => setAtual.has(c))) {
                aluno.optativasPlanejadas = prioridade;
            }
        }

        // Salva obrigatórias
        for (const codigo of obrigatoriasSelecionadas) {
            aluno.progresso[codigo] = {
                status: 'planned',
                origem: 'pre_matricula',
                data: new Date().toISOString()
            };
            if (!aluno.historico_completo) aluno.historico_completo = {};
            aluno.historico_completo[codigo] = {
                status: 'planned',
                origem: 'pre_matricula',
                data: new Date().toISOString()
            };
        }

        this._notifyListeners('salvarPlanejamento', {
            alunoId,
            obrigatorias: obrigatoriasSelecionadas,
            optativas: aluno.optativasPlanejadas
        });

        return {
            obrigatorias: obrigatoriasSelecionadas,
            optativas: aluno.optativasPlanejadas
        };
    }

    // ============================================================
    // MÉTODOS DE VERIFICAÇÃO (já existentes)
    // ============================================================

    verificarCorrecoes(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return { fisicas: [], optativas: [], ignoradas: [], total: 0 };

        const curso = aluno.curso || 'bmat';
        const pendentes = { fisicas: [], optativas: [], ignoradas: [] };

        if (curso === 'bmat') {
            const fisicas = {
                'GCET095': { componentes: ['GCET821', 'GCET825'], nome: 'Física I' },
                'GCET099': { componentes: ['GCET822', 'GCET826'], nome: 'Física II' },
                'GCET102': { componentes: ['GCET823', 'GCET827'], nome: 'Física III' },
                'GCET106': { componentes: ['GCET824', 'GCET828'], nome: 'Física IV' }
            };

            for (const [original, info] of Object.entries(fisicas)) {
                const todasCursadas = info.componentes.every(c =>
                    aluno.progresso[c]?.status === 'done'
                );
                const originalCursada = aluno.progresso[original]?.status === 'done';
                const isEquiv = aluno.equiv && aluno.equiv[original];

                if (todasCursadas && !originalCursada && !isEquiv) {
                    pendentes.fisicas.push({
                        codigo: original,
                        nome: info.nome,
                        componentes: info.componentes,
                        sugestao: `Clique em ${original} e marque como "cursada via equivalência"`
                    });
                }
            }
        }

        if (curso === 'bcet') {
            const optativasEsperadas = {
                'OPT_BCET_1': { esperado: 'GCET1061', via: 'GCET200', nome: 'Tópicos Especiais de Matemática I', semestre: '5º' },
                'OPT_BCET_2': { esperado: 'GCET1062', via: 'GCET675', nome: 'Tópicos Especiais de Matemática II', semestre: '6º' }
            };

            for (const [slot, info] of Object.entries(optativasEsperadas)) {
                const atual = aluno.optativas[slot];
                if (atual !== info.esperado) {
                    pendentes.optativas.push({
                        slot: slot,
                        esperado: info.esperado,
                        via: info.via,
                        nome: info.nome,
                        semestre: info.semestre,
                        atual: atual || 'vazio',
                        sugestao: `Clique em ${slot} e selecione ${info.esperado}`
                    });
                }
            }

            const optativasQueViramObrigatorias = { 'GCET218': 'GCET1064', 'GCET673': 'GCET1045' };
            for (const [bmat, bcet] of Object.entries(optativasQueViramObrigatorias)) {
                if (aluno.progresso[bmat]?.status === 'done' && aluno.progresso[bcet]?.status !== 'done') {
                    pendentes.ignoradas.push({
                        bmat: bmat,
                        bcet: bcet,
                        sugestao: `A disciplina ${bcet} deve ser marcada como cursada via equivalência de ${bmat}`
                    });
                }
            }
        }

        pendentes.total = pendentes.fisicas.length + pendentes.optativas.length + pendentes.ignoradas.length;
        return pendentes;
    }

    // ============================================================
    // MÉTODOS DE PERSISTÊNCIA (já existentes - MODIFICADOS)
    // ============================================================

    salvar() {
        localStorage.setItem('gerenciador_bmat_bcet_status', JSON.stringify({
            alunos: this.alunos,
            nextId: this.nextId,
            cursoAtivo: this.cursoAtivo
        }));
    }

    carregar() {
        const saved = localStorage.getItem('gerenciador_bmat_bcet_status');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.alunos = data.alunos || {};
                this.nextId = data.nextId || 1;
                this.cursoAtivo = data.cursoAtivo || 'bmat';

                for (const id in this.alunos) {
                    if (!this.alunos[id].progresso) this.alunos[id].progresso = {};
                    if (!this.alunos[id].optativas) this.alunos[id].optativas = {};
                    if (!this.alunos[id].optativasPlanejadas) this.alunos[id].optativasPlanejadas = []; // NOVO
                    if (!this.alunos[id].quebras) this.alunos[id].quebras = {};
                    if (!this.alunos[id].equiv) this.alunos[id].equiv = {};
                    if (!this.alunos[id].historico_completo) this.alunos[id].historico_completo = {};
                    if (!this.alunos[id].historico_optativas) this.alunos[id].historico_optativas = {};
                    if (!this.alunos[id].curso) this.alunos[id].curso = 'bmat';
                }

                const keys = Object.keys(this.alunos);
                this.alunoAtivoId = keys.length > 0 ? keys[0] : null;

                this._notifyListeners('carregar', data);
                return true;
            } catch (e) {
                console.error('Erro ao carregar dados:', e);
                return false;
            }
        }
        return false;
    }

    exportar() {
        return {
            alunos: this.alunos,
            nextId: this.nextId,
            cursoAtivo: this.cursoAtivo,
            exportado: new Date().toISOString()
        };
    }

    importar(data) {
        if (!data.alunos || typeof data.alunos !== 'object') {
            throw new Error('Formato inválido');
        }

        this.alunos = data.alunos;
        this.nextId = data.nextId || 1;
        if (data.cursoAtivo) this.cursoAtivo = data.cursoAtivo;

        for (const id in this.alunos) {
            if (!this.alunos[id].progresso) this.alunos[id].progresso = {};
            if (!this.alunos[id].optativas) this.alunos[id].optativas = {};
            if (!this.alunos[id].optativasPlanejadas) this.alunos[id].optativasPlanejadas = []; // NOVO
            if (!this.alunos[id].quebras) this.alunos[id].quebras = {};
            if (!this.alunos[id].equiv) this.alunos[id].equiv = {};
            if (!this.alunos[id].historico_completo) this.alunos[id].historico_completo = {};
            if (!this.alunos[id].historico_optativas) this.alunos[id].historico_optativas = {};
            if (!this.alunos[id].curso) this.alunos[id].curso = 'bmat';
        }

        const keys = Object.keys(this.alunos);
        this.alunoAtivoId = keys.length > 0 ? keys[0] : null;

        this._notifyListeners('importar', data);
        this.salvar();
        return keys.length;
    }

    limpar() {
        this.alunos = {};
        this.nextId = 1;
        this.alunoAtivoId = null;
        this._notifyListeners('limpar', {});
        this.salvar();
    }

    // ============================================================
    // SISTEMA DE EVENTOS (já existente)
    // ============================================================

    adicionarListener(fn) {
        this.listeners.push(fn);
    }

    removerListener(fn) {
        const index = this.listeners.indexOf(fn);
        if (index !== -1) this.listeners.splice(index, 1);
    }

    _notifyListeners(evento, dados) {
        for (const fn of this.listeners) {
            try {
                fn(evento, dados);
            } catch (e) {
                console.error('Erro no listener:', e);
            }
        }
    }
}