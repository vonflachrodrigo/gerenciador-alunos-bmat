// ============================================================
// APP - ORQUESTRAÇÃO DA APLICAÇÃO
// ============================================================

const gerenciador = new GerenciadorAlunos();

// Estado dos modais
let modalContexto = null;
let quebraContexto = null;
let planejamentoTemp = {};

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    gerenciador.carregar();

    document.getElementById('cursoBMAT').className = gerenciador.cursoAtivo === 'bmat' ? 'active' : '';
    document.getElementById('cursoBCET').className = gerenciador.cursoAtivo === 'bcet' ? 'active' : '';

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

    gerenciador.adicionarListener((evento, dados) => {
        switch (evento) {
            case 'adicionar':
            case 'adicionarMultiplos':
            case 'remover':
            case 'selecionar':
            case 'alterarProgresso':
            case 'selecionarOptativa':
            case 'removerOptativa':
            case 'adicionarOptativaPlanejada':
            case 'removerOptativaPlanejada':
            case 'limparOptativasPlanejadas':
            case 'moverOptativa':
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

    atualizarUI();

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            fecharModalOptativa();
            fecharModalQuebra();
            fecharPreMatricula();
            fecharConfirmModal();
            fecharModalStatusOptativa();
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

    document.getElementById('cursoBMAT').className = gerenciador.cursoAtivo === 'bmat' ? 'active' : '';
    document.getElementById('cursoBCET').className = gerenciador.cursoAtivo === 'bcet' ? 'active' : '';
}

function updateAlunoCount() {
    document.getElementById('alunoCount').textContent = gerenciador.getTotalAlunos();
}

// ============================================================
// TOAST
// ============================================================

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
// HANDLERS - ALUNOS
// ============================================================

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

window.selecionarCursoHandler = function(curso) {
    try {
        gerenciador.selecionarCurso(curso);
        showToast(`📚 Curso ${curso === 'bmat' ? 'BMAT (PPC 2013)' : 'BCET - Matemática (PPC 2025)'} selecionado`, 'info');
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

// ============================================================
// HANDLERS - DISCIPLINAS
// ============================================================

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
            return;
        } else if (resultado.acao === 'abrirQuebra') {
            abrirModalQuebra(codigo);
            return;
        } else if (resultado.status === 'erro') {
            showToast(resultado.mensagem, 'error');
            return;
        } else if (resultado.isPlanejada) {
            showToast(resultado.mensagem, 'success');
            atualizarUI();
            return;
        } else {
            showToast(resultado.mensagem, 'info');
            atualizarUI();
            return;
        }
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

// ============================================================
// OPTATIVAS - MODAL DE SELEÇÃO (APENAS 1 ETAPA)
// ============================================================

function abrirModalOptativa(slotCodigo) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        return;
    }

    modalContexto = { slotCodigo };

    const infoSlot = gerenciador.getInfoSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);
    const optativas = gerenciador.getOptativasParaSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);

    const labels = {
        'OPT_BCET_1': 'Optativa I (5º Semestre BCET)',
        'OPT_BCET_2': 'Optativa II (6º Semestre BCET)',
        'OPT1': 'Optativa I (6º Semestre BMAT)',
        'OPT2': 'Optativa II (7º Semestre BMAT)',
        'OPT3': 'Optativa III (8º Semestre BMAT)',
        'OPT4': 'Optativa IV (8º Semestre BMAT)',
        'OPT5': 'Optativa V (8º Semestre BMAT)'
    };
    const optLabel = labels[slotCodigo] || 'Optativa';

    document.getElementById('optModalTitle').textContent = `📌 ${optLabel}`;
    document.getElementById('optModalSub').textContent = `Aluno: ${aluno.nome}`;

    const list = document.getElementById('optList');
    list.innerHTML = '';

    // Renderiza o cabeçalho
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'grid-column:1/-1;margin-bottom:8px;font-weight:bold;color:#1a237e;';
    headerDiv.textContent = '🎯 Escolha a disciplina';
    list.appendChild(headerDiv);

    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'grid-column:1/-1;font-size:12px;color:#666;margin-bottom:8px;';
    infoDiv.textContent = infoSlot && infoSlot.temDisciplina ? 
        `Atual: ${infoSlot.disciplinaAtual} - ${getNomeDisciplina(infoSlot.disciplinaAtual)}` : 
        'Nenhuma disciplina selecionada';
    list.appendChild(infoDiv);

    let temDisponiveis = false;

    for (const opt of optativas) {
        const isSelected = opt.isAtual;
        const isAlocada = opt.isAlocada;
        const isPlanejada = opt.isPlanejada;
        const isValida = opt.isValida;
        const disponivel = opt.disponivel;

        const div = document.createElement('div');
        div.className = `opt-item ${isSelected ? 'selected' : ''}`;

        if (!disponivel && !isSelected) {
            div.style.opacity = '0.4';
            div.style.cursor = 'not-allowed';
            div.style.pointerEvents = 'none';
            if (isAlocada) {
                div.title = 'Já alocada em outro semestre';
                div.innerHTML = `
                    <span class="opt-code">${opt.codigo}</span>
                    ${opt.nome} ${opt.origem === 'bmat' ? '📐' : '📘'}
                    <span class="opt-pre">🔒 Já alocada</span>
                `;
            } else if (isPlanejada) {
                div.title = 'Já está na lista de planejadas';
                div.innerHTML = `
                    <span class="opt-code">${opt.codigo}</span>
                    ${opt.nome} ${opt.origem === 'bmat' ? '📐' : '📘'}
                    <span class="opt-pre">📌 Planejada</span>
                `;
            }
            list.appendChild(div);
            continue;
        }

        temDisponiveis = true;

        if (!isValida && !isSelected) {
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
            ${!isValida && !isSelected ? ' ⚠️' : ''}
        `;

        div.onclick = function() {
            if (isAlocada) {
                const slotAtual = gerenciador.getSlotDaOptativa(
                    gerenciador.alunoAtivoId, 
                    opt.codigo
                );
                if (!confirm(`⚠️ ${opt.codigo} já está alocada em ${slotAtual}.\n\nDeseja mover para ${slotCodigo}?`)) {
                    return;
                }
                try {
                    gerenciador.moverOptativa(
                        gerenciador.alunoAtivoId,
                        slotAtual,
                        slotCodigo
                    );
                    showToast(`🔄 ${opt.codigo} movida para ${slotCodigo}`, 'info');
                    fecharModalOptativa();
                    atualizarUI();
                } catch (error) {
                    showToast(`❌ ${error.message}`, 'error');
                }
                return;
            }

            // Seleciona a disciplina como "pending" (amarela)
            try {
                const resultado = gerenciador.selecionarOptativaCompleta(
                    gerenciador.alunoAtivoId,
                    slotCodigo,
                    opt.codigo,
                    'pending'
                );

                fecharModalOptativa();
                showToast(`🟡 ${opt.codigo} marcada como cursando!`, 'success');
                atualizarUI();
            } catch (error) {
                showToast(`❌ ${error.message}`, 'error');
            }
        };

        list.appendChild(div);
    }

    if (!temDisponiveis) {
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = 'grid-column:1/-1;text-align:center;padding:20px;color:#999;';
        msgDiv.innerHTML = `
            <p>⚠️ Nenhuma optativa disponível para seleção.</p>
            <p style="font-size:12px;">Todas as optativas já estão alocadas ou planejadas.</p>
        `;
        list.appendChild(msgDiv);
    }

    // Botão Cancelar
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'grid-column:1/-1;display:flex;gap:8px;margin-top:8px;justify-content:flex-end;';
    actionsDiv.innerHTML = `
        <button onclick="fecharModalOptativa()" class="btn-cancel" style="padding:8px 16px;border:none;border-radius:8px;font-weight:600;cursor:pointer;background:#e0e0e0;color:#333;">
            Cancelar
        </button>
    `;
    list.appendChild(actionsDiv);

    document.getElementById('optModal').classList.add('show');
}

function fecharModalOptativa() {
    const modal = document.getElementById('optModal');
    if (modal) {
        modal.classList.remove('show');
    }
    modalContexto = null;
}

window.fecharModalOptativa = function() {
    const modal = document.getElementById('optModal');
    if (modal) {
        modal.classList.remove('show');
    }
    modalContexto = null;
};

window.abrirModalOptativa = abrirModalOptativa;

document.getElementById('optModal').addEventListener('click', function(e) {
    if (e.target === this) fecharModalOptativa();
});

// ============================================================
// OPTATIVAS - MODAL DE STATUS (4 OPÇÕES)
// ============================================================

function abrirModalStatusOptativa(codigo, slotOpcional = null) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        return;
    }

    const nome = getNomeDisciplina(codigo) || codigo;

    const isPlanejada = (aluno.optativasPlanejadas || []).includes(codigo);
    let statusAtualLabel = '⏳ Não cursada';
    
    if (isPlanejada) {
        statusAtualLabel = '📌 Planejada';
    } else if (aluno.progresso[codigo]?.status === 'done') {
        statusAtualLabel = '✅ Cursada';
    } else if (aluno.progresso[codigo]?.status === 'pending') {
        statusAtualLabel = '🟡 Cursando';
    }

    const modalExistente = document.getElementById('modalStatusOptativa');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'modalStatusOptativa';
    modal.innerHTML = `
        <div class="modal" style="max-width:500px;">
            <h2>📌 ${codigo} - ${nome}</h2>
            <div class="subtitle">Status atual: ${statusAtualLabel}</div>
            <div style="margin:12px 0;font-size:13px;color:#666;">
                Escolha o novo status:
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #ddd;border-radius:8px;${aluno.progresso[codigo]?.status === 'pending' ? 'background:#ffeb3b;border-color:#f9a825;' : ''}" onclick="confirmarStatusOptativa('${codigo}','pending')">
                    <div style="font-size:16px;">🟡 Cursando</div>
                    <div style="font-size:11px;color:#666;">Disciplina em andamento</div>
                </div>
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #ddd;border-radius:8px;${aluno.progresso[codigo]?.status === 'done' ? 'background:#4caf50;color:white;border-color:#2e7d32;' : ''}" onclick="confirmarStatusOptativa('${codigo}','done')">
                    <div style="font-size:16px;">✅ Cursada</div>
                    <div style="font-size:11px;color:#666;">Disciplina já concluída</div>
                </div>
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #7b1fa2;border-radius:8px;${isPlanejada ? 'background:#7b1fa2;color:white;' : 'background:#f3e5f5;'}" onclick="confirmarStatusOptativa('${codigo}','planned')">
                    <div style="font-size:16px;">📌 Planejada</div>
                    <div style="font-size:11px;color:#666;">Disciplina para o próximo semestre</div>
                    ${isPlanejada ? '<div style="font-size:10px;">✅ Atual</div>' : ''}
                </div>
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #ddd;border-radius:8px;" onclick="confirmarStatusOptativa('${codigo}','not-started')">
                    <div style="font-size:16px;">⏳ Não cursada</div>
                    <div style="font-size:11px;color:#666;">Disciplina não iniciada</div>
                </div>
            </div>
            <div style="margin-top:12px;font-size:11px;color:#666;text-align:center;">
                💡 Se mudar para "Planejada", a disciplina vai para a lista abaixo do fluxograma.
            </div>
            <div class="modal-actions" style="margin-top:12px;">
                <button class="btn-cancel" onclick="fecharModalStatusOptativa()" style="padding:8px 16px;border:none;border-radius:8px;font-weight:600;cursor:pointer;background:#e0e0e0;color:#333;">
                    Fechar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === this) fecharModalStatusOptativa();
    });
}

function confirmarStatusOptativa(codigo, novoStatus) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        fecharModalStatusOptativa();
        return;
    }

    // Se for 'planned', verifica limite
    if (novoStatus === 'planned') {
        const planejadas = aluno.optativasPlanejadas || [];
        if (planejadas.length >= 5 && !planejadas.includes(codigo)) {
            showToast('⚠️ Máximo de 5 optativas planejadas atingido!', 'error');
            fecharModalStatusOptativa();
            return;
        }
    }

    const isPlanejada = (aluno.optativasPlanejadas || []).includes(codigo);
    const statusAtual = isPlanejada ? 'planned' : (aluno.progresso[codigo]?.status || 'not-started');
    
    if (statusAtual === novoStatus) {
        fecharModalStatusOptativa();
        showToast(`📌 ${codigo} já está com este status`, 'info');
        return;
    }

    const curso = aluno.curso || 'bmat';
    const slots = getSlotsOptativa(curso);

    try {
        // CASO 1: Estava planejada e quer mudar para outro status
        if (isPlanejada && novoStatus !== 'planned') {
            const index = aluno.optativasPlanejadas.indexOf(codigo);
            if (index !== -1) {
                aluno.optativasPlanejadas.splice(index, 1);
            }
            
            let slotVazio = null;
            for (const slot of slots) {
                if (!aluno.optativas[slot]) {
                    slotVazio = slot;
                    break;
                }
            }
            
            if (!slotVazio) {
                showToast('❌ Todos os slots de optativa estão ocupados!', 'error');
                fecharModalStatusOptativa();
                return;
            }
            
            aluno.optativas[slotVazio] = codigo;
            aluno.progresso[codigo] = {
                status: novoStatus,
                origem: 'manual',
                data: new Date().toISOString()
            };
            aluno.historico_completo[codigo] = {
                status: novoStatus,
                origem: curso,
                data: new Date().toISOString()
            };
            aluno.historico_optativas[slotVazio] = {
                codigo: codigo,
                origem: curso,
                data: new Date().toISOString()
            };
            
            const statusLabel = novoStatus === 'done' ? '✅ cursada' : 
                               novoStatus === 'pending' ? '🟡 cursando' : 
                               '⏳ não cursada';
            showToast(`📌 ${codigo} movida para ${slotVazio} como ${statusLabel}`, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        // CASO 2: Quer mudar para 'planned'
        if (novoStatus === 'planned') {
            let slotEncontrado = null;
            for (const slot of slots) {
                if (aluno.optativas[slot] === codigo) {
                    slotEncontrado = slot;
                    break;
                }
            }
            
            if (slotEncontrado) {
                delete aluno.optativas[slotEncontrado];
                delete aluno.historico_optativas[slotEncontrado];
            }
            
            if (aluno.progresso[codigo]) {
                delete aluno.progresso[codigo];
            }
            if (aluno.historico_completo[codigo]) {
                delete aluno.historico_completo[codigo];
            }
            
            if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];
            if (!aluno.optativasPlanejadas.includes(codigo)) {
                aluno.optativasPlanejadas.push(codigo);
            }
            
            showToast(`📌 ${codigo} adicionada às optativas planejadas!`, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        // CASO 3: Mudar para 'not-started'
        if (novoStatus === 'not-started') {
            let slotEncontrado = null;
            for (const slot of slots) {
                if (aluno.optativas[slot] === codigo) {
                    slotEncontrado = slot;
                    break;
                }
            }
            
            if (slotEncontrado) {
                delete aluno.optativas[slotEncontrado];
                delete aluno.historico_optativas[slotEncontrado];
            }
            
            if (aluno.progresso[codigo]) {
                delete aluno.progresso[codigo];
            }
            if (aluno.historico_completo[codigo]) {
                delete aluno.historico_completo[codigo];
            }
            
            showToast(`⏳ ${codigo} marcada como não cursada`, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        // CASO 4: Está em um slot e quer mudar para 'pending' ou 'done'
        let slotEncontrado = null;
        for (const slot of slots) {
            if (aluno.optativas[slot] === codigo) {
                slotEncontrado = slot;
                break;
            }
        }
        
        if (slotEncontrado) {
            aluno.progresso[codigo] = {
                status: novoStatus,
                origem: 'manual',
                data: new Date().toISOString()
            };
            aluno.historico_completo[codigo] = {
                status: novoStatus,
                origem: curso,
                data: new Date().toISOString()
            };
            
            const statusLabel = novoStatus === 'done' ? '✅ cursada' : 
                               novoStatus === 'pending' ? '🟡 cursando' : 
                               '⏳ não cursada';
            showToast(`📌 ${codigo} marcada como ${statusLabel}`, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        // CASO 5: Não está em slot nenhum - adiciona a um slot vazio
        let slotVazio2 = null;
        for (const slot of slots) {
            if (!aluno.optativas[slot]) {
                slotVazio2 = slot;
                break;
            }
        }
        
        if (slotVazio2) {
            aluno.optativas[slotVazio2] = codigo;
            aluno.progresso[codigo] = {
                status: novoStatus,
                origem: 'manual',
                data: new Date().toISOString()
            };
            aluno.historico_completo[codigo] = {
                status: novoStatus,
                origem: curso,
                data: new Date().toISOString()
            };
            aluno.historico_optativas[slotVazio2] = {
                codigo: codigo,
                origem: curso,
                data: new Date().toISOString()
            };
            
            const statusLabel = novoStatus === 'done' ? '✅ cursada' : 
                               novoStatus === 'pending' ? '🟡 cursando' : 
                               '⏳ não cursada';
            showToast(`📌 ${codigo} alocada em ${slotVazio2} como ${statusLabel}`, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        showToast('❌ Erro: não foi possível alocar a disciplina', 'error');
        fecharModalStatusOptativa();
        
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
        fecharModalStatusOptativa();
    }
}

function fecharModalStatusOptativa() {
    const modal = document.getElementById('modalStatusOptativa');
    if (modal) modal.remove();
}

window.abrirModalStatusOptativa = abrirModalStatusOptativa;
window.confirmarStatusOptativa = confirmarStatusOptativa;
window.fecharModalStatusOptativa = fecharModalStatusOptativa;

// ============================================================
// HANDLERS - OPTATIVAS PLANEJADAS
// ============================================================

window.removerOptativaPlanejadaHandler = function(codigo) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    const nome = getNomeDisciplina(codigo) || codigo;
    if (!confirm(`Remover ${codigo} - ${nome} da lista de planejadas?`)) return;

    try {
        gerenciador.removerOptativaPlanejada(aluno.id || gerenciador.alunoAtivoId, codigo);
        showToast(`🗑️ ${codigo} removida das optativas planejadas`, 'info');
        atualizarUI();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.limparOptativasPlanejadasHandler = function() {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    const planejadas = aluno.optativasPlanejadas || [];
    if (planejadas.length === 0) {
        showToast('Nenhuma optativa planejada para remover', 'info');
        return;
    }

    if (!confirm(`Remover TODAS as ${planejadas.length} optativas planejadas?`)) return;

    try {
        gerenciador.limparOptativasPlanejadas(aluno.id || gerenciador.alunoAtivoId);
        showToast(`🗑️ Todas as optativas planejadas foram removidas`, 'info');
        atualizarUI();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.removerOptativaDoSlotHandler = function(slotCodigo) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    const infoSlot = gerenciador.getInfoSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);
    if (!infoSlot || !infoSlot.temDisciplina) {
        showToast('⚠️ Nenhuma optativa neste slot', 'info');
        return;
    }

    if (!confirm(`Remover ${infoSlot.disciplinaAtual} de ${slotCodigo}?`)) return;

    try {
        gerenciador.removerOptativaDoSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);
        showToast(`🗑️ Optativa removida de ${slotCodigo}`, 'info');
        atualizarUI();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

// ============================================================
// HANDLERS - QUEBRA
// ============================================================

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

// ============================================================
// HANDLERS - PRÉ-MATRÍCULA
// ============================================================

window.abrirPreMatriculaHandler = function() {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Nenhum aluno selecionado.', 'error');
        return;
    }

    const planejaveis = gerenciador.obterDisciplinasPlanejaveis(
        aluno.id || gerenciador.alunoAtivoId
    );

    planejamentoTemp = {};
    
    for (const codigo in aluno.progresso) {
        if (aluno.progresso[codigo]?.status === 'planned') {
            planejamentoTemp[codigo] = true;
        }
    }
    for (const codigo of (aluno.optativasPlanejadas || [])) {
        planejamentoTemp[codigo] = true;
    }

    let html = `
        <div class="disciplines-list">
            <p style="font-size:14px;color:#666;margin-bottom:12px;">
                Selecione as disciplinas que você planeja cursar no próximo semestre:
            </p>
    `;

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

    html += `<div class="section-title">📌 OPTATIVAS DISPONÍVEIS</div>`;

    if (planejaveis.optativas.length === 0) {
        html += `<div class="empty-message">🎉 Todas as optativas disponíveis já estão alocadas ou planejadas!</div>`;
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
    const optativasSelecionadas = codigos.filter(c => isOptativaGlobal(c));

    if (optativasSelecionadas.length > 0) {
        const quantidadeModal = document.createElement('div');
        quantidadeModal.className = 'confirm-modal';
        quantidadeModal.id = 'quantidadeModal';
        quantidadeModal.innerHTML = `
            <div class="modal-content" style="max-width:450px;">
                <h3>📋 Quantas optativas?</h3>
                <p style="color:#666;margin:8px 0;">
                    Você selecionou <strong>${optativasSelecionadas.length}</strong> optativa(s).
                    <br>
                    Quantas você pretende cursar no próximo semestre?
                    <br>
                    <span style="font-size:12px;color:#999;">(máximo 5)</span>
                </p>
                <div style="display:flex;gap:8px;margin:12px 0;">
                    <input type="number" id="quantidadeOptativas" min="1" max="5" value="${Math.min(optativasSelecionadas.length, 5)}" 
                           style="flex:1;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;text-align:center;">
                </div>
                <div style="display:flex;gap:10px;">
                    <button onclick="window.confirmarQuantidadeOptativas()" style="flex:1;padding:12px;background:#1a237e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                        Confirmar
                    </button>
                    <button onclick="window.fecharQuantidadeModal()" style="padding:12px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;">
                        Cancelar
                    </button>
                </div>
                <div style="margin-top:8px;font-size:11px;color:#999;text-align:center;">
                    💡 As optativas com maior prioridade serão escolhidas
                </div>
            </div>
        `;
        document.body.appendChild(quantidadeModal);
        return;
    }

    try {
        const resultado = gerenciador.salvarPlanejamento(
            aluno.id || gerenciador.alunoAtivoId,
            codigos
        );

        window.fecharPreMatriculaHandler();
        planejamentoTemp = {};

        const total = resultado.obrigatorias.length + resultado.optativas.length;
        let msg = `✅ ${total} disciplina(s) planejada(s)!`;
        if (resultado.optativas.length > 0) {
            msg += ` 📌 ${resultado.optativas.length} optativa(s)`;
        }
        showToast(msg, 'success');
        atualizarUI();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.confirmarQuantidadeOptativas = function() {
    const input = document.getElementById('quantidadeOptativas');
    const quantidade = parseInt(input.value);

    if (isNaN(quantidade) || quantidade < 1 || quantidade > 5) {
        showToast('❌ Digite um número entre 1 e 5', 'error');
        return;
    }

    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    const codigos = Object.keys(planejamentoTemp);
    const optativasSelecionadas = codigos.filter(c => isOptativaGlobal(c));

    if (quantidade > optativasSelecionadas.length) {
        showToast(`❌ Você só selecionou ${optativasSelecionadas.length} optativa(s)`, 'error');
        return;
    }

    window.fecharQuantidadeModal();

    const prioridadeModal = document.createElement('div');
    prioridadeModal.className = 'confirm-modal';
    prioridadeModal.id = 'prioridadeModal';
    
    let prioridadeHtml = `
        <div class="modal-content" style="max-width:500px;">
            <h3>📌 Ordem de prioridade</h3>
            <p style="color:#666;margin:8px 0;">
                Ordene as optativas por preferência (1 = maior prioridade):
                <br>
                <span style="font-size:12px;color:#999;">As ${quantidade} primeiras serão planejadas</span>
            </p>
            <div id="listaPrioridade" style="display:flex;flex-direction:column;gap:4px;margin:12px 0;max-height:300px;overflow-y:auto;">
    `;

    optativasSelecionadas.forEach((codigo, index) => {
        const nome = getNomeDisciplina(codigo) || codigo;
        prioridadeHtml += `
            <div class="priority-item" draggable="true" data-codigo="${codigo}" 
                 style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f5f5f5;border-radius:6px;cursor:grab;border:2px solid #e0e0e0;">
                <span style="font-weight:bold;color:#1a237e;min-width:30px;">${index + 1}</span>
                <span style="flex:1;"><strong>${codigo}</strong> - ${nome}</span>
                <span style="font-size:12px;color:#666;">↕ arraste</span>
            </div>
        `;
    });

    prioridadeHtml += `
            </div>
            <div style="display:flex;gap:10px;margin-top:8px;">
                <button onclick="window.confirmarPrioridadeOptativas(${quantidade})" style="flex:1;padding:12px;background:#1a237e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                    ✅ Confirmar
                </button>
                <button onclick="window.fecharPrioridadeModal()" style="padding:12px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;">
                    Cancelar
                </button>
            </div>
            <div style="margin-top:8px;font-size:11px;color:#999;text-align:center;">
                💡 Arraste os itens para reordenar
            </div>
        </div>
    `;

    prioridadeModal.innerHTML = prioridadeHtml;
    document.body.appendChild(prioridadeModal);
    setupDragAndDrop();
};

function setupDragAndDrop() {
    const items = document.querySelectorAll('.priority-item');
    let draggedItem = null;

    items.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            this.style.opacity = '0.5';
        });

        item.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
        });

        item.addEventListener('drop', function(e) {
            e.preventDefault();
            if (draggedItem && this !== draggedItem) {
                const parent = this.parentNode;
                const children = Array.from(parent.children);
                const fromIndex = children.indexOf(draggedItem);
                const toIndex = children.indexOf(this);
                
                if (fromIndex < toIndex) {
                    parent.insertBefore(draggedItem, this.nextSibling);
                } else {
                    parent.insertBefore(draggedItem, this);
                }
                
                updatePriorityNumbers();
            }
        });
    });
}

function updatePriorityNumbers() {
    const items = document.querySelectorAll('.priority-item');
    items.forEach((item, index) => {
        const numberSpan = item.querySelector('span:first-child');
        if (numberSpan) {
            numberSpan.textContent = index + 1;
        }
    });
}

window.confirmarPrioridadeOptativas = function(quantidade) {
    const items = document.querySelectorAll('.priority-item');
    const prioridade = [];
    items.forEach(item => {
        prioridade.push(item.dataset.codigo);
    });

    const selecionadas = prioridade.slice(0, quantidade);

    window.fecharPrioridadeModal();

    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    const codigos = Object.keys(planejamentoTemp);
    
    const codigosFinais = codigos.filter(c => {
        if (isOptativaGlobal(c)) {
            return selecionadas.includes(c);
        }
        return true;
    });

    try {
        const resultado = gerenciador.salvarPlanejamento(
            aluno.id || gerenciador.alunoAtivoId,
            codigosFinais,
            selecionadas
        );

        window.fecharPreMatriculaHandler();
        planejamentoTemp = {};

        const total = resultado.obrigatorias.length + resultado.optativas.length;
        let msg = `✅ ${total} disciplina(s) planejada(s)!`;
        if (resultado.optativas.length > 0) {
            msg += ` 📌 ${resultado.optativas.length} optativa(s) priorizada(s)`;
        }
        showToast(msg, 'success');
        atualizarUI();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.fecharQuantidadeModal = function() {
    const modal = document.getElementById('quantidadeModal');
    if (modal) modal.remove();
};

window.fecharPrioridadeModal = function() {
    const modal = document.getElementById('prioridadeModal');
    if (modal) modal.remove();
};

window.fecharPreMatriculaHandler = function() {
    const modal = document.getElementById('preMatriculaModal');
    if (modal) modal.remove();
    planejamentoTemp = {};
};

// ============================================================
// HANDLERS - IMPORTAÇÃO
// ============================================================

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

        const regex = /(\d{4}\.\d)\s+([A-ZÇÃÕÁÉÍÓÚÂÊÎÔÛÀ\s\'\-]+?)\s+(APR|REP|DISPCN|DISP|MATR|REPF|REPMF|TRANC|TRTAL)\s+([A-Z0-9.]+)\s+(\d+)\s+([\d.]+|--)\s+([\d.]+)/gi;

        const todasOcorrencias = [];
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

// ============================================================
// HANDLERS - VERIFICAÇÃO DE CORREÇÕES
// ============================================================

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

    const successDiv = preview.querySelector('.success');
    if (successDiv) {
        preview.innerHTML = successDiv.outerHTML + renderErrosCorrecao(pendentes);
    } else {
        preview.innerHTML = renderErrosCorrecao(pendentes);
    }
    showToast(`❌ ${pendentes.total} erro(s) encontrado(s)`, 'error');
};

// ============================================================
// HANDLERS - EXPORT/IMPORT
// ============================================================

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

// ============================================================
// HANDLERS - PDF
// ============================================================

window.gerarPDFHandler = function() {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('❌ Selecione um aluno primeiro!', 'error');
        return;
    }

    const curso = aluno.curso || 'bmat';
    const curriculo = getCurriculo(curso);
    const progresso = gerenciador.getProgressoAtivo();
    const cursoLabel = curso === 'bcet' ? 'BCET - Itinerario Matematica (PPC 2025)' : 'BMAT (PPC 2013)';
    const stats = gerenciador.getEstatisticasOptativas(gerenciador.alunoAtivoId);

    const linhas = [];
    const separador = '='.repeat(60);

    linhas.push('RELATORIO ACADEMICO');
    linhas.push(separador);
    linhas.push(`Aluno: ${aluno.nome}`);
    if (aluno.matricula) linhas.push(`Matricula: ${aluno.matricula}`);
    linhas.push(`Curso: ${cursoLabel}`);
    linhas.push(`Progresso: ${progresso ? `${progresso.done}/${progresso.total} (${progresso.pct}%)` : '0/0 (0%)'}`);
    if (progresso && progresso.planned > 0) linhas.push(`Planejadas: ${progresso.planned} disciplinas`);
    linhas.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    linhas.push('');

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
                    nome = 'Optativa (nao selecionada)';
                }
            } else {
                status = aluno.progresso[codigo]?.status || 'not-started';
                if (status === 'done') { emoji = '[X]'; } else if (status === 'pending') { emoji = '[~]'; } else if (
                    status === 'planned') { emoji = '[P]'; } else { emoji = '[ ]'; }
            }

            const horas = disc.horas || '68h';
            linhas.push(`  ${emoji} ${codigo} - ${nome} (${horas})${badge}`);
        }
    }

    linhas.push('');
    linhas.push('RESUMO DE OPTATIVAS');
    linhas.push(separador);

    if (stats) {
        linhas.push(`Total de optativas necessarias: ${stats.totalNecessario}`);
        linhas.push(`Optativas ja cursadas: ${stats.cursadas}`);
        linhas.push(`Optativas planejadas: ${stats.planejadas}`);
        linhas.push(`Optativas faltando cursar: ${stats.faltando} ${stats.faltando === 0 ? '(OK)' : '(ATENCAO)'}`);
        linhas.push('');

        if (stats.planejadasLista && stats.planejadasLista.length > 0) {
            linhas.push('Optativas Planejadas (Proximo Semestre):');
            stats.planejadasLista.forEach((codigo, index) => {
                const nome = getNomeDisciplina(codigo) || codigo;
                linhas.push(`  [P] ${codigo} - ${nome} (Prioridade ${index + 1})`);
            });
            linhas.push('');
        }

        if (stats.cursadasLista && stats.cursadasLista.length > 0) {
            linhas.push('Optativas ja cursadas:');
            stats.cursadasLista.forEach(codigo => {
                const nome = getNomeDisciplina(codigo) || codigo;
                linhas.push(`  [X] ${codigo} - ${nome}`);
            });
            linhas.push('');
        }

        if (stats.faltando > 0) {
            linhas.push(`ATENCAO: Voce ainda precisa cursar ${stats.faltando} optativa(s) para concluir o curso.`);
        } else if (stats.concluido) {
            linhas.push('Todas as optativas foram cumpridas!');
        }
    }

    if (Object.keys(aluno.equiv || {}).length > 0) {
        linhas.push('');
        linhas.push('APENDICE - EQUIVALENCIAS APLICADAS');
        linhas.push(separador);
        for (const [codigo, info] of Object.entries(aluno.equiv)) {
            linhas.push(`  ${codigo} -> via ${info.via}`);
        }
    }

    linhas.push('');
    linhas.push(separador);
    linhas.push('LEGENDA');
    linhas.push(separador);
    linhas.push('  [X]  = Disciplina ja cursada');
    linhas.push('  [P]  = Disciplina planejada para o proximo semestre');
    linhas.push('  [~]  = Disciplina em andamento (cursando)');
    linhas.push('  [ ]  = Disciplina pendente (nao cursada)');
    linhas.push('  optativa = Disciplina optativa');
    linhas.push('  equiv. via = Equivalencia aplicada (cursou atraves de outra disciplina)');

    linhas.push('');
    linhas.push(separador);
    linhas.push(`Relatorio gerado em ${new Date().toLocaleString('pt-BR')}`);
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

    showToast('PDF gerado com sucesso!', 'success');
};

// ============================================================
// HANDLER - VERSÃO
// ============================================================

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

// ============================================================
// EXPOSIÇÃO GLOBAL
// ============================================================

window.addAlunoCompleto = window.adicionarAlunoHandler;
window.addMultipleAlunos = window.adicionarMultiplosHandler;
window.deleteAluno = window.removerAlunoHandler;
window.selectAluno = window.selecionarAlunoHandler;
window.selecionarCurso = window.selecionarCursoHandler;

window.toggleDiscipline = window.toggleDisciplinaHandler;

window.abrirModalOptativa = abrirModalOptativa;
window.fecharModalOptativa = window.fecharModalOptativa;
window.removerOptativaDoSlot = window.removerOptativaDoSlotHandler;

window.removerOptativaPlanejada = window.removerOptativaPlanejadaHandler;
window.limparOptativasPlanejadas = window.limparOptativasPlanejadasHandler;
window.abrirModalStatusOptativa = abrirModalStatusOptativa;
window.confirmarStatusOptativa = confirmarStatusOptativa;
window.fecharModalStatusOptativa = fecharModalStatusOptativa;

window.abrirModalQuebra = window.abrirModalQuebraHandler;
window.confirmarQuebra = window.confirmarQuebraHandler;
window.removerQuebra = window.removerQuebraHandler;
window.fecharModalQuebra = fecharModalQuebra;

window.importarHistorico = window.importarHistoricoHandler;

window.abrirPreMatricula = window.abrirPreMatriculaHandler;
window.togglePlanejamento = window.togglePlanejamentoHandler;
window.salvarPlanejamento = window.salvarPlanejamentoHandler;
window.confirmarQuantidadeOptativas = window.confirmarQuantidadeOptativas;
window.confirmarPrioridadeOptativas = window.confirmarPrioridadeOptativas;
window.fecharQuantidadeModal = window.fecharQuantidadeModal;
window.fecharPrioridadeModal = window.fecharPrioridadeModal;
window.fecharPreMatricula = window.fecharPreMatriculaHandler;

window.verificarCorrecoes = window.verificarCorrecoesHandler;

window.exportAllData = window.exportAllDataHandler;
window.importAllData = window.importAllDataHandler;
window.clearAllData = window.clearAllDataHandler;

window.gerarPDFVisual = window.gerarPDFHandler;

window.alternarVersao = window.alternarVersaoHandler;

window.showToast = showToast;