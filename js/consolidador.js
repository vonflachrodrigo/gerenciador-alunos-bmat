// ============================================================
// CONSOLIDADOR - LÓGICA DE CONSOLIDAÇÃO DE OFERTAS
// ============================================================

class ConsolidadorOfertas {
    constructor(gerenciador) {
        this.gerenciador = gerenciador;
        this.ofertas = {};
        this.detalhes = {};
        this._calcular();
    }

    _calcular() {
        const alunos = this.gerenciador.getAlunos();
        const mapa = {};

        for (const id in alunos) {
            const aluno = alunos[id];
            const curso = aluno.curso || 'bmat';
            const curriculo = getCurriculo(curso);

            // Percorre disciplinas obrigatórias
            for (const semestre of curriculo) {
                for (const disc of semestre.disciplinas) {
                    if (disc.isOptativa) continue;

                    const codigo = disc.codigo;
                    const status = aluno.progresso[codigo]?.status || 'not-started';
                    const isEquiv = aluno.equiv && aluno.equiv[codigo];

                    if (status !== 'done' && !isEquiv) {
                        this._adicionarAoMapa(mapa, codigo, {
                            nome: getNomeDisciplina(codigo) || codigo,
                            horas: disc.horas || '68h',
                            semestre: semestre.nome,
                            aluno: {
                                id: id,
                                nome: aluno.nome,
                                matricula: aluno.matricula || '',
                                status: status,
                                curso: curso
                            }
                        });
                    }
                }
            }

            // Percorre optativas
            const slots = getSlotsOptativa(curso);
            for (const slot of slots) {
                const codigo = aluno.optativas[slot];
                if (!codigo) continue;

                const status = aluno.progresso[codigo]?.status || 'not-started';
                const isEquiv = aluno.equiv && aluno.equiv[codigo];

                if (status !== 'done' && !isEquiv) {
                    this._adicionarAoMapa(mapa, codigo, {
                        nome: getNomeDisciplina(codigo) || codigo,
                        horas: '68h',
                        semestre: `Optativa (${slot})`,
                        aluno: {
                            id: id,
                            nome: aluno.nome,
                            matricula: aluno.matricula || '',
                            status: status,
                            curso: curso
                        }
                    });
                }
            }
        }

        this.detalhes = mapa;

        for (const codigo in mapa) {
            if (!(codigo in this.ofertas)) {
                this.ofertas[codigo] = true;
            }
        }
    }

    _adicionarAoMapa(mapa, codigo, info) {
        if (!mapa[codigo]) {
            mapa[codigo] = {
                codigo: codigo,
                nome: info.nome,
                horas: info.horas,
                semestre: info.semestre,
                alunos: [],
                total: 0
            };
        }

        const jaExiste = mapa[codigo].alunos.some(a => a.id === info.aluno.id);
        if (!jaExiste) {
            mapa[codigo].alunos.push(info.aluno);
            mapa[codigo].total++;
        }
    }

    getDisciplinas() {
        return Object.values(this.detalhes).sort((a, b) => b.total - a.total);
    }

    getDetalhes(codigo) {
        return this.detalhes[codigo] || null;
    }

    toggleOferta(codigo) {
        if (codigo in this.ofertas) {
            this.ofertas[codigo] = !this.ofertas[codigo];
        }
        return this.ofertas[codigo];
    }

    setOferta(codigo, status) {
        if (codigo in this.ofertas) {
            this.ofertas[codigo] = status;
        }
        return this.ofertas[codigo];
    }

    getOfertasSelecionadas() {
        const resultado = [];
        for (const codigo in this.ofertas) {
            if (this.ofertas[codigo] && this.detalhes[codigo]) {
                resultado.push({
                    ...this.detalhes[codigo],
                    alunos: this.detalhes[codigo].alunos || []
                });
            }
        }
        return resultado.sort((a, b) => b.total - a.total);
    }

    getOfertasNaoSelecionadas() {
        const resultado = [];
        for (const codigo in this.ofertas) {
            if (!this.ofertas[codigo] && this.detalhes[codigo]) {
                resultado.push({
                    ...this.detalhes[codigo],
                    alunos: this.detalhes[codigo].alunos || []
                });
            }
        }
        return resultado.sort((a, b) => b.total - a.total);
    }

    recalcular() {
        const ofertasAnteriores = { ...this.ofertas };
        this._calcular();
        for (const codigo in ofertasAnteriores) {
            if (codigo in this.ofertas) {
                this.ofertas[codigo] = ofertasAnteriores[codigo];
            }
        }
    }

    gerarRelatorio() {
        const selecionadas = this.getOfertasSelecionadas();
        const naoSelecionadas = this.getOfertasNaoSelecionadas();
        const totalAlunos = this.gerenciador.getTotalAlunos();
        const totalDisciplinas = this.getDisciplinas().length;

        let texto = '='.repeat(70) + '\n';
        texto += 'RELATÓRIO DE OFERTA DE DISCIPLINAS\n';
        texto += '='.repeat(70) + '\n';
        texto += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
        texto += `Total de alunos: ${totalAlunos}\n`;
        texto += `Total de disciplinas com demanda: ${totalDisciplinas}\n`;
        texto += '\n';

        texto += '='.repeat(70) + '\n';
        texto += '📚 DISCIPLINAS SELECIONADAS PARA OFERTA\n';
        texto += '='.repeat(70) + '\n\n';

        if (selecionadas.length === 0) {
            texto += 'Nenhuma disciplina selecionada.\n';
        } else {
            for (const disc of selecionadas) {
                texto += `📌 ${disc.codigo} - ${disc.nome}\n`;
                texto += `   Semestre: ${disc.semestre}\n`;
                texto += `   ${disc.total} aluno(s) precisam\n`;
                texto += '   Alunos:\n';
                for (const aluno of disc.alunos) {
                    texto += `     - ${aluno.nome}${aluno.matricula ? ` (${aluno.matricula})` : ''}\n`;
                }
                texto += '\n';
            }
        }

        texto += '='.repeat(70) + '\n';
        texto += '⚠️ DISCIPLINAS NÃO OFERTADAS\n';
        texto += '='.repeat(70) + '\n\n';

        if (naoSelecionadas.length === 0) {
            texto += 'Todas as disciplinas com demanda foram selecionadas.\n';
        } else {
            for (const disc of naoSelecionadas) {
                texto += `❌ ${disc.codigo} - ${disc.nome}\n`;
                texto += `   ${disc.total} aluno(s) ficarão sem\n`;
                texto += '   Alunos afetados:\n';
                for (const aluno of disc.alunos) {
                    texto += `     - ${aluno.nome}${aluno.matricula ? ` (${aluno.matricula})` : ''}\n`;
                }
                texto += '\n';
            }
        }

        texto += '='.repeat(70) + '\n';
        texto += `Relatório gerado em ${new Date().toLocaleString('pt-BR')}\n`;
        texto += 'Sistema de Planejamento de Ofertas - BMAT/BCET\n';

        return texto;
    }
}