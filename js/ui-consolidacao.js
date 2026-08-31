// ============================================================
// UI - CONSOLIDAÇÃO DE OFERTAS
// ============================================================

let consolidador = null;

function initConsolidacao(gerenciador) {
    consolidador = new ConsolidadorOfertas(gerenciador);
    
    gerenciador.adicionarListener((evento, dados) => {
        if (['adicionar', 'remover', 'alterarProgresso', 'selecionarOptativa', 
             'removerOptativa', 'importarHistorico', 'salvarPlanejamento',
             'adicionarOptativaPlanejada', 'removerOptativaPlanejada',
             'concederQuebra', 'removerQuebra'].includes(evento)) {
            setTimeout(() => {
                consolidador.recalcular();
                renderConsolidacao();
                updateConsolidacaoBadge();
            }, 100);
        }
    });
}

function renderConsolidacao() {
    const container = document.getElementById('consolidacaoContent');
    if (!container) return;

    if (!consolidador) {
        container.innerHTML = '<div class="no-aluno"><h3>⏳ Carregando...</h3></div>';
        return;
    }

    const disciplinas = consolidador.getDisciplinas();
    const totalAlunos = consolidador.gerenciador.getTotalAlunos();

    if (totalAlunos === 0) {
        container.innerHTML = `
            <div class="no-aluno" style="padding:40px 20px;">
                <h3>👨‍🎓 Nenhum aluno cadastrado</h3>
                <p>Adicione alunos e importe seus históricos para ver a consolidação.</p>
            </div>
        `;
        return;
    }

    if (disciplinas.length === 0) {
        container.innerHTML = `
            <div class="no-aluno" style="padding:40px 20px;">
                <h3>✅ Todas as disciplinas estão cursadas!</h3>
                <p>Nenhum aluno tem disciplinas pendentes.</p>
            </div>
        `;
        return;
    }

    const selecionadas = consolidador.getOfertasSelecionadas();
    const naoSelecionadas = consolidador.getOfertasNaoSelecionadas();

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
            <div>
                <span style="font-size:16px;font-weight:bold;color:#1a237e;">📊 Consolidação de Ofertas</span>
                <span style="margin-left:10px;font-size:13px;color:#666;">
                    ${disciplinas.length} disciplina(s) com demanda · ${totalAlunos} aluno(s)
                </span>
            </div>
            <div class="consolidacao-acoes">
                <button class="btn-relatorio" onclick="gerarRelatorioConsolidado()" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#1a237e;color:white;">
                    📄 Gerar Relatório
                </button>
                <button class="btn-ofertar-todas" onclick="toggleAllOfertas(true)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#4caf50;color:white;">
                    ✅ Oferecer todas
                </button>
                <button class="btn-nao-ofertar-todas" onclick="toggleAllOfertas(false)" style="padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;background:#ef5350;color:white;">
                    ❌ Não oferecer todas
                </button>
            </div>
        </div>
    `;

    html += `
        <div class="consolidacao-tabela" style="background:#f8f9fa;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
            <div style="display:grid;grid-template-columns:3fr 1fr 2fr 1fr;background:#1a237e;color:white;padding:10px 14px;font-weight:bold;font-size:13px;gap:8px;">
                <div>Disciplina</div>
                <div style="text-align:center;">Alunos</div>
                <div>Lista de Alunos</div>
                <div style="text-align:center;">Oferecer?</div>
            </div>
    `;

    for (const disc of disciplinas) {
        const isOfertada = consolidador.ofertas[disc.codigo] !== false;
        const alunos = disc.alunos || [];
        const bgColor = isOfertada ? '#e8f5e9' : '#ffebee';

        let alunosStr = alunos.map(a => a.nome).join(', ');
        let maisTexto = '';
        if (alunos.length > 5) {
            const primeiros = alunos.slice(0, 5).map(a => a.nome).join(', ');
            alunosStr = primeiros;
            maisTexto = ` +${alunos.length - 5} outros`;
        }

        html += `
            <div style="display:grid;grid-template-columns:3fr 1fr 2fr 1fr;padding:10px 14px;background:${bgColor};border-bottom:1px solid #e0e0e0;gap:8px;align-items:center;font-size:13px;">
                <div>
                    <strong>${disc.codigo}</strong>
                    <span style="color:#666;font-size:12px;display:block;">${disc.nome}</span>
                    <span style="font-size:10px;color:#999;">${disc.semestre}</span>
                </div>
                <div style="text-align:center;font-weight:bold;font-size:18px;color:#1a237e;">
                    ${disc.total}
                </div>
                <div style="font-size:12px;color:#333;word-break:break-word;">
                    ${alunosStr || '-'}
                    ${maisTexto ? `<span style="color:#666;font-size:10px;">${maisTexto}</span>` : ''}
                    ${alunos.length > 5 ? `<span style="color:#666;font-size:10px;display:block;">(${alunos.length} total)</span>` : ''}
                </div>
                <div style="text-align:center;">
                    <button class="btn-oferta" onclick="toggleOferta('${disc.codigo}')" 
                            style="padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;min-width:80px;background:${isOfertada ? '#4caf50' : '#ef5350'};color:white;">
                        ${isOfertada ? '✅ Oferecer' : '❌ Não oferecer'}
                    </button>
                </div>
            </div>
        `;
    }

    html += `
        </div>
    `;

    html += `
        <div style="margin-top:16px;padding:12px 16px;background:#e3f2fd;border-radius:8px;display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;">
            <div>
                <span style="font-weight:bold;color:#0d47a1;">✅ Oferecidas:</span>
                <span style="font-weight:bold;font-size:16px;color:#2e7d32;">${selecionadas.length}</span>
            </div>
            <div>
                <span style="font-weight:bold;color:#0d47a1;">❌ Não oferecidas:</span>
                <span style="font-weight:bold;font-size:16px;color:#c62828;">${naoSelecionadas.length}</span>
            </div>
            <div>
                <span style="font-weight:bold;color:#0d47a1;">📚 Total com demanda:</span>
                <span style="font-weight:bold;font-size:16px;color:#1a237e;">${disciplinas.length}</span>
            </div>
            <div>
                <span style="font-weight:bold;color:#0d47a1;">👨‍🎓 Total de alunos:</span>
                <span style="font-weight:bold;font-size:16px;color:#1a237e;">${totalAlunos}</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function toggleOferta(codigo) {
    if (!consolidador) return;
    consolidador.toggleOferta(codigo);
    renderConsolidacao();
}

function toggleAllOfertas(status) {
    if (!consolidador) return;
    const disciplinas = consolidador.getDisciplinas();
    for (const disc of disciplinas) {
        consolidador.setOferta(disc.codigo, status);
    }
    renderConsolidacao();
    const msg = status ? '✅ Todas as disciplinas marcadas como oferecidas!' : '❌ Todas as disciplinas marcadas como não oferecidas!';
    showToast(msg, status ? 'success' : 'info');
}

function gerarRelatorioConsolidado() {
    if (!consolidador) {
        showToast('❌ Nenhum dado consolidado disponível.', 'error');
        return;
    }

    const disciplinas = consolidador.getDisciplinas();
    if (disciplinas.length === 0) {
        showToast('⚠️ Nenhuma disciplina com demanda para gerar relatório.', 'warning');
        return;
    }

    const texto = consolidador.gerarRelatorio();

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

    const nomeArquivo = `relatorio_ofertas_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(nomeArquivo);
    showToast('📄 Relatório de ofertas gerado com sucesso!', 'success');
}

function updateConsolidacaoBadge() {
    if (consolidador) {
        const count = consolidador.getDisciplinas().length;
        const badge = document.getElementById('consolidacaoBadge');
        if (badge) badge.textContent = count;
    }
}

window.initConsolidacao = initConsolidacao;
window.renderConsolidacao = renderConsolidacao;
window.toggleOferta = toggleOferta;
window.toggleAllOfertas = toggleAllOfertas;
window.gerarRelatorioConsolidado = gerarRelatorioConsolidado;
window.updateConsolidacaoBadge = updateConsolidacaoBadge;