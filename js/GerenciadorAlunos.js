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
    // MÉTODOS DE ESTADO
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
    // MÉTODOS DE MANIPULAÇÃO
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

        // Atualiza o curso do aluno ativo
        if (this.alunoAtivoId && this.alunos[this.alunoAtivoId]) {
            this.alunos[this.alunoAtivoId].curso = curso;
        }

        this._notifyListeners('selecionarCurso', curso);
        return curso;
    }

    // ============================================================
    // MÉTODOS DE PROGRESSO
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

        // Se for slot de optativa
        if (slots.includes(codigo)) {
            return { status: 'optativa', mensagem: 'Abrir modal de optativa', acao: 'abrirModal' };
        }

        // Verifica se é optativa selecionada
        let isOptativaSelecionada = false;
        for (const slot of slots) {
            if (aluno.optativas[slot] === codigo) {
                isOptativaSelecionada = true;
                break;
            }
        }

        if (isOptativaSelecionada) {
            const states = ['pending', 'done', 'planned'];
            const current = aluno.progresso[codigo]?.status || 'pending';
            let nextIndex = (states.indexOf(current) + 1) % states.length;
            if (current === 'planned') nextIndex = 0;
            const next = states[nextIndex];

            aluno.progresso[codigo] = { status: next, origem: 'manual' };
            aluno.historico_completo[codigo] = {
                status: next,
                origem: curso,
                data: new Date().toISOString()
            };

            this._notifyListeners('alterarProgresso', { alunoId, codigo, status: next });
            return { status: next, mensagem: `Disciplina ${codigo} ${this._statusParaTexto(next)}` };
        }

        // Disciplina normal
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
        return { status: next, mensagem: `Disciplina ${codigo} ${this._statusParaTexto(next)}` };
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
    // MÉTODOS DE OPTATIVAS
    // ============================================================

    getOptativasDisponiveis(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];

        const curso = aluno.curso || 'bmat';
        const todasOptativas = getTodasOptativas();

        // Optativas já alocadas
        const slotsOcupados = new Set();
        const slots = getSlotsOptativa(curso);
        for (const slot of slots) {
            if (aluno.optativas[slot]) {
                slotsOcupados.add(aluno.optativas[slot]);
            }
        }

        return todasOptativas.filter(opt => {
            // Já foi cursada?
            if (aluno.progresso[opt.codigo]?.status === 'done') return false;
            // Já está alocada em algum slot?
            if (slotsOcupados.has(opt.codigo)) return false;
            return true;
        });
    }

    selecionarOptativa(alunoId, slotCodigo, optativaCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.historico_optativas) aluno.historico_optativas = {};
        if (!aluno.historico_completo) aluno.historico_completo = {};

        const curso = aluno.curso || 'bmat';
        const slots = getSlotsOptativa(curso);

        // Verifica duplicidade
        for (const slot of slots) {
            if (slot === slotCodigo) continue;
            if (aluno.optativas[slot] === optativaCodigo) {
                throw new Error(`A optativa ${optativaCodigo} já foi selecionada em outro semestre`);
            }
        }

        // Verifica se é optativa global
        if (!isOptativaGlobal(optativaCodigo)) {
            throw new Error(`${optativaCodigo} não é uma optativa válida`);
        }

        // Aviso se não é válida no curso atual
        if (!isOptativa(optativaCodigo, curso)) {
            // Apenas aviso, não impede
            console.warn(`⚠️ ${optativaCodigo} não é uma optativa válida no curso atual`);
        }

        // Remove optativa anterior se existir
        if (aluno.optativas[slotCodigo]) {
            const antiga = aluno.optativas[slotCodigo];
            delete aluno.progresso[antiga];
        }

        // Adiciona nova optativa
        aluno.optativas[slotCodigo] = optativaCodigo;
        aluno.progresso[optativaCodigo] = { status: 'pending', origem: 'manual' };
        aluno.historico_optativas[slotCodigo] = {
            codigo: optativaCodigo,
            origem: curso,
            data: new Date().toISOString()
        };
        aluno.historico_completo[optativaCodigo] = {
            status: 'pending',
            origem: curso,
            data: new Date().toISOString()
        };

        this._notifyListeners('selecionarOptativa', { alunoId, slotCodigo, optativaCodigo });
        return { slotCodigo, optativaCodigo };
    }

    removerOptativa(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (aluno.optativas[slotCodigo]) {
            const antiga = aluno.optativas[slotCodigo];
            delete aluno.progresso[antiga];
            delete aluno.optativas[slotCodigo];
            delete aluno.historico_optativas[slotCodigo];
        }

        this._notifyListeners('removerOptativa', { alunoId, slotCodigo });
        return { slotCodigo };
    }

    // ============================================================
    // MÉTODOS DE QUEBRA
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
    // MÉTODOS DE IMPORTAÇÃO
    // ============================================================

    importarHistorico(alunoId, disciplinasPDF) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        const curso = aluno.curso || 'bmat';

        // Processa o histórico
        const resultado = processarHistorico(disciplinasPDF, curso);

        // Aplica ao aluno
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

        // Aloca optativas
        const slots = getSlotsOptativa(curso);
        const slotsDisponiveis = slots.filter(s => !aluno.optativas[s]);
        const novasOptativas = alocarOptativas(resultado.optativas, aluno.optativas, slotsDisponiveis);

        // Atualiza optativas mantendo as existentes
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
    // MÉTODOS DE PLANEJAMENTO (PRÉ-MATRÍCULA)
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

        // Optativas disponíveis
        const optativasDisponiveis = this.getOptativasDisponiveis(alunoId);
        for (const opt of optativasDisponiveis) {
            optativas.push({
                codigo: opt.codigo,
                nome: opt.nome,
                pre: opt.pre,
                origem: opt.origem,
                jaPlanejada: aluno.progresso[opt.codigo]?.status === 'planned'
            });
        }

        return { obrigatorias, optativas };
    }

    salvarPlanejamento(alunoId, codigosPlanejados) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        // Remove todas as disciplinas marcadas como 'planned'
        for (const codigo in aluno.progresso) {
            if (aluno.progresso[codigo]?.status === 'planned') {
                delete aluno.progresso[codigo];
            }
        }

        // Remove optativas planejadas dos slots
        const slots = getSlotsOptativa(aluno.curso || 'bmat');
        for (const slot of slots) {
            if (aluno.optativas[slot]) {
                const codigo = aluno.optativas[slot];
                if (aluno.progresso[codigo]?.status === 'planned') {
                    delete aluno.optativas[slot];
                }
            }
        }

        // Separa obrigatórias e optativas
        const obrigatoriasPlanejadas = [];
        const optativasPlanejadas = [];

        for (const codigo of codigosPlanejados) {
            if (isOptativaGlobal(codigo)) {
                optativasPlanejadas.push(codigo);
            } else {
                obrigatoriasPlanejadas.push(codigo);
            }
        }

        // Salva obrigatórias
        for (const codigo of obrigatoriasPlanejadas) {
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

        // Aloca optativas planejadas
        const slotsDisponiveis = ['OPT3', 'OPT4', 'OPT5'];
        const slotsJaOcupados = new Set();
        for (const slot of ['OPT1', 'OPT2', 'OPT3', 'OPT4', 'OPT5']) {
            if (aluno.optativas[slot]) {
                slotsJaOcupados.add(aluno.optativas[slot]);
            }
        }

        // Ordena optativas por prioridade
        const prioridade = { 'GCET200': 1, 'GCET218': 2, 'GCET673': 3, 'GCET675': 4 };
        optativasPlanejadas.sort((a, b) => (prioridade[a] || 99) - (prioridade[b] || 99));

        let slotsIndex = 0;
        const alocadas = [];

        for (const codigo of optativasPlanejadas) {
            if (slotsIndex >= slotsDisponiveis.length) break;
            if (slotsJaOcupados.has(codigo)) continue;

            const slot = slotsDisponiveis[slotsIndex];
            aluno.optativas[slot] = codigo;
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
            if (!aluno.historico_optativas) aluno.historico_optativas = {};
            aluno.historico_optativas[slot] = {
                codigo: codigo,
                origem: 'pre_matricula',
                data: new Date().toISOString()
            };
            alocadas.push({ slot, codigo });
            slotsIndex++;
        }

        this._notifyListeners('salvarPlanejamento', {
            alunoId,
            obrigatorias: obrigatoriasPlanejadas,
            optativas: alocadas
        });

        return {
            obrigatorias: obrigatoriasPlanejadas,
            optativas: alocadas
        };
    }

    // ============================================================
    // MÉTODOS DE VERIFICAÇÃO
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
    // MÉTODOS DE PERSISTÊNCIA
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

                // Garante estrutura mínima
                for (const id in this.alunos) {
                    if (!this.alunos[id].progresso) this.alunos[id].progresso = {};
                    if (!this.alunos[id].optativas) this.alunos[id].optativas = {};
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
    // SISTEMA DE EVENTOS
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