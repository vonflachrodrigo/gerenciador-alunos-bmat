// ============================================================
// PDF IMPORT - IMPORTAÇÃO DE RELATÓRIOS DE ALUNOS
// ============================================================

class PDFImport {
    constructor(gerenciador) {
        this.gerenciador = gerenciador;
    }

    /**
     * Importa um relatório PDF de um aluno
     */
    async importarRelatorio(file) {
        try {
            const texto = await this._extrairTextoPDF(file);
            const dados = this._extrairDadosAluno(texto);
            const disciplinas = this._processarDisciplinas(texto);
            const resultado = this._salvarAluno(dados, disciplinas);
            return resultado;
        } catch (error) {
            console.error('Erro ao importar relatório:', error);
            throw new Error(`Erro ao importar: ${error.message}`);
        }
    }

    /**
     * Importa múltiplos relatórios de uma vez
     */
    async importarMultiplos(files) {
        const resultados = {
            sucesso: [],
            erro: [],
            ignorados: []
        };

        for (const file of files) {
            try {
                const resultado = await this.importarRelatorio(file);
                resultados.sucesso.push({
                    arquivo: file.name,
                    ...resultado
                });
            } catch (error) {
                resultados.erro.push({
                    arquivo: file.name,
                    erro: error.message
                });
            }
        }

        return resultados;
    }

    // ============================================================
    // MÉTODOS PRIVADOS
    // ============================================================

    async _extrairTextoPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let textoCompleto = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            textoCompleto += pageText + '\n';
        }

        return textoCompleto;
    }

    _extrairDadosAluno(texto) {
        const dados = {
            nome: '',
            curso: 'bmat',
            progresso: '',
            planejadas: 0,
            data: ''
        };

        const nomeMatch = texto.match(/Aluno:\s*([^\n]+)/i);
        if (nomeMatch) {
            dados.nome = nomeMatch[1].trim();
        }

        const cursoMatch = texto.match(/Curso:\s*([^\n]+)/i);
        if (cursoMatch) {
            const cursoTexto = cursoMatch[1].trim().toLowerCase();
            if (cursoTexto.includes('bcet')) {
                dados.curso = 'bcet';
            } else if (cursoTexto.includes('bmat')) {
                dados.curso = 'bmat';
            }
        }

        const progressoMatch = texto.match(/Progresso:\s*([^\n]+)/i);
        if (progressoMatch) {
            dados.progresso = progressoMatch[1].trim();
        }

        const planejadasMatch = texto.match(/Planejadas:\s*(\d+)/i);
        if (planejadasMatch) {
            dados.planejadas = parseInt(planejadasMatch[1]);
        }

        const dataMatch = texto.match(/Data:\s*([^\n]+)/i);
        if (dataMatch) {
            dados.data = dataMatch[1].trim();
        }

        return dados;
    }

    _processarDisciplinas(texto) {
        const disciplinas = {
            cursadas: [],
            planejadas: [],
            pendentes: [],
            optativas: {
                cursadas: [],
                planejadas: [],
                pendentes: []
            }
        };

        // Padrão para capturar disciplinas com marcadores
        const regex = /\[([XP\s])\]\s*([A-Z0-9]+)\s*-\s*([^(]+)\((\d+h)\)/gi;
        
        let match;
        while ((match = regex.exec(texto)) !== null) {
            const marcador = match[1].trim();
            const codigo = match[2].trim();
            const nome = match[3].trim();
            const horas = match[4].trim();

            const isOptativa = this._isOptativa(codigo);
            const disciplina = { codigo, nome, horas };

            if (marcador === 'X') {
                if (isOptativa) {
                    disciplinas.optativas.cursadas.push(disciplina);
                } else {
                    disciplinas.cursadas.push(disciplina);
                }
            } else if (marcador === 'P') {
                if (isOptativa) {
                    disciplinas.optativas.planejadas.push(disciplina);
                } else {
                    disciplinas.planejadas.push(disciplina);
                }
            } else if (marcador === '' || marcador === ' ') {
                if (isOptativa) {
                    disciplinas.optativas.pendentes.push(disciplina);
                } else {
                    disciplinas.pendentes.push(disciplina);
                }
            }
        }

        // Processa optativas planejadas (seção específica)
        const optPlanejadasMatch = texto.match(/Optativas Planejadas.*?:([\s\S]*?)(?=Optativas ja cursadas|ATENCAO|LEGENDA|$)/i);
        if (optPlanejadasMatch) {
            const optText = optPlanejadasMatch[1];
            const optRegex = /\[P\]\s*([A-Z0-9]+)\s*-\s*([^(]+)/gi;
            let optMatch;
            while ((optMatch = optRegex.exec(optText)) !== null) {
                const codigo = optMatch[1].trim();
                const nome = optMatch[2].trim();
                if (!disciplinas.optativas.planejadas.some(d => d.codigo === codigo)) {
                    disciplinas.optativas.planejadas.push({ codigo, nome, horas: '68h' });
                }
            }
        }

        return disciplinas;
    }

    _isOptativa(codigo) {
        const optativasConhecidas = [
            'GCET152', 'GCET153', 'GCET155', 'GCET184', 'GCET194',
            'GCET200', 'GCET201', 'GCET218', 'GCET508', 'GCET665',
            'GCET666', 'GCET667', 'GCET668', 'GCET669', 'GCET670',
            'GCET671', 'GCET672', 'GCET673', 'GCET674', 'GCET675',
            'GCET676', 'GCETIMC', 'GCETMD', 'GCF247',
            'GCET1055', 'GCET1056', 'GCET1057', 'GCET1058',
            'GCET1059', 'GCET1060', 'GCET1061', 'GCET1062', 'GCET1063'
        ];
        return optativasConhecidas.includes(codigo);
    }

    _salvarAluno(dados, disciplinas) {
        const alunos = this.gerenciador.getAlunos();
        let alunoId = null;
        let alunoExistente = null;

        for (const id in alunos) {
            if (alunos[id].nome.toLowerCase() === dados.nome.toLowerCase()) {
                alunoId = id;
                alunoExistente = alunos[id];
                break;
            }
        }

        if (!alunoExistente) {
            alunoId = this.gerenciador.adicionarAluno(dados.nome, '', dados.curso);
            alunoExistente = this.gerenciador.getAluno(alunoId);
        }

        if (alunoExistente.curso !== dados.curso) {
            alunoExistente.curso = dados.curso;
        }

        // Marca disciplinas cursadas
        for (const disc of disciplinas.cursadas) {
            alunoExistente.progresso[disc.codigo] = {
                status: 'done',
                origem: 'importado_relatorio',
                data: new Date().toISOString()
            };
            if (!alunoExistente.historico_completo) alunoExistente.historico_completo = {};
            alunoExistente.historico_completo[disc.codigo] = {
                status: 'done',
                origem: 'importado_relatorio',
                data: new Date().toISOString()
            };
        }

        // Marca disciplinas planejadas
        for (const disc of disciplinas.planejadas) {
            alunoExistente.progresso[disc.codigo] = {
                status: 'planned',
                origem: 'importado_relatorio',
                data: new Date().toISOString()
            };
            if (!alunoExistente.historico_completo) alunoExistente.historico_completo = {};
            alunoExistente.historico_completo[disc.codigo] = {
                status: 'planned',
                origem: 'importado_relatorio',
                data: new Date().toISOString()
            };
        }

        // Processa optativas cursadas
        const slots = getSlotsOptativa(dados.curso);
        let slotIndex = 0;
        for (const disc of disciplinas.optativas.cursadas) {
            if (slotIndex < slots.length) {
                const slot = slots[slotIndex];
                alunoExistente.optativas[slot] = disc.codigo;
                alunoExistente.progresso[disc.codigo] = {
                    status: 'done',
                    origem: 'importado_relatorio',
                    data: new Date().toISOString()
                };
                if (!alunoExistente.historico_completo) alunoExistente.historico_completo = {};
                alunoExistente.historico_completo[disc.codigo] = {
                    status: 'done',
                    origem: 'importado_relatorio',
                    data: new Date().toISOString()
                };
                if (!alunoExistente.historico_optativas) alunoExistente.historico_optativas = {};
                alunoExistente.historico_optativas[slot] = {
                    codigo: disc.codigo,
                    origem: 'importado_relatorio',
                    data: new Date().toISOString()
                };
                slotIndex++;
            }
        }

        // Processa optativas planejadas
        if (!alunoExistente.optativasPlanejadas) alunoExistente.optativasPlanejadas = [];
        for (const disc of disciplinas.optativas.planejadas) {
            if (!alunoExistente.optativasPlanejadas.includes(disc.codigo)) {
                alunoExistente.optativasPlanejadas.push(disc.codigo);
            }
            alunoExistente.progresso[disc.codigo] = {
                status: 'planned',
                origem: 'importado_relatorio',
                data: new Date().toISOString()
            };
        }

        this.gerenciador.salvar();
        this.gerenciador.selecionarAluno(alunoId);

        return {
            alunoId,
            nome: dados.nome,
            curso: dados.curso,
            progresso: dados.progresso,
            totais: {
                cursadas: disciplinas.cursadas.length + disciplinas.optativas.cursadas.length,
                planejadas: disciplinas.planejadas.length + disciplinas.optativas.planejadas.length,
                pendentes: disciplinas.pendentes.length + disciplinas.optativas.pendentes.length
            }
        };
    }
}