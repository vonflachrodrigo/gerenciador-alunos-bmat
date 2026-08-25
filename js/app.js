// ============================================================
// APP - ORQUESTRAÇÃO DA APLICAÇÃO
// ============================================================

// Instância do gerenciador
const gerenciador = new GerenciadorAlunos();

// Estado do modal
let modalContexto = null;
let quebraContexto = null;
let planejamentoTemp = {};

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Carrega dados
    gerenciador.carregar();

    // Configura curso ativo
    document.getElementById('cursoBMAT').className = gerenciador.cursoAtivo === 'bmat' ? 'active' : '';
    document.getElementById('cursoBCET').className = gerenciador.cursoAtivo === 'bcet' ? 'active' : '';

    // Configura modo de visualização
    const isMobile = window.innerWidth < 768;
    const grid = document.getElementById('mainGrid');
    const btn = document.getElementById('btnToggleVersion');
    if (isMobile) {
        grid.classList.remove('clasica', 'modo-clasica');
        grid.classList.add('modo-mobile');
        document.body.classList.add('modo-mobile');
        document.body.classList.remove('modo-clasica');
        btn.textContent = '💻 Clássica';
        btn.className = 'btn-toggle-version mobile';
    } else {
        grid.classList.remove('modo-mobile');
        grid.classList.add('clasica', 'modo-clasica');
        document.body.classList.remove('modo-mobile');
        document.body.classList.add('modo-clasica');
        btn.textContent = '📱 Mobile';
        btn.className = 'btn-toggle-version';
    }

    // Registra listener para atualizações
    gerenciador.adicionarListener((evento, dados) => {
        switch (evento) {
            case 'adicionar':
            case 'adicionarMultiplos':
            case 'remover':
            case 'selecionar':
            case 'alterarProgresso':
            case 'selecionarOptativa':
            case 'removerOptativa':
            case 'concederQuebra':
            case 'removerQuebra':
            case 'importarHistorico':
            case 'salvarPlanejamento':
                atualizarUI();
                gerenciador.salvar();
                break;
            case 'selecionarCurso':
                atualizarUI();
                gerenciador.salvar();
                break;
            case 'carregar':
            case 'importar':
                atualizarUI();
                break;
            case 'limpar':
                atualizarUI();
                gerenciador.salvar();
                break;
        }
    });

    // Renderiza
    atualizarUI();

    // Fechar modais com Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOptModal();
            fecharModalQuebra();
            fecharPreMatricula();
            fecharConfirmModal();
        }
    });
});

// ============================================================
// ATUALIZAÇÃO DA UI
// ============================================================

function atualizarUI() {
    renderAlunoList(gerenciador);
    renderFluxograma(gerenciador);
    updateAlunoCount();

    // Atualiza curso ativo
    document.getElementById('cursoBMAT').className = gerenciador.cursoAtivo === 'bmat' ? 'active' : '';
    document.getElementById('cursoBCET').className = gerenciador.cursoAtivo === 'bcet' ? 'active' : '';
}

function updateAlunoCount() {
    document.getElementById('alunoCount').textContent = gerenciador.getTotalAlunos();
}

// ============================================================
// HANDLERS (CHAMADOS PELO HTML)
// ============================================================

// Alunos
window.adicionarAlunoHandler = function() {
    const nomeInput = document.getElementById('newAlunoNome');
    const matriculaInput = document.getElementById('newAlunoMatricula');
    const nome = nomeInput.value.trim();
    const matricula = matriculaInput.value.trim();

    if (!nome) {
        showToast('Digite o nome do aluno!', 'error');
        return;
    }

    try {
        gerenciador.adicionarAluno(nome, matricula);
        nomeInput.value = '';
        matriculaInput.value = '';
        showToast(`✅ Aluno "${nome}" adicionado!`, 'success');
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.adicionarMultiplosHandler = function() {
    const texto = prompt('Digite os nomes dos alunos, um por linha. Para matrícula, use: Nome | Matrícula');
    if (!texto) return;

    const linhas = texto.split('\n').map(s => s.trim()).filter(s => s);
    if (linhas.length === 0) {
        showToast('Nenhum nome válido.', 'error');
        return;
    }

    const resultado = gerenciador.adicionarMultiplosAlunos(linhas);
    let msg = `✅ ${resultado.adicionados.length} alunos adicionados!`;
    if (resultado.ignorados.length > 0) {
        msg += ` ⚠️ ${resultado.ignorados.length} duplicatas ignoradas.`;
    }
    if (resultado.erros.length > 0) {
        msg += ` ❌ ${resultado.erros.length} erros.`;
    }
    showToast(msg, 'success');
};

window.removerAlunoHandler = function(id) {
    const aluno = gerenciador.getAluno(id);
    if (!aluno) return;
    if (!confirm(`Remover aluno "${aluno.nome}"?`)) return;

    try {
        gerenciador.removerAluno(id);
        showToast('🗑️ Aluno removido.', 'info');
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.selecionarAlunoHandler = function(id) {
    try {
        gerenciador.selecionarAluno(id);
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

// Curso
window.selecionarCursoHandler = function(curso) {
    try {
        gerenciador.selecionarCurso(curso);
        showToast(`📚 Curso ${curso === 'bmat' ? 'BMAT (PPC 2013)' : 'BCET - Matemática (PPC 2025)'} selecionado`, 'info');
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

// Disciplinas
window.toggleDisciplinaHandler = function(codigo) {
    const alunoId = gerenciador.alunoAtivoId;
    if (!alunoId) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        return;
    }

    try {
        const resultado = gerenciador.toggleDisciplina(alunoId, codigo);

        if (resultado.acao === 'abrirModal') {
            abrirModalOptativa(codigo);
        } else if (resultado.acao === 'abrirQuebra') {
            abrirModalQuebra(codigo);
        } else {
            showToast(resultado.mensagem, 'info');
        }
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

// Optativas
function abrirModalOptativa(optCodigo) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    modalContexto = { optCodigo };

    const labels = {
        'OPT_BCET_1': 'Optativa I (5º Semestre BCET)',
        'OPT_BCET_2': 'Optativa II (6º Semestre BCET)',
        'OPT1': 'Optativa I (6º Semestre BMAT)',
        'OPT2': 'Optativa II (7º Semestre BMAT)',
        'OPT3': 'Optativa III (8º Semestre BMAT)',
        'OPT4': 'Optativa IV (8º Semestre BMAT)',
        'OPT5': 'Optativa V (8º Semestre BMAT)'
    };
    const optLabel = labels[optCodigo] || 'Optativa';

    const todasOptativas = getTodasOptativas();
    const slotsOcupados = new Set();
    const slots = getSlotsOptativa(aluno.curso || 'bmat');
    for (const slot of slots) {
        if (slot !== optCodigo && aluno.optativas[slot]) {
            slotsOcupados.add(aluno.optativas[slot]);
        }
    }

    document.getElementById('optModalTitle').textContent = `Selecionar ${optLabel}`;
    document.getElementById('optModalSub').textContent =
        `Escolha a disciplina optativa para ${aluno.nome} (${todasOptativas.length} disponíveis)`;

    const list = document.getElementById('optList');
    list.innerHTML = '';

    const optativasFiltradas = todasOptativas.filter(opt => {
        if (slotsOcupados.has(opt.codigo) && aluno.optativas[optCodigo] !== opt.codigo) {
            return false;
        }
        return true;
    });

    for (const opt of optativasFiltradas) {
        const div = document.createElement('div');
        const isSelected = aluno.optativas[optCodigo] === opt.codigo;
        const isOcupado = slotsOcupados.has(opt.codigo);
        const isValida = isOptativa(opt.codigo, aluno.curso || 'bmat');

        div.className = `opt-item ${isSelected ? 'selected' : ''}`;

        if (isOcupado && !isSelected) {
            div.style.opacity = '0.4';
            div.style.cursor = 'not-allowed';
            div.style.pointerEvents = 'none';
            div.title = 'Já selecionada em outro semestre';
        }

        if (!isValida && !isSelected && !isOcupado) {
            div.style.borderColor = '#ff6f00';
            div.style.background = '#fff3e0';
            div.title = '⚠️ Optativa válida apenas no outro curso';
        }

        const preDisplay = opt.pre === 'Nenhum' ? 'Sem pré-requisito' : `Pré: ${opt.pre}`;
        const origemLabel = opt.origem === 'bmat' ? '📐' : '📘';

        div.innerHTML = `
            <span class="opt-code">${opt.codigo}</span>
            ${opt.nome} ${origemLabel}
            <span class="opt-pre">${preDisplay}</span>
            ${isSelected ? ' ✅ Selecionada' : ''}
        `;

        if (isOcupado && !isSelected) {
            div.onclick = () => showToast(`⚠️ ${opt.codigo} já selecionada em outro semestre`, 'error');
        } else {
            div.onclick = () => selecionarOptativaHandler(opt.codigo);
        }

        list.appendChild(div);
    }

    if (optativasFiltradas.length === 0) {
        list.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px;color:#999;">
                <p>⚠️ Nenhuma optativa disponível para seleção.</p>
                <p style="font-size:12px;">Todas as optativas já estão alocadas em outros semestres.</p>
            </div>
        `;
    }

    document.getElementById('optModal').classList.add('show');
}

window.selecionarOptativaHandler = function(codigo) {
    if (!modalContexto) return;
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    const optCodigo = modalContexto.optCodigo;

    try {
        gerenciador.selecionarOptativa(aluno.id || gerenciador.alunoAtivoId, optCodigo, codigo);
        showToast(`✅ Optativa ${codigo} selecionada!`, 'success');
        closeOptModal();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.clearOptativaHandler = function() {
    if (!modalContexto) return;
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    try {
        gerenciador.removerOptativa(aluno.id || gerenciador.alunoAtivoId, modalContexto.optCodigo);
        showToast('🗑️ Optativa removida!', 'info');
        closeOptModal();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

function closeOptModal() {
    document.getElementById('optModal').classList.remove('show');
    modalContexto = null;
}

document.getElementById('optModal').addEventListener('click', function(e) {
    if (e.target === this) closeOptModal();
});

// Quebra
window.abrirModalQuebraHandler = function(codigo) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    quebraContexto = { codigo };
    const curso = aluno.curso || 'bmat';
    const prereqs = getPreRequisitos(codigo, curso);
    const preNomes = prereqs.map(c => `${c} - ${getNomeDisciplina(c)}`).join(', ');

    document.getElementById('quebraSubtitle').textContent = `Aluno: ${aluno.nome}`;
    document.getElementById('quebraInfo').innerHTML = `
        <strong>Disciplina:</strong> ${codigo} - ${getNomeDisciplina(codigo)}<br>
        <strong>Pré-requisitos:</strong> ${preNomes || 'Nenhum'}<br>
        <strong>Status:</strong> ${aluno.quebras && aluno.quebras[codigo] ? '✅ Já possui quebra' : '❌ Sem quebra'}
    `;

    document.getElementById('quebraModal').classList.add('show');
};

window.confirmarQuebraHandler = function() {
    if (!quebraContexto) return;
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    try {
        gerenciador.concederQuebra(aluno.id || gerenciador.alunoAtivoId, quebraContexto.codigo);
        fecharModalQuebra();
        showToast(`🔓 Quebra concedida para ${quebraContexto.codigo}!`, 'success');
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.removerQuebraHandler = function() {
    if (!quebraContexto) return;
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    try {
        gerenciador.removerQuebra(aluno.id || gerenciador.alunoAtivoId, quebraContexto.codigo);
        fecharModalQuebra();
        showToast(`🗑️ Quebra removida para ${quebraContexto.codigo}`, 'info');
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

function fecharModalQuebra() {
    document.getElementById('quebraModal').classList.remove('show');
    quebraContexto = null;
}

document.getElementById('quebraModal').addEventListener('click', function(e) {
    if (e.target === this) fecharModalQuebra();
});

// Importação
window.importarHistoricoHandler = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Selecione ou crie um aluno primeiro!', 'error');
        event.target.value = '';
        return;
    }

    const preview = document.getElementById('importPreview');
    preview.innerHTML = `<div class="info">⏳ Processando PDF... <span class="loading"></span></div>`;
    preview.classList.add('show');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let textoCompleto = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            textoCompleto += pageText + '\n';
        }

        // Regex melhorada para capturar disciplinas
        const todasOcorrencias = [];
        const regex = /(\d{4}\.\d)\s+([A-ZÇÃÕÁÉÍÓÚÂÊÎÔÛÀ\s\'\-]+?)\s+(APR|REP|DISPCN|DISP|MATR|REPF|REPMF|TRANC|TRTAL)\s+([A-Z0-9.]+)\s+(\d+)\s+([\d.]+|--)\s+([\d.]+)/gi;

        let match;
        while ((match = regex.exec(textoCompleto)) !== null) {
            const periodo = match[1];
            const nome = match[2].trim();
            const situacao = match[3];
            const codigo = match[4].trim();
            const ch = parseInt(match[5]);

            if (codigo.includes('ENADE') || nome.includes('ENADE')) continue;

            todasOcorrencias.push({
                periodo: periodo,
                codigo: codigo,
                nome: nome,
                ch: ch,
                situacao: situacao
            });
        }

        if (todasOcorrencias.length === 0) {
            preview.innerHTML = `<div class="error">❌ Nenhuma disciplina encontrada no PDF.</div>`;
            showToast('❌ Nenhuma disciplina encontrada.', 'error');
            event.target.value = '';
            return;
        }

        const resultado = gerenciador.importarHistorico(
            aluno.id || gerenciador.alunoAtivoId,
            todasOcorrencias
        );

        const pendentes = gerenciador.verificarCorrecoes(aluno.id || gerenciador.alunoAtivoId);

        renderImportPreview(resultado, aluno, pendentes);

        if (pendentes.total > 0) {
            preview.innerHTML += renderErrosCorrecao(pendentes);
            showToast(`❌ ${pendentes.total} erro(s) encontrado(s)`, 'error');
        } else {
            showToast(`✅ ${Object.values(resultado.disciplinas).filter(d => d.status === 'done').length} disciplinas processadas!`, 'success');
        }

    } catch (error) {
        console.error('❌ Erro ao importar:', error);
        preview.innerHTML = `<div class="error">❌ Erro ao processar o PDF: ${error.message}</div>`;
        showToast('❌ Erro ao importar o PDF', 'error');
    }

    event.target.value = '';
};

// Versão
window.alternarVersaoHandler = function() {
    const grid = document.getElementById('mainGrid');
    const btn = document.getElementById('btnToggleVersion');
    if (grid.classList.contains('modo-mobile')) {
        grid.classList.remove('modo-mobile');
        grid.classList.add('clasica', 'modo-clasica');
        document.body.classList.remove('modo-mobile');
        document.body.classList.add('modo-clasica');
        btn.textContent = '📱 Mobile';
        btn.className = 'btn-toggle-version';
    } else {
        grid.classList.remove('clasica', 'modo-clasica');
        grid.classList.add('modo-mobile');
        document.body.classList.remove('modo-clasica');
        document.body.classList.add('modo-mobile');
        btn.textContent = '💻 Clássica';
        btn.className = 'btn-toggle-version mobile';
    }
    renderFluxograma(gerenciador);
    showToast(`📱 Versão ${grid.classList.contains('modo-mobile') ? 'Mobile' : 'Clássica'} ativada!`, 'info');
};

// PDF
window.gerarPDFHandler = function() {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Selecione um aluno primeiro!', 'error');
        return;
    }

    const curso = aluno.curso || 'bmat';
    const curriculo = getCurriculo(curso);
    const progresso = gerenciador.getProgressoAtivo();
    const cursoLabel = curso === 'bcet' ? 'BCET - Itinerário Matemática (PPC 2025)' : 'BMAT (PPC 2013)';

    const linhas = [];
    const separador = '='.repeat(60);

    linhas.push('RELATÓRIO ACADÊMICO');
    linhas.push(separador);
    linhas.push(`Aluno: ${aluno.nome}`);
    if (aluno.matricula) linhas.push(`Matrícula: ${aluno.matricula}`);
    linhas.push(`Curso: ${cursoLabel}`);
    linhas.push(`Progresso: ${progresso ? `${progresso.done}/${progresso.total} (${progresso.pct}%)` : '0/0 (0%)'}`);
    if (progresso && progresso.planned > 0) linhas.push(`Planejadas: ${progresso.planned} disciplinas`);
    linhas.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    linhas.push('');

    // Disciplinas por semestre
    linhas.push('DISCIPLINAS POR SEMESTRE');
    linhas.push(separador);

    for (const semestre of curriculo) {
        let temDisciplinas = false;
        for (const disc of semestre.disciplinas) {
            const codigo = disc.codigo;
            if (disc.isOptativa) {
                if (aluno.optativas[codigo]) {
                    temDisciplinas = true;
                    break;
                }
            } else {
                const status = aluno.progresso[codigo]?.status || 'not-started';
                if (status !== 'not-started') {
                    temDisciplinas = true;
                    break;
                }
            }
        }
        if (!temDisciplinas) continue;

        linhas.push(`\n${semestre.nome}:`);
        for (const disc of semestre.disciplinas) {
            let codigo = disc.codigo;
            let nome = getNomeDisciplina(codigo);
            let status = 'not-started';
            let emoji = '  ';
            let badge = '';

            if (disc.isOptativa) {
                const optCod = aluno.optativas[codigo];
                if (optCod) {
                    codigo = optCod;
                    nome = getNomeDisciplina(optCod) || optCod;
                    const optStatus = aluno.progresso[optCod]?.status || 'not-started';
                    status = optStatus;
                    if (status === 'done') { emoji = '[X]';
                        badge = ' (optativa)'; } else if (status === 'pending') { emoji = '[~]';
                        badge = ' (optativa)'; } else if (status === 'planned') { emoji = '[P]';
                        badge = ' (optativa)'; }
                } else {
                    emoji = '[ ]';
                    nome = 'Optativa (não selecionada)';
                }
            } else {
                status = aluno.progresso[codigo]?.status || 'not-started';
                if (status === 'done') { emoji = '[X]'; } else if (status === 'pending') { emoji = '[~]'; } else if (
                    status === 'planned') { emoji = '[P]'; } else { emoji = '[ ]'; }

                const isEquiv = aluno.equiv && aluno.equiv[codigo];
                if (isEquiv && status === 'done') {
                    const equivInfo = aluno.equiv[codigo];
                    badge = ` (equiv. via ${equivInfo.via})`;
                }
            }

            const horas = disc.horas || '68h';
            linhas.push(`  ${emoji} ${codigo} - ${nome} (${horas})${badge}`);
        }
    }

    // Equivalências
    if (Object.keys(aluno.equiv || {}).length > 0) {
        linhas.push('');
        linhas.push('EQUIVALENCIAS APLICADAS');
        linhas.push(separador);
        for (const [codigo, info] of Object.entries(aluno.equiv)) {
            linhas.push(`  ${codigo} -> via ${info.via}`);
        }
    }

    // Optativas
    const optativasSelecionadas = Object.entries(aluno.optativas || {});
    if (optativasSelecionadas.length > 0) {
        linhas.push('');
        linhas.push('OPTATIVAS SELECIONADAS');
        linhas.push(separador);
        for (const [slot, codigo] of optativasSelecionadas) {
            const nome = getNomeDisciplina(codigo) || codigo;
            const status = aluno.progresso[codigo]?.status || 'not-started';
            const emoji = status === 'done' ? '[X]' : status === 'planned' ? '[P]' : '[~]';
            linhas.push(`  ${slot}: ${codigo} - ${nome} ${emoji}`);
        }
    }

    // Pendentes
    const pendentes = [];
    for (const semestre of curriculo) {
        for (const disc of semestre.disciplinas) {
            const codigo = disc.codigo;
            if (disc.isOptativa) {
                const optCod = aluno.optativas[codigo];
                if (!optCod) {
                    pendentes.push({ codigo: codigo, nome: 'Optativa (não selecionada)', horas: disc.horas || '68h' });
                } else {
                    const status = aluno.progresso[optCod]?.status || 'not-started';
                    if (status === 'not-started') {
                        pendentes.push({ codigo: optCod, nome: getNomeDisciplina(optCod) || optCod, horas: disc.horas ||
                                '68h' });
                    }
                }
            } else {
                const status = aluno.progresso[codigo]?.status || 'not-started';
                if (status === 'not-started') {
                    pendentes.push({ codigo: codigo, nome: getNomeDisciplina(codigo) || codigo, horas: disc.horas ||
                            '68h' });
                }
            }
        }
    }

    if (pendentes.length > 0) {
        linhas.push('');
        linhas.push('DISCIPLINAS PENDENTES');
        linhas.push(separador);
        for (const p of pendentes) {
            linhas.push(`  [ ] ${p.codigo} - ${p.nome} (${p.horas})`);
        }
    }

    // Legenda
    linhas.push('');
    linhas.push(separador);
    linhas.push('LEGENDA');
    linhas.push(separador);
    linhas.push('  [X]  = Disciplina já cursada');
    linhas.push('  [P]  = Disciplina planejada para o próximo semestre');
    linhas.push('  [~]  = Disciplina em andamento (cursando)');
    linhas.push('  [ ]  = Disciplina pendente (não cursada)');
    linhas.push('  optativa = Disciplina optativa');
    linhas.push('  equiv. via = Equivalência aplicada (cursou através de outra disciplina)');

    linhas.push('');
    linhas.push(separador);
    linhas.push(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`);
    linhas.push('Gerenciador de Alunos - BMAT/BCET');

    const texto = linhas.join('\n');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxWidth = pageWidth - 2 * margin;
    const lineHeight = 5.5;
    let y = margin;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const lines = texto.split('\n');
    for (const line of lines) {
        const wrapped = pdf.splitTextToSize(line, maxWidth);
        for (const w of wrapped) {
            if (y + lineHeight > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
            pdf.text(w, margin, y);
            y += lineHeight;
        }
    }

    const nomeArquivo = `relatorio_${aluno.nome.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(nomeArquivo);

    showToast('📄 Relatório PDF gerado com sucesso!', 'success');
};

// Pré-matrícula
window.abrirPreMatriculaHandler = function() {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        return;
    }

    const planejaveis = gerenciador.obterDisciplinasPlanejaveis(
        aluno.id || gerenciador.alunoAtivoId
    );

    // Inicializa planejamento temporário
    planejamentoTemp = {};
    for (const codigo in aluno.progresso) {
        if (aluno.progresso[codigo]?.status === 'planned') {
            planejamentoTemp[codigo] = true;
        }
    }

    let html = `
        <div class="disciplines-list">
            <p style="font-size:14px;color:#666;margin-bottom:12px;">
                Selecione as disciplinas que você planeja cursar no próximo semestre:
            </p>
    `;

    // Obrigatórias
    html += `<div class="section-title">📚 DISCIPLINAS OBRIGATÓRIAS</div>`;

    if (planejaveis.obrigatorias.length === 0) {
        html += `<div class="empty-message">✅ Todas as disciplinas obrigatórias já foram cursadas!</div>`;
    } else {
        let currentSemestre = '';
        for (const disc of planejaveis.obrigatorias) {
            if (disc.semestre !== currentSemestre) {
                currentSemestre = disc.semestre;
                html += `<div class="semester-label">${currentSemestre}</div>`;
            }
            const checked = disc.jaPlanejada ? 'checked' : '';
            html += `
                <label class="discipline-item ${disc.jaPlanejada ? 'planned' : ''}">
                    <input type="checkbox" ${checked} 
                           onchange="window.togglePlanejamentoHandler('${disc.codigo}')" 
                           style="margin-right:8px;">
                    <strong>${disc.codigo}</strong> - ${disc.nome}
                    <span class="hours">${disc.horas}</span>
                    ${disc.jaPlanejada ? '<span class="planned-label">📌 Planejada</span>' : ''}
                </label>
            `;
        }
    }

    // Optativas
    html += `<div class="section-title">📌 OPTATIVAS DISPONÍVEIS</div>`;

    if (planejaveis.optativas.length === 0) {
        html += `<div class="empty-message">🎉 Todas as optativas disponíveis já estão alocadas!</div>`;
    } else {
        for (const opt of planejaveis.optativas) {
            const checked = opt.jaPlanejada ? 'checked' : '';
            html += `
                <label class="discipline-item optativa-item ${opt.jaPlanejada ? 'planned' : ''}">
                    <input type="checkbox" ${checked} 
                           onchange="window.togglePlanejamentoHandler('${opt.codigo}')" 
                           style="margin-right:8px;">
                    <strong>${opt.codigo}</strong> - ${opt.nome}
                    <span class="opt-label">optativa</span>
                    <span class="hours">68h</span>
                    ${opt.jaPlanejada ? '<span class="planned-label">📌 Planejada</span>' : ''}
                </label>
            `;
        }
    }

    const totalSelecionadas = Object.keys(planejamentoTemp).length;
    html += `
        </div>
        <div class="modal-actions">
            <button class="btn-save" onclick="window.salvarPlanejamentoHandler()">
                💾 Salvar planejamento (${totalSelecionadas} selecionadas)
            </button>
            <button class="btn-cancel" onclick="window.fecharPreMatriculaHandler()">Cancelar</button>
        </div>
        <div class="footer-note">
            💡 Disciplinas em <span style="color:#7b1fa2;font-weight:bold;">roxo claro</span> serão marcadas como "cursará no próximo semestre"
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'pre-matricula-modal';
    modal.id = 'preMatriculaModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>📋 Pré-matrícula</h2>
            <p class="subtitle">Planeje as disciplinas para o próximo semestre</p>
            ${html}
        </div>
    `;
    document.body.appendChild(modal);
};

window.togglePlanejamentoHandler = function(codigo) {
    const checkbox = event.target;
    if (checkbox.checked) {
        planejamentoTemp[codigo] = true;
    } else {
        delete planejamentoTemp[codigo];
    }

    const total = Object.keys(planejamentoTemp).length;
    const btn = document.querySelector('#preMatriculaModal .btn-save');
    if (btn) {
        btn.textContent = `💾 Salvar planejamento (${total} selecionadas)`;
    }
};

window.salvarPlanejamentoHandler = function() {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        return;
    }

    const codigos = Object.keys(planejamentoTemp);

    try {
        const resultado = gerenciador.salvarPlanejamento(
            aluno.id || gerenciador.alunoAtivoId,
            codigos
        );

        window.fecharPreMatriculaHandler();

        // Monta resumo
        let lista = [];
        if (resultado.obrigatorias.length > 0) {
            lista.push(`📚 Obrigatórias (${resultado.obrigatorias.length}):`);
            for (const codigo of resultado.obrigatorias) {
                lista.push(`  • ${codigo} - ${getNomeDisciplina(codigo)}`);
            }
        }
        if (resultado.optativas.length > 0) {
            lista.push(`\n📌 Optativas planejadas (${resultado.optativas.length}):`);
            for (const item of resultado.optativas) {
                lista.push(`  • ${item.slot}: ${item.codigo} - ${getNomeDisciplina(item.codigo)}`);
            }
        }

        const resumo = lista.join('\n');
        const total = resultado.obrigatorias.length + resultado.optativas.length;

        const confirmModal = document.createElement('div');
        confirmModal.className = 'confirm-modal';
        confirmModal.id = 'confirmModal';
        confirmModal.innerHTML = `
            <div class="modal-content">
                <h3>✅ Planejamento salvo!</h3>
                <div class="summary">
                    <p>📌 <strong>${total}</strong> disciplina(s) planejada(s):</p>
                    <div class="list">${resumo}</div>
                </div>
                <hr style="margin:12px 0;border-color:#e0e0e0;">
                <p class="question">❓ Você terminou de alocar todas as disciplinas do próximo semestre?</p>
                <div class="actions">
                    <button class="btn-yes" onclick="window.finalizarPreMatriculaHandler()">✅ Sim, terminar e gerar PDF</button>
                    <button class="btn-no" onclick="window.fecharConfirmModalHandler()">❌ Não, continuar editando</button>
                </div>
                <p class="footer-note">💡 Se escolher "Sim", o PDF será gerado automaticamente.</p>
            </div>
        `;
        document.body.appendChild(confirmModal);

        planejamentoTemp = {};
        showToast(`✅ ${total} disciplina(s) planejada(s)!`, 'success');
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.finalizarPreMatriculaHandler = function() {
    window.fecharConfirmModalHandler();
    showToast('📄 Gerando PDF com o planejamento...', 'info');
    setTimeout(() => { window.gerarPDFHandler(); }, 500);
};

window.fecharPreMatriculaHandler = function() {
    const modal = document.getElementById('preMatriculaModal');
    if (modal) modal.remove();
};

window.fecharConfirmModalHandler = function() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.remove();
};

// Verificação de correções
window.verificarCorrecoesHandler = function() {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        return;
    }

    const pendentes = gerenciador.verificarCorrecoes(
        aluno.id || gerenciador.alunoAtivoId
    );

    const preview = document.getElementById('importPreview');

    if (pendentes.total === 0) {
        preview.innerHTML = `<div class="success">✅ Disciplinas processadas com sucesso!</div>`;
        preview.innerHTML += renderOpcoesPosValidacao();
        showToast('✅ Tudo correto!', 'success');
        return;
    }

    // Remove conteúdo anterior e mostra erros
    const successDiv = preview.querySelector('.success');
    if (successDiv) {
        preview.innerHTML = successDiv.outerHTML + renderErrosCorrecao(pendentes);
    } else {
        preview.innerHTML = renderErrosCorrecao(pendentes);
    }
    showToast(`❌ ${pendentes.total} erro(s) encontrado(s)`, 'error');
};

// Export/Import
window.exportAllDataHandler = function() {
    const data = gerenciador.exportar();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Dados exportados!', 'success');
};

window.importAllDataHandler = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const count = gerenciador.importar(data);
            showToast(`📥 Importados ${count} alunos!`, 'success');
        } catch (err) {
            showToast(`❌ Erro ao importar: ${err.message}`, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

window.clearAllDataHandler = function() {
    if (!confirm('⚠️ Tem certeza que deseja apagar TODOS os dados?')) return;
    gerenciador.limpar();
    showToast('🗑️ Todos os dados foram removidos.', 'info');
};

// Toast
function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(toastTimeout);
    el.onclick = function() { el.classList.remove('show');
        clearTimeout(toastTimeout); };
    toastTimeout = setTimeout(() => el.classList.remove('show'), 4000);
}

let toastTimeout;

// ============================================================
// EXPOSIÇÃO GLOBAL (para chamadas inline no HTML)
// ============================================================

// Alunos
window.addAlunoCompleto = window.adicionarAlunoHandler;
window.addMultipleAlunos = window.adicionarMultiplosHandler;
window.deleteAluno = window.removerAlunoHandler;
window.selectAluno = window.selecionarAlunoHandler;
window.selecionarCurso = window.selecionarCursoHandler;

// Disciplinas
window.toggleDiscipline = window.toggleDisciplinaHandler;

// Optativas
window.closeOptModal = closeOptModal;
window.clearOptativa = window.clearOptativaHandler;
window.selecionarOptativa = window.selecionarOptativaHandler;

// Quebra
window.abrirModalQuebra = window.abrirModalQuebraHandler;
window.confirmarQuebra = window.confirmarQuebraHandler;
window.removerQuebra = window.removerQuebraHandler;
window.fecharModalQuebra = fecharModalQuebra;

// Importação
window.importarHistorico = window.importarHistoricoHandler;

// Pré-matrícula
window.abrirPreMatricula = window.abrirPreMatriculaHandler;
window.togglePlanejamento = window.togglePlanejamentoHandler;
window.salvarPlanejamento = window.salvarPlanejamentoHandler;
window.finalizarPreMatricula = window.finalizarPreMatriculaHandler;
window.fecharPreMatricula = window.fecharPreMatriculaHandler;
window.fecharConfirmModal = window.fecharConfirmModalHandler;

// Verificação
window.verificarCorrecoes = window.verificarCorrecoesHandler;

// Export/Import
window.exportAllData = window.exportAllDataHandler;
window.importAllData = window.importAllDataHandler;
window.clearAllData = window.clearAllDataHandler;

// PDF
window.gerarPDFVisual = window.gerarPDFHandler;

// Versão
window.alternarVersao = window.alternarVersaoHandler;

// Toast
window.showToast = showToast;