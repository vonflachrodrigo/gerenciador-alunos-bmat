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
    // METODOS DE ESTADO
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
    // METODOS DE MANIPULACAO
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
            optativasPlanejadas: [],
            excecoes: [],
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
    // METODOS DE PROGRESSO
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
    // METODOS DE OPTATIVAS
    // ============================================================

    getOptativasDisponiveis(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];

        const curso = aluno.curso || 'bmat';
        const todasOptativas = getTodasOptativas();

        const slotsOcupados = new Set();
        const slots = getSlotsOptativa(curso);
        for (const slot of slots) {
            if (aluno.optativas[slot]) {
                slotsOcupados.add(aluno.optativas[slot]);
            }
        }

        const planejadas = new Set(aluno.optativasPlanejadas || []);

        return todasOptativas.filter(opt => {
            if (aluno.progresso[opt.codigo]?.status === 'done') return false;
            if (aluno.progresso[opt.codigo]?.status === 'pending') return false;
            if (slotsOcupados.has(opt.codigo)) return false;
            if (planejadas.has(opt.codigo)) return false;
            return true;
        });
    }

    getOptativaDoSlot(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return null;
        return aluno.optativas[slotCodigo] || null;
    }

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

    getOptativasParaSlot(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];

        const curso = aluno.curso || 'bmat';
        const todasOptativas = getTodasOptativas();
        const slots = getSlotsOptativa(curso);

        const slotsOcupados = new Set();
        for (const slot of slots) {
            if (slot !== slotCodigo && aluno.optativas[slot]) {
                slotsOcupados.add(aluno.optativas[slot]);
            }
        }

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
            throw new Error(optativaCodigo + ' não é uma optativa válida');
        }

        for (const slot of slots) {
            if (slot === slotCodigo) continue;
            if (aluno.optativas[slot] === optativaCodigo) {
                throw new Error('A optativa ' + optativaCodigo + ' já está alocada em ' + slot);
            }
        }

        if (aluno.optativasPlanejadas.includes(optativaCodigo)) {
            throw new Error('A optativa ' + optativaCodigo + ' já está na lista de planejadas');
        }

        if (status === 'planned') {
            if (aluno.optativasPlanejadas.length >= 5) {
                throw new Error('Máximo de 5 optativas planejadas atingido');
            }
        }

        if (aluno.optativas[slotCodigo]) {
            const antiga = aluno.optativas[slotCodigo];
            if (aluno.progresso[antiga]) {
                delete aluno.progresso[antiga];
            }
        }

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

        this._notifyListeners('selecionarOptativa', {
            alunoId,
            slotCodigo,
            optativaCodigo,
            status,
            isPlanejada: status === 'planned'
        });

        return { slotCodigo, optativaCodigo, status, isPlanejada: status === 'planned' };
    }

    moverOptativa(alunoId, slotOrigem, slotDestino) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        const slots = getSlotsOptativa(aluno.curso || 'bmat');
        if (!slots.includes(slotOrigem) || !slots.includes(slotDestino)) {
            throw new Error('Slot de optativa inválido');
        }

        const codigo = aluno.optativas[slotOrigem];
        if (!codigo) {
            throw new Error('Nenhuma optativa em ' + slotOrigem);
        }

        delete aluno.optativas[slotOrigem];
        aluno.optativas[slotDestino] = codigo;

        aluno.historico_optativas[slotDestino] = {
            codigo: codigo,
            origem: 'movido',
            data: new Date().toISOString()
        };
        delete aluno.historico_optativas[slotOrigem];

        this._notifyListeners('moverOptativa', { alunoId, slotOrigem, slotDestino, codigo });
        return { slotOrigem, slotDestino, codigo };
    }

    removerOptativaDoSlot(alunoId, slotCodigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        const codigo = aluno.optativas[slotCodigo];
        if (!codigo) {
            throw new Error('Nenhuma optativa em ' + slotCodigo);
        }

        delete aluno.optativas[slotCodigo];
        delete aluno.progresso[codigo];
        delete aluno.historico_optativas[slotCodigo];

        this._notifyListeners('removerOptativa', { alunoId, slotCodigo, codigo });
        return { slotCodigo, codigo };
    }

    getOptativasPlanejadas(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];
        return aluno.optativasPlanejadas || [];
    }

    removerOptativaPlanejada(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        const index = aluno.optativasPlanejadas.indexOf(codigo);
        if (index === -1) {
            throw new Error('A optativa ' + codigo + ' não está na lista de planejadas');
        }

        aluno.optativasPlanejadas.splice(index, 1);

        if (aluno.progresso[codigo]) {
            delete aluno.progresso[codigo];
        }

        this._notifyListeners('removerOptativaPlanejada', { alunoId, codigo });
        return { codigo };
    }

    reordenarOptativasPlanejadas(alunoId, novaOrdem) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        const setAtual = new Set(aluno.optativasPlanejadas);
        const setNovo = new Set(novaOrdem);
        if (setAtual.size !== setNovo.size || !novaOrdem.every(c => setAtual.has(c))) {
            throw new Error('Ordem inválida');
        }

        aluno.optativasPlanejadas = novaOrdem;

        this._notifyListeners('reordenarOptativas', { alunoId, novaOrdem });
        return { novaOrdem };
    }

    limparOptativasPlanejadas(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        for (const codigo of aluno.optativasPlanejadas) {
            if (aluno.progresso[codigo]) {
                delete aluno.progresso[codigo];
            }
        }

        aluno.optativasPlanejadas = [];

        this._notifyListeners('limparOptativasPlanejadas', { alunoId });
        return { removidas: 0 };
    }

    isOptativaPlanejada(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return false;
        return (aluno.optativasPlanejadas || []).includes(codigo);
    }

    getEstatisticasOptativas(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return null;

        const curso = aluno.curso || 'bmat';
        const slots = getSlotsOptativa(curso);
        const totalNecessario = slots.length;

        let cursadas = 0;
        const cursadasLista = [];
        for (const slot of slots) {
            const codigo = aluno.optativas[slot];
            if (codigo && aluno.progresso[codigo]?.status === 'done') {
                cursadas++;
                cursadasLista.push(codigo);
            }
        }

        const planejadas = aluno.optativasPlanejadas || [];
        const planejadasLista = planejadas;

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
    // METODOS DE EXCECOES
    // ============================================================

    getExcecoes(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];
        return aluno.excecoes || [];
    }

    isDisciplinaExcecao(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return false;
        return (aluno.excecoes || []).some(e => e.codigo === codigo);
    }

    getDisciplinasForaDoCurriculo(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return [];

        const cursoAluno = aluno.curso || 'bmat';
        const outroCurso = cursoAluno === 'bmat' ? 'bcet' : 'bmat';
        const curriculoAluno = getCurriculo(cursoAluno);
        const curriculoOutro = getCurriculo(outroCurso);

        const codigosDoCurriculo = new Set();
        
        for (const semestre of curriculoAluno) {
            for (const disc of semestre.disciplinas) {
                codigosDoCurriculo.add(disc.codigo);
            }
        }

        const resultado = [];
        const codigosVistos = new Set();

        for (const semestre of curriculoOutro) {
            for (const disc of semestre.disciplinas) {
                const codigo = disc.codigo;
                
                if (codigosVistos.has(codigo)) continue;
                codigosVistos.add(codigo);

                if (!codigosDoCurriculo.has(codigo)) {
                    resultado.push({
                        codigo: codigo,
                        nome: getNomeDisciplina(codigo),
                        tipo: disc.isOptativa ? 'optativa' : 'obrigatoria',
                        origem: outroCurso,
                        horas: disc.horas || '68h'
                    });
                }
            }
        }

        const todasOptativas = getTodasOptativas();
        for (const opt of todasOptativas) {
            if (opt.origem === outroCurso && !codigosVistos.has(opt.codigo)) {
                if (!codigosDoCurriculo.has(opt.codigo)) {
                    resultado.push({
                        codigo: opt.codigo,
                        nome: opt.nome,
                        tipo: 'optativa',
                        origem: outroCurso,
                        pre: opt.pre || 'Nenhum',
                        horas: '68h'
                    });
                }
                codigosVistos.add(opt.codigo);
            }
        }

        resultado.sort((a, b) => {
            if (a.tipo === 'obrigatoria' && b.tipo === 'optativa') return -1;
            if (a.tipo === 'optativa' && b.tipo === 'obrigatoria') return 1;
            return a.codigo.localeCompare(b.codigo);
        });

        return resultado;
    }

    adicionarExcecao(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.excecoes) aluno.excecoes = [];

        if (aluno.excecoes.some(e => e.codigo === codigo)) {
            throw new Error('Esta disciplina já está na lista de exceções');
        }

        if (aluno.progresso[codigo]?.status === 'planned') {
            throw new Error('Esta disciplina já está planejada normalmente');
        }

        if (aluno.progresso[codigo]?.status === 'done') {
            throw new Error('Esta disciplina já foi cursada');
        }

        if (aluno.progresso[codigo]?.status === 'pending') {
            throw new Error('Esta disciplina já está em andamento');
        }

        const nome = getNomeDisciplina(codigo) || codigo;
        const isOpt = isOptativaGlobal(codigo);
        
        const excecao = {
            codigo: codigo,
            nome: nome,
            tipo: isOpt ? 'optativa' : 'obrigatoria',
            data: new Date().toISOString()
        };

        aluno.excecoes.push(excecao);

        this._notifyListeners('adicionarExcecao', { alunoId, codigo });
        return excecao;
    }

    removerExcecao(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.excecoes) aluno.excecoes = [];

        const index = aluno.excecoes.findIndex(e => e.codigo === codigo);
        if (index === -1) {
            throw new Error('Exceção não encontrada');
        }

        aluno.excecoes.splice(index, 1);

        this._notifyListeners('removerExcecao', { alunoId, codigo });
        return { codigo };
    }

    limparExcecoes(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.excecoes) aluno.excecoes = [];

        const removidas = aluno.excecoes.length;
        aluno.excecoes = [];

        this._notifyListeners('limparExcecoes', { alunoId });
        return { removidas };
    }

    // ============================================================
    // METODO TOGGLE DISCIPLINA
    // ============================================================

    toggleDisciplina(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.progresso) aluno.progresso = {};
        if (!aluno.historico_completo) aluno.historico_completo = {};

        const curso = aluno.curso || 'bmat';
        const slots = getSlotsOptativa(curso);

        if (aluno.equiv && aluno.equiv[codigo]) {
            return { status: 'equiv', mensagem: 'Disciplina cursada por equivalência' };
        }

        if (slots.includes(codigo)) {
            return {
                status: 'optativa',
                mensagem: 'Abrir modal de optativa',
                acao: 'abrirModal',
                slot: codigo
            };
        }

        let slotEncontrado = null;
        for (const slot of slots) {
            if (aluno.optativas[slot] === codigo) {
                slotEncontrado = slot;
                break;
            }
        }

        if (slotEncontrado) {
            const states = ['pending', 'done', 'planned'];
            const current = aluno.progresso[codigo]?.status || 'pending';
            
            let nextIndex;
            if (current === 'planned') {
                nextIndex = 0;
            } else {
                nextIndex = (states.indexOf(current) + 1) % states.length;
                if (states[nextIndex] === 'planned') {
                    if (aluno.optativasPlanejadas.length >= 5) {
                        return {
                            status: 'erro',
                            mensagem: 'Máximo de 5 optativas planejadas atingido',
                            acao: 'erro'
                        };
                    }
                    
                    delete aluno.optativas[slotEncontrado];
                    delete aluno.progresso[codigo];
                    
                    if (!aluno.optativasPlanejadas.includes(codigo)) {
                        aluno.optativasPlanejadas.push(codigo);
                    }
                    
                    this._notifyListeners('alterarProgresso', { alunoId, codigo, status: 'planned', isPlanejada: true });
                    return {
                        status: 'planned',
                        mensagem: codigo + ' adicionada às optativas planejadas',
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
            return { status: next, mensagem: codigo + ' ' + this._statusParaTexto(next) };
        }

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
        return { status: next, mensagem: codigo + ' ' + this._statusParaTexto(next) };
    }

    _statusParaTexto(status) {
        const mapa = {
            'done': 'cursada',
            'pending': 'cursando',
            'planned': 'planejada',
            'not-started': 'não iniciada'
        };
        return mapa[status] || status;
    }

    toggleOptativaPlanejada(alunoId, codigo) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        if (aluno.optativasPlanejadas.includes(codigo)) {
            return {
                status: 'ja_planejada',
                mensagem: codigo + ' já está na lista de planejadas',
                acao: 'abrirModalStatus'
            };
        }

        if (aluno.optativasPlanejadas.length >= 5) {
            throw new Error('Máximo de 5 optativas planejadas atingido');
        }

        aluno.optativasPlanejadas.push(codigo);

        if (aluno.progresso[codigo]) {
            delete aluno.progresso[codigo];
        }

        this._notifyListeners('adicionarOptativaPlanejada', { alunoId, codigo });
        return { status: 'adicionada', mensagem: codigo + ' adicionada às optativas planejadas' };
    }

    // ============================================================
    // METODOS DE QUEBRA
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
    // METODOS DE IMPORTACAO
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
    // METODOS DE PLANEJAMENTO (PRE-MATRICULA)
    // ============================================================

    obterDisciplinasPlanejaveis(alunoId) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) return { obrigatorias: [], optativas: [] };

        const curso = aluno.curso || 'bmat';
        const curriculo = getCurriculo(curso);

        const obrigatorias = [];
        const optativas = [];

        // Obrigatórias não cursadas e não cursando
        for (const semestre of curriculo) {
            for (const disc of semestre.disciplinas) {
                if (disc.isOptativa) continue;
                const status = aluno.progresso[disc.codigo]?.status || 'not-started';
                // Exclui disciplinas já cursadas (done) e cursando (pending)
                if (status !== 'done' && status !== 'equiv-done' && status !== 'pending') {
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

    salvarPlanejamento(alunoId, codigosPlanejados, prioridade = null) {
        const aluno = this.getAluno(alunoId);
        if (!aluno) throw new Error('Aluno não encontrado');

        if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];

        const optativasSelecionadas = codigosPlanejados.filter(c => isOptativaGlobal(c));
        const obrigatoriasSelecionadas = codigosPlanejados.filter(c => !isOptativaGlobal(c));

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

        for (const codigo of optativasSelecionadas) {
            if (!aluno.optativasPlanejadas.includes(codigo)) {
                if (aluno.optativasPlanejadas.length >= 5) {
                    throw new Error('Máximo de 5 optativas planejadas atingido. Não foi possível adicionar ' + codigo);
                }
                aluno.optativasPlanejadas.push(codigo);
            }
        }

        if (prioridade && Array.isArray(prioridade)) {
            const setAtual = new Set(aluno.optativasPlanejadas);
            const setNovo = new Set(prioridade);
            if (setAtual.size === setNovo.size && prioridade.every(c => setAtual.has(c))) {
                aluno.optativasPlanejadas = prioridade;
            }
        }

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
    // METODOS DE VERIFICACAO
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
                        sugestao: 'Clique em ' + original + ' e marque como "cursada via equivalência"'
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
                        sugestao: 'Clique em ' + slot + ' e selecione ' + info.esperado
                    });
                }
            }

            const optativasQueViramObrigatorias = { 'GCET218': 'GCET1064', 'GCET673': 'GCET1045' };
            for (const [bmat, bcet] of Object.entries(optativasQueViramObrigatorias)) {
                if (aluno.progresso[bmat]?.status === 'done' && aluno.progresso[bcet]?.status !== 'done') {
                    pendentes.ignoradas.push({
                        bmat: bmat,
                        bcet: bcet,
                        sugestao: 'A disciplina ' + bcet + ' deve ser marcada como cursada via equivalência de ' + bmat
                    });
                }
            }
        }

        pendentes.total = pendentes.fisicas.length + pendentes.optativas.length + pendentes.ignoradas.length;
        return pendentes;
    }

    // ============================================================
    // METODOS DE PERSISTENCIA
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
                    if (!this.alunos[id].optativasPlanejadas) this.alunos[id].optativasPlanejadas = [];
                    if (!this.alunos[id].excecoes) this.alunos[id].excecoes = [];
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
            if (!this.alunos[id].optativasPlanejadas) this.alunos[id].optativasPlanejadas = [];
            if (!this.alunos[id].excecoes) this.alunos[id].excecoes = [];
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