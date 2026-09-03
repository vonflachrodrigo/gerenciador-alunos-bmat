// ============================================================
// APP - ORQUESTRACAO DA APLICACAO (VERSAO COMPLETA)
// ============================================================

const gerenciador = new GerenciadorAlunos();

// Estado dos modais
let modalContexto = null;
let quebraContexto = null;
let planejamentoTemp = {};
let toastTimeout;

// ============================================================
// INICIALIZACAO
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado - inicializando app...');
    
    gerenciador.carregar();

    // Configura botoes de curso
    var btnBMAT = document.getElementById('cursoBMAT');
    var btnBCET = document.getElementById('cursoBCET');
    if (btnBMAT) btnBMAT.className = gerenciador.cursoAtivo === 'bmat' ? 'active' : '';
    if (btnBCET) btnBCET.className = gerenciador.cursoAtivo === 'bcet' ? 'active' : '';

    // Configura versao (mobile/classica)
    var isMobile = window.innerWidth < 768;
    var grid = document.getElementById('mainGrid');
    var btn = document.getElementById('btnToggleVersion');
    if (isMobile) {
        grid.classList.remove('clasica', 'modo-clasica');
        grid.classList.add('modo-mobile');
        document.body.classList.add('modo-mobile');
        document.body.classList.remove('modo-clasica');
        if (btn) {
            btn.textContent = 'Clássica';
            btn.className = 'btn-toggle-version mobile';
        }
    } else {
        grid.classList.remove('modo-mobile');
        grid.classList.add('clasica', 'modo-clasica');
        document.body.classList.remove('modo-mobile');
        document.body.classList.add('modo-clasica');
        if (btn) {
            btn.textContent = 'Mobile';
            btn.className = 'btn-toggle-version';
        }
    }

    // Listener do gerenciador
    gerenciador.adicionarListener(function(evento, dados) {
        console.log('Evento recebido:', evento);
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
            case 'removerMatricula':
            case 'adicionarExcecao':
            case 'removerExcecao':
            case 'limparExcecoes':
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

    // Atualiza UI inicial
    atualizarUI();

    // Fecha modais com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            fecharModalOptativa();
            fecharModalQuebra();
            fecharPreMatricula();
            fecharConfirmModal();
            fecharModalStatusOptativa();
            fecharModalExcecoes();
        }
    });

    console.log('App inicializado!');
});

// ============================================================
// ATUALIZACAO DA UI
// ============================================================

function atualizarUI() {
    renderAlunoList(gerenciador);
    renderFluxograma(gerenciador);
    updateAlunoCount();

    var btnBMAT = document.getElementById('cursoBMAT');
    var btnBCET = document.getElementById('cursoBCET');
    if (btnBMAT) btnBMAT.className = gerenciador.cursoAtivo === 'bmat' ? 'active' : '';
    if (btnBCET) btnBCET.className = gerenciador.cursoAtivo === 'bcet' ? 'active' : '';
}

function updateAlunoCount() {
    var el = document.getElementById('alunoCount');
    if (el) el.textContent = gerenciador.getTotalAlunos();
}

// ============================================================
// TOAST
// ============================================================

function showToast(msg, type) {
    type = type || 'info';
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + type + ' show';
    clearTimeout(toastTimeout);
    el.onclick = function() { el.classList.remove('show'); clearTimeout(toastTimeout); };
    toastTimeout = setTimeout(function() { el.classList.remove('show'); }, 4000);
}

// ============================================================
// HANDLERS - ALUNOS
// ============================================================

window.adicionarAlunoHandler = function() {
    console.log('adicionarAlunoHandler chamado');
    var nomeInput = document.getElementById('newAlunoNome');
    var matriculaInput = document.getElementById('newAlunoMatricula');
    var nome = nomeInput ? nomeInput.value.trim() : '';
    var matricula = matriculaInput ? matriculaInput.value.trim() : '';

    if (!nome) {
        showToast('Digite o nome do aluno!', 'error');
        return;
    }

    try {
        gerenciador.adicionarAluno(nome, matricula);
        if (nomeInput) nomeInput.value = '';
        if (matriculaInput) matriculaInput.value = '';
        showToast('Aluno "' + nome + '" adicionado!', 'success');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.adicionarMultiplosHandler = function() {
    console.log('adicionarMultiplosHandler chamado');
    var texto = prompt('Digite os nomes dos alunos, um por linha. Para matrícula, use: Nome | Matrícula');
    if (!texto) return;

    var linhas = texto.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
    if (linhas.length === 0) {
        showToast('Nenhum nome válido.', 'error');
        return;
    }

    var resultado = gerenciador.adicionarMultiplosAlunos(linhas);
    var msg = resultado.adicionados.length + ' alunos adicionados!';
    if (resultado.ignorados.length > 0) {
        msg += ' ' + resultado.ignorados.length + ' duplicatas ignoradas.';
    }
    if (resultado.erros.length > 0) {
        msg += ' ' + resultado.erros.length + ' erros.';
    }
    showToast(msg, 'success');
    atualizarUI();
};

window.removerAlunoHandler = function(id) {
    console.log('removerAlunoHandler chamado para:', id);
    var aluno = gerenciador.getAluno(id);
    if (!aluno) return;
    if (!confirm('Remover aluno "' + aluno.nome + '"?')) return;

    try {
        gerenciador.removerAluno(id);
        showToast('Aluno removido.', 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.selecionarAlunoHandler = function(id) {
    console.log('selecionarAlunoHandler chamado para:', id);
    try {
        gerenciador.selecionarAluno(id);
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.selecionarCursoHandler = function(curso) {
    console.log('selecionarCursoHandler chamado para:', curso);
    try {
        gerenciador.selecionarCurso(curso);
        showToast('Curso ' + (curso === 'bmat' ? 'BMAT (PPC 2013)' : 'BCET - Matemática (PPC 2025)') + ' selecionado', 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// ============================================================
// HANDLERS - DISCIPLINAS
// ============================================================

window.toggleDisciplinaHandler = function(codigo) {
    console.log('toggleDisciplinaHandler chamado para:', codigo);
    var alunoId = gerenciador.alunoAtivoId;
    if (!alunoId) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    try {
        var resultado = gerenciador.toggleDisciplina(alunoId, codigo);

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
        showToast(error.message, 'error');
    }
};

// ============================================================
// OPTATIVAS - MODAL DE SELECAO
// ============================================================

function abrirModalOptativa(slotCodigo) {
    console.log('abrirModalOptativa chamado para:', slotCodigo);
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    modalContexto = { slotCodigo: slotCodigo };

    var infoSlot = gerenciador.getInfoSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);
    var optativas = gerenciador.getOptativasParaSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);

    var labels = {
        'OPT_BCET_1': 'Optativa I (5º Semestre BCET)',
        'OPT_BCET_2': 'Optativa II (6º Semestre BCET)',
        'OPT1': 'Optativa I (6º Semestre BMAT)',
        'OPT2': 'Optativa II (7º Semestre BMAT)',
        'OPT3': 'Optativa III (8º Semestre BMAT)',
        'OPT4': 'Optativa IV (8º Semestre BMAT)',
        'OPT5': 'Optativa V (8º Semestre BMAT)'
    };
    var optLabel = labels[slotCodigo] || 'Optativa';

    var titleEl = document.getElementById('optModalTitle');
    var subEl = document.getElementById('optModalSub');
    if (titleEl) titleEl.textContent = optLabel;
    if (subEl) subEl.textContent = 'Aluno: ' + aluno.nome;

    var list = document.getElementById('optList');
    if (!list) return;
    list.innerHTML = '';

    var headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'grid-column:1/-1;margin-bottom:8px;font-weight:bold;color:#1a237e;';
    headerDiv.textContent = 'Escolha a disciplina';
    list.appendChild(headerDiv);

    var infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'grid-column:1/-1;font-size:12px;color:#666;margin-bottom:8px;';
    infoDiv.textContent = infoSlot && infoSlot.temDisciplina ? 
        'Atual: ' + infoSlot.disciplinaAtual + ' - ' + getNomeDisciplina(infoSlot.disciplinaAtual) : 
        'Nenhuma disciplina selecionada';
    list.appendChild(infoDiv);

    var temDisponiveis = false;

    for (var i = 0; i < optativas.length; i++) {
        var opt = optativas[i];
        var isSelected = opt.isAtual;
        var isAlocada = opt.isAlocada;
        var isPlanejada = opt.isPlanejada;
        var isValida = opt.isValida;
        var disponivel = opt.disponivel;

        var div = document.createElement('div');
        div.className = 'opt-item' + (isSelected ? ' selected' : '');

        if (!disponivel && !isSelected) {
            div.style.opacity = '0.4';
            div.style.cursor = 'not-allowed';
            div.style.pointerEvents = 'none';
            var motivo = isAlocada ? 'Já alocada em outro semestre' : (isPlanejada ? 'Já está na lista de planejadas' : '');
            div.innerHTML = `
                <span class="opt-code">${opt.codigo}</span>
                ${opt.nome} ${opt.origem === 'bmat' ? 'BMAT' : 'BCET'}
                <span class="opt-pre">${motivo}</span>
            `;
            list.appendChild(div);
            continue;
        }

        temDisponiveis = true;

        if (!isValida && !isSelected) {
            div.style.borderColor = '#ff6f00';
            div.style.background = '#fff3e0';
            div.title = 'Optativa válida apenas no outro curso';
        }

        var preDisplay = opt.pre === 'Nenhum' ? 'Sem pré-requisito' : 'Pré: ' + opt.pre;
        var origemLabel = opt.origem === 'bmat' ? 'BMAT' : 'BCET';

        div.innerHTML = `
            <span class="opt-code">${opt.codigo}</span>
            ${opt.nome} ${origemLabel}
            <span class="opt-pre">${preDisplay}</span>
            ${isSelected ? ' Selecionada' : ''}
            ${!isValida && !isSelected ? ' !' : ''}
        `;

        div.onclick = (function(opt, slotCodigo) {
            return function() {
                if (opt.isAlocada) {
                    var slotAtual = gerenciador.getSlotDaOptativa(
                        gerenciador.alunoAtivoId, 
                        opt.codigo
                    );
                    if (!confirm(opt.codigo + ' já está alocada em ' + slotAtual + '.\n\nDeseja mover para ' + slotCodigo + '?')) {
                        return;
                    }
                    try {
                        gerenciador.moverOptativa(
                            gerenciador.alunoAtivoId,
                            slotAtual,
                            slotCodigo
                        );
                        showToast(opt.codigo + ' movida para ' + slotCodigo, 'info');
                        fecharModalOptativa();
                        atualizarUI();
                    } catch (error) {
                        showToast(error.message, 'error');
                    }
                    return;
                }

                try {
                    var resultado = gerenciador.selecionarOptativaCompleta(
                        gerenciador.alunoAtivoId,
                        slotCodigo,
                        opt.codigo,
                        'pending'
                    );

                    fecharModalOptativa();
                    showToast(opt.codigo + ' marcada como cursando!', 'success');
                    atualizarUI();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            };
        })(opt, slotCodigo);

        list.appendChild(div);
    }

    if (!temDisponiveis) {
        var msgDiv = document.createElement('div');
        msgDiv.style.cssText = 'grid-column:1/-1;text-align:center;padding:20px;color:#999;';
        msgDiv.innerHTML = `
            <p>Nenhuma optativa disponível para seleção.</p>
            <p style="font-size:12px;">Todas as optativas já estão alocadas ou planejadas.</p>
        `;
        list.appendChild(msgDiv);
    }

    var actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'grid-column:1/-1;display:flex;gap:8px;margin-top:8px;justify-content:flex-end;';
    actionsDiv.innerHTML = `
        <button onclick="fecharModalOptativa()" class="btn-cancel" style="padding:8px 16px;border:none;border-radius:8px;font-weight:600;cursor:pointer;background:#e0e0e0;color:#333;">
            Cancelar
        </button>
    `;
    list.appendChild(actionsDiv);

    var modal = document.getElementById('optModal');
    if (modal) modal.classList.add('show');
}

function fecharModalOptativa() {
    var modal = document.getElementById('optModal');
    if (modal) modal.classList.remove('show');
    modalContexto = null;
}

window.fecharModalOptativa = fecharModalOptativa;
window.abrirModalOptativa = abrirModalOptativa;

document.getElementById('optModal').addEventListener('click', function(e) {
    if (e.target === this) fecharModalOptativa();
});

// ============================================================
// OPTATIVAS - MODAL DE STATUS
// ============================================================

function abrirModalStatusOptativa(codigo, slotOpcional) {
    slotOpcional = slotOpcional || null;
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    var nome = getNomeDisciplina(codigo) || codigo;

    var isPlanejada = (aluno.optativasPlanejadas || []).indexOf(codigo) !== -1;
    var statusAtualLabel = 'Não cursada';
    
    if (isPlanejada) {
        statusAtualLabel = 'Planejada';
    } else if (aluno.progresso[codigo] && aluno.progresso[codigo].status === 'done') {
        statusAtualLabel = 'Cursada';
    } else if (aluno.progresso[codigo] && aluno.progresso[codigo].status === 'pending') {
        statusAtualLabel = 'Cursando';
    }

    var modalExistente = document.getElementById('modalStatusOptativa');
    if (modalExistente) modalExistente.remove();

    var modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'modalStatusOptativa';
    modal.innerHTML = `
        <div class="modal" style="max-width:500px;">
            <h2>${codigo} - ${nome}</h2>
            <div class="subtitle">Status atual: ${statusAtualLabel}</div>
            <div style="margin:12px 0;font-size:13px;color:#666;">
                Escolha o novo status:
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #ddd;border-radius:8px;${aluno.progresso[codigo] && aluno.progresso[codigo].status === 'pending' ? 'background:#ffeb3b;border-color:#f9a825;' : ''}" onclick="confirmarStatusOptativa('${codigo}','pending')">
                    <div style="font-size:16px;">Cursando</div>
                    <div style="font-size:11px;color:#666;">Disciplina em andamento</div>
                </div>
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #ddd;border-radius:8px;${aluno.progresso[codigo] && aluno.progresso[codigo].status === 'done' ? 'background:#4caf50;color:white;border-color:#2e7d32;' : ''}" onclick="confirmarStatusOptativa('${codigo}','done')">
                    <div style="font-size:16px;">Cursada</div>
                    <div style="font-size:11px;color:#666;">Disciplina já concluída</div>
                </div>
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #7b1fa2;border-radius:8px;${isPlanejada ? 'background:#7b1fa2;color:white;' : 'background:#f3e5f5;'}" onclick="confirmarStatusOptativa('${codigo}','planned')">
                    <div style="font-size:16px;">Planejada</div>
                    <div style="font-size:11px;color:#666;">Disciplina para o próximo semestre</div>
                    ${isPlanejada ? '<div style="font-size:10px;">Atual</div>' : ''}
                </div>
                <div class="opt-item" style="text-align:center;padding:12px;cursor:pointer;border:2px solid #ddd;border-radius:8px;" onclick="confirmarStatusOptativa('${codigo}','not-started')">
                    <div style="font-size:16px;">Não cursada</div>
                    <div style="font-size:11px;color:#666;">Disciplina não iniciada</div>
                </div>
            </div>
            <div style="margin-top:12px;font-size:11px;color:#666;text-align:center;">
                Se mudar para "Planejada", a disciplina vai para a lista abaixo do fluxograma.
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
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        fecharModalStatusOptativa();
        return;
    }

    if (novoStatus === 'planned') {
        var planejadas = aluno.optativasPlanejadas || [];
        if (planejadas.length >= 5 && planejadas.indexOf(codigo) === -1) {
            showToast('Máximo de 5 optativas planejadas atingido!', 'error');
            fecharModalStatusOptativa();
            return;
        }
    }

    var isPlanejada = (aluno.optativasPlanejadas || []).indexOf(codigo) !== -1;
    var statusAtual = isPlanejada ? 'planned' : (aluno.progresso[codigo] ? aluno.progresso[codigo].status || 'not-started' : 'not-started');
    
    if (statusAtual === novoStatus) {
        fecharModalStatusOptativa();
        showToast(codigo + ' já está com este status', 'info');
        return;
    }

    var curso = aluno.curso || 'bmat';
    var slots = getSlotsOptativa(curso);

    try {
        if (isPlanejada && novoStatus !== 'planned') {
            var index = aluno.optativasPlanejadas.indexOf(codigo);
            if (index !== -1) {
                aluno.optativasPlanejadas.splice(index, 1);
            }
            
            var slotVazio = null;
            for (var i = 0; i < slots.length; i++) {
                var slot = slots[i];
                if (!aluno.optativas[slot]) {
                    slotVazio = slot;
                    break;
                }
            }
            
            if (!slotVazio) {
                showToast('Todos os slots de optativa estão ocupados!', 'error');
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
            
            var statusLabel = novoStatus === 'done' ? 'cursada' : 
                               novoStatus === 'pending' ? 'cursando' : 
                               'não cursada';
            showToast(codigo + ' movida para ' + slotVazio + ' como ' + statusLabel, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        if (novoStatus === 'planned') {
            var slotEncontrado = null;
            for (var i = 0; i < slots.length; i++) {
                var slot = slots[i];
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
            if (aluno.optativasPlanejadas.indexOf(codigo) === -1) {
                aluno.optativasPlanejadas.push(codigo);
            }
            
            showToast(codigo + ' adicionada às optativas planejadas!', 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        if (novoStatus === 'not-started') {
            var slotEncontrado = null;
            for (var i = 0; i < slots.length; i++) {
                var slot = slots[i];
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
            
            showToast(codigo + ' marcada como não cursada', 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        var slotEncontrado = null;
        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
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
            
            var statusLabel = novoStatus === 'done' ? 'cursada' : 
                               novoStatus === 'pending' ? 'cursando' : 
                               'não cursada';
            showToast(codigo + ' marcada como ' + statusLabel, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        var slotVazio2 = null;
        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
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
            
            var statusLabel = novoStatus === 'done' ? 'cursada' : 
                               novoStatus === 'pending' ? 'cursando' : 
                               'não cursada';
            showToast(codigo + ' alocada em ' + slotVazio2 + ' como ' + statusLabel, 'success');
            fecharModalStatusOptativa();
            atualizarUI();
            return;
        }
        
        showToast('Erro: não foi possível alocar a disciplina', 'error');
        fecharModalStatusOptativa();
        
    } catch (error) {
        showToast(error.message, 'error');
        fecharModalStatusOptativa();
    }
}

function fecharModalStatusOptativa() {
    var modal = document.getElementById('modalStatusOptativa');
    if (modal) modal.remove();
}

window.abrirModalStatusOptativa = abrirModalStatusOptativa;
window.confirmarStatusOptativa = confirmarStatusOptativa;
window.fecharModalStatusOptativa = fecharModalStatusOptativa;

// ============================================================
// HANDLERS - OPTATIVAS PLANEJADAS
// ============================================================

window.removerOptativaPlanejadaHandler = function(codigo) {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    var nome = getNomeDisciplina(codigo) || codigo;
    if (!confirm('Remover ' + codigo + ' - ' + nome + ' da lista de planejadas?')) return;

    try {
        gerenciador.removerOptativaPlanejada(aluno.id || gerenciador.alunoAtivoId, codigo);
        showToast(codigo + ' removida das optativas planejadas', 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.limparOptativasPlanejadasHandler = function() {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    var planejadas = aluno.optativasPlanejadas || [];
    if (planejadas.length === 0) {
        showToast('Nenhuma optativa planejada para remover', 'info');
        return;
    }

    if (!confirm('Remover TODAS as ' + planejadas.length + ' optativas planejadas?')) return;

    try {
        gerenciador.limparOptativasPlanejadas(aluno.id || gerenciador.alunoAtivoId);
        showToast('Todas as optativas planejadas foram removidas', 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.removerOptativaDoSlotHandler = function(slotCodigo) {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    var infoSlot = gerenciador.getInfoSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);
    if (!infoSlot || !infoSlot.temDisciplina) {
        showToast('Nenhuma optativa neste slot', 'info');
        return;
    }

    if (!confirm('Remover ' + infoSlot.disciplinaAtual + ' de ' + slotCodigo + '?')) return;

    try {
        gerenciador.removerOptativaDoSlot(aluno.id || gerenciador.alunoAtivoId, slotCodigo);
        showToast('Optativa removida de ' + slotCodigo, 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// ============================================================
// HANDLERS - EXCECOES
// ============================================================

window.abrirModalExcecoesHandler = function() {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }
    renderModalExcecoes(gerenciador);
};

window.fecharModalExcecoesHandler = function() {
    var modal = document.getElementById('modalExcecoes');
    if (modal) modal.remove();
};

function fecharModalExcecoes() {
    var modal = document.getElementById('modalExcecoes');
    if (modal) modal.remove();
}

window.adicionarExcecaoHandler = function(codigo) {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    try {
        var resultado = gerenciador.adicionarExcecao(aluno.id || gerenciador.alunoAtivoId, codigo);
        showToast('Exceção adicionada: ' + codigo + ' - ' + resultado.nome, 'success');
        window.fecharModalExcecoesHandler();
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.removerExcecaoHandler = function(codigo) {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    var nome = getNomeDisciplina(codigo) || codigo;
    if (!confirm('Remover exceção ' + codigo + ' - ' + nome + '?')) return;

    try {
        gerenciador.removerExcecao(aluno.id || gerenciador.alunoAtivoId, codigo);
        showToast('Exceção removida: ' + codigo, 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.limparExcecoesHandler = function() {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    var excecoes = aluno.excecoes || [];
    if (excecoes.length === 0) {
        showToast('Nenhuma exceção para remover', 'info');
        return;
    }

    if (!confirm('Remover TODAS as ' + excecoes.length + ' exceções?')) return;

    try {
        gerenciador.limparExcecoes(aluno.id || gerenciador.alunoAtivoId);
        showToast('Todas as exceções foram removidas', 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.filtrarDisciplinasExcecao = function(texto) {
    texto = texto.toLowerCase().trim();
    var items = document.querySelectorAll('#listaExcecoes > div');
    items.forEach(function(item) {
        var textContent = item.textContent.toLowerCase();
        if (textContent.indexOf(texto) !== -1) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// ============================================================
// HANDLERS - QUEBRA
// ============================================================

function abrirModalQuebra(codigo) {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    quebraContexto = { codigo: codigo };
    var curso = aluno.curso || 'bmat';
    var prereqs = getPreRequisitos(codigo, curso);
    var preNomes = prereqs.map(function(c) { return c + ' - ' + getNomeDisciplina(c); }).join(', ');

    var subEl = document.getElementById('quebraSubtitle');
    var infoEl = document.getElementById('quebraInfo');
    if (subEl) subEl.textContent = 'Aluno: ' + aluno.nome;
    if (infoEl) {
        infoEl.innerHTML = '<strong>Disciplina:</strong> ' + codigo + ' - ' + getNomeDisciplina(codigo) + '<br>' +
            '<strong>Pré-requisitos:</strong> ' + (preNomes || 'Nenhum') + '<br>' +
            '<strong>Status:</strong> ' + (aluno.quebras && aluno.quebras[codigo] ? 'Já possui quebra' : 'Sem quebra');
    }

    var modal = document.getElementById('quebraModal');
    if (modal) modal.classList.add('show');
}

window.abrirModalQuebraHandler = abrirModalQuebra;

window.confirmarQuebraHandler = function() {
    if (!quebraContexto) return;
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    try {
        gerenciador.concederQuebra(aluno.id || gerenciador.alunoAtivoId, quebraContexto.codigo);
        fecharModalQuebra();
        showToast('Quebra concedida para ' + quebraContexto.codigo + '!', 'success');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.removerQuebraHandler = function() {
    if (!quebraContexto) return;
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    try {
        gerenciador.removerQuebra(aluno.id || gerenciador.alunoAtivoId, quebraContexto.codigo);
        fecharModalQuebra();
        showToast('Quebra removida para ' + quebraContexto.codigo, 'info');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

function fecharModalQuebra() {
    var modal = document.getElementById('quebraModal');
    if (modal) modal.classList.remove('show');
    quebraContexto = null;
}

document.getElementById('quebraModal').addEventListener('click', function(e) {
    if (e.target === this) fecharModalQuebra();
});

// ============================================================
// HANDLERS - PRE-MATRICULA
// ============================================================

window.abrirPreMatriculaHandler = function() {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    var planejaveis = gerenciador.obterDisciplinasPlanejaveis(
        aluno.id || gerenciador.alunoAtivoId
    );

    planejamentoTemp = {};
    
    for (var codigo in aluno.progresso) {
        if (aluno.progresso[codigo] && aluno.progresso[codigo].status === 'planned') {
            planejamentoTemp[codigo] = true;
        }
    }
    for (var i = 0; i < (aluno.optativasPlanejadas || []).length; i++) {
        var codigo = aluno.optativasPlanejadas[i];
        planejamentoTemp[codigo] = true;
    }

    var html = `
        <div class="disciplines-list">
            <p style="font-size:14px;color:#666;margin-bottom:12px;">
                Selecione as disciplinas que você planeja cursar no próximo semestre:
            </p>
    `;

    html += '<div class="section-title">DISCIPLINAS OBRIGATÓRIAS</div>';

    if (planejaveis.obrigatorias.length === 0) {
        html += '<div class="empty-message">Todas as disciplinas obrigatórias já foram cursadas!</div>';
    } else {
        var currentSemestre = '';
        for (var i = 0; i < planejaveis.obrigatorias.length; i++) {
            var disc = planejaveis.obrigatorias[i];
            if (disc.semestre !== currentSemestre) {
                currentSemestre = disc.semestre;
                html += '<div class="semester-label">' + currentSemestre + '</div>';
            }
            var checked = disc.jaPlanejada ? 'checked' : '';
            html += `
                <label class="discipline-item ${disc.jaPlanejada ? 'planned' : ''}">
                    <input type="checkbox" ${checked} 
                           onchange="window.togglePlanejamentoHandler('${disc.codigo}')" 
                           style="margin-right:8px;">
                    <strong>${disc.codigo}</strong> - ${disc.nome}
                    <span class="hours">${disc.horas}</span>
                    ${disc.jaPlanejada ? '<span class="planned-label">Planejada</span>' : ''}
                </label>
            `;
        }
    }

    html += '<div class="section-title">OPTATIVAS DISPONÍVEIS</div>';

    if (planejaveis.optativas.length === 0) {
        html += '<div class="empty-message">Todas as optativas disponíveis já estão alocadas ou planejadas!</div>';
    } else {
        for (var i = 0; i < planejaveis.optativas.length; i++) {
            var opt = planejaveis.optativas[i];
            var checked = opt.jaPlanejada ? 'checked' : '';
            html += `
                <label class="discipline-item optativa-item ${opt.jaPlanejada ? 'planned' : ''}">
                    <input type="checkbox" ${checked} 
                           onchange="window.togglePlanejamentoHandler('${opt.codigo}')" 
                           style="margin-right:8px;">
                    <strong>${opt.codigo}</strong> - ${opt.nome}
                    <span class="opt-label">optativa</span>
                    <span class="hours">68h</span>
                    ${opt.jaPlanejada ? '<span class="planned-label">Planejada</span>' : ''}
                </label>
            `;
        }
    }

    var totalSelecionadas = Object.keys(planejamentoTemp).length;
    html += `
        </div>
        <div class="modal-actions">
            <button class="btn-save" onclick="window.salvarPlanejamentoHandler()">
                Salvar planejamento (${totalSelecionadas} selecionadas)
            </button>
            <button class="btn-cancel" onclick="window.fecharPreMatriculaHandler()">Cancelar</button>
        </div>
        <div class="footer-note">
            Disciplinas em <span style="color:#7b1fa2;font-weight:bold;">roxo claro</span> serão marcadas como "cursará no próximo semestre"
        </div>
    `;

    var modal = document.createElement('div');
    modal.className = 'pre-matricula-modal';
    modal.id = 'preMatriculaModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Pré-matrícula</h2>
            <p class="subtitle">Planeje as disciplinas para o próximo semestre</p>
            ${html}
        </div>
    `;
    document.body.appendChild(modal);
};

window.togglePlanejamentoHandler = function(codigo) {
    var checkbox = event.target;
    if (checkbox.checked) {
        planejamentoTemp[codigo] = true;
    } else {
        delete planejamentoTemp[codigo];
    }

    var total = Object.keys(planejamentoTemp).length;
    var btn = document.querySelector('#preMatriculaModal .btn-save');
    if (btn) {
        btn.textContent = 'Salvar planejamento (' + total + ' selecionadas)';
    }
};

window.salvarPlanejamentoHandler = function() {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    var codigos = Object.keys(planejamentoTemp);
    var optativasSelecionadas = codigos.filter(function(c) { return isOptativaGlobal(c); });

    if (optativasSelecionadas.length > 0) {
        var quantidadeModal = document.createElement('div');
        quantidadeModal.className = 'confirm-modal';
        quantidadeModal.id = 'quantidadeModal';
        quantidadeModal.innerHTML = `
            <div class="modal-content" style="max-width:450px;">
                <h3>Quantas optativas?</h3>
                <p style="color:#666;margin:8px 0;">
                    Você selecionou <strong>${optativasSelecionadas.length}</strong> optativa(s).
                    <br>
                    Quantas você pretende cursar no próximo semestre?
                    <br>
                    <span style="font-size:12px;color:#999;">(máximo 5)</span>
                </p>
                <div style="display:flex;gap:8px;margin:12px 0;">
                    <input type="number" id="quantidadeOptativas" min="0" max="5" value="1" 
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
                    As optativas com maior prioridade serão escolhidas
                </div>
            </div>
        `;
        document.body.appendChild(quantidadeModal);
        return;
    }

    try {
        var resultado = gerenciador.salvarPlanejamento(
            aluno.id || gerenciador.alunoAtivoId,
            codigos
        );

        window.fecharPreMatriculaHandler();
        planejamentoTemp = {};

        var total = resultado.obrigatorias.length + resultado.optativas.length;
        var msg = total + ' disciplina(s) planejada(s)!';
        if (resultado.optativas.length > 0) {
            msg += ' ' + resultado.optativas.length + ' optativa(s)';
        }
        showToast(msg, 'success');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.confirmarQuantidadeOptativas = function() {
    var input = document.getElementById('quantidadeOptativas');
    var quantidade = parseInt(input.value);

    if (isNaN(quantidade) || quantidade < 0 || quantidade > 5) {
        showToast('Digite um número entre 0 e 5', 'error');
        return;
    }

    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    var codigos = Object.keys(planejamentoTemp);
    var optativasSelecionadas = codigos.filter(function(c) { return isOptativaGlobal(c); });

    if (quantidade === 0) {
        window.fecharQuantidadeModal();
        var codigosFinais = codigos.filter(function(c) { return !isOptativaGlobal(c); });

        try {
            var resultado = gerenciador.salvarPlanejamento(
                aluno.id || gerenciador.alunoAtivoId,
                codigosFinais,
                []
            );
            window.fecharPreMatriculaHandler();
            planejamentoTemp = {};
            showToast(resultado.obrigatorias.length + ' disciplina(s) planejada(s)!', 'success');
            atualizarUI();
        } catch (error) {
            showToast(error.message, 'error');
        }
        return;
    }

    if (quantidade > optativasSelecionadas.length) {
        showToast('Você só selecionou ' + optativasSelecionadas.length + ' optativa(s)', 'error');
        return;
    }

    window.fecharQuantidadeModal();

    var prioridadeModal = document.createElement('div');
    prioridadeModal.className = 'confirm-modal';
    prioridadeModal.id = 'prioridadeModal';
    
    var prioridadeHtml = `
        <div class="modal-content" style="max-width:500px;">
            <h3>Ordem de prioridade</h3>
            <p style="color:#666;margin:8px 0;">
                Ordene as optativas por preferência (1 = maior prioridade):
                <br>
                <span style="font-size:12px;color:#999;">As ${quantidade} primeiras serão planejadas</span>
            </p>
            <div id="listaPrioridade" style="display:flex;flex-direction:column;gap:4px;margin:12px 0;max-height:300px;overflow-y:auto;">
    `;

    optativasSelecionadas.forEach(function(codigo, index) {
        var nome = getNomeDisciplina(codigo) || codigo;
        prioridadeHtml += `
            <div class="priority-item" draggable="true" data-codigo="${codigo}" 
                 style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f5f5f5;border-radius:6px;cursor:grab;border:2px solid #e0e0e0;">
                <span style="font-weight:bold;color:#1a237e;min-width:30px;">${index + 1}</span>
                <span style="flex:1;"><strong>${codigo}</strong> - ${nome}</span>
                <span style="font-size:12px;color:#666;">arraste</span>
            </div>
        `;
    });

    prioridadeHtml += `
            </div>
            <div style="display:flex;gap:10px;margin-top:8px;">
                <button onclick="window.confirmarPrioridadeOptativas(${quantidade})" style="flex:1;padding:12px;background:#1a237e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                    Confirmar
                </button>
                <button onclick="window.fecharPrioridadeModal()" style="padding:12px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;">
                    Cancelar
                </button>
            </div>
            <div style="margin-top:8px;font-size:11px;color:#999;text-align:center;">
                Arraste os itens para reordenar
            </div>
        </div>
    `;

    prioridadeModal.innerHTML = prioridadeHtml;
    document.body.appendChild(prioridadeModal);
    setupDragAndDrop();
};

function setupDragAndDrop() {
    var items = document.querySelectorAll('.priority-item');
    var draggedItem = null;

    items.forEach(function(item) {
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
                var parent = this.parentNode;
                var children = Array.from(parent.children);
                var fromIndex = children.indexOf(draggedItem);
                var toIndex = children.indexOf(this);
                
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
    var items = document.querySelectorAll('.priority-item');
    items.forEach(function(item, index) {
        var numberSpan = item.querySelector('span:first-child');
        if (numberSpan) {
            numberSpan.textContent = index + 1;
        }
    });
}

window.confirmarPrioridadeOptativas = function(quantidade) {
    var items = document.querySelectorAll('.priority-item');
    var prioridade = [];
    items.forEach(function(item) {
        prioridade.push(item.dataset.codigo);
    });

    var selecionadas = prioridade.slice(0, quantidade);

    window.fecharPrioridadeModal();

    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    var codigos = Object.keys(planejamentoTemp);
    
    var codigosFinais = codigos.filter(function(c) {
        if (isOptativaGlobal(c)) {
            return selecionadas.indexOf(c) !== -1;
        }
        return true;
    });

    try {
        var resultado = gerenciador.salvarPlanejamento(
            aluno.id || gerenciador.alunoAtivoId,
            codigosFinais,
            selecionadas
        );

        window.fecharPreMatriculaHandler();
        planejamentoTemp = {};

        var total = resultado.obrigatorias.length + resultado.optativas.length;
        var msg = total + ' disciplina(s) planejada(s)!';
        if (resultado.optativas.length > 0) {
            msg += ' ' + resultado.optativas.length + ' optativa(s) priorizada(s)';
        }
        showToast(msg, 'success');
        atualizarUI();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.fecharQuantidadeModal = function() {
    var modal = document.getElementById('quantidadeModal');
    if (modal) modal.remove();
};

window.fecharPrioridadeModal = function() {
    var modal = document.getElementById('prioridadeModal');
    if (modal) modal.remove();
};

window.fecharPreMatriculaHandler = function() {
    var modal = document.getElementById('preMatriculaModal');
    if (modal) modal.remove();
    planejamentoTemp = {};
};

function fecharPreMatricula() {
    var modal = document.getElementById('preMatriculaModal');
    if (modal) modal.remove();
    planejamentoTemp = {};
}

// ============================================================
// HANDLERS - IMPORTACAO
// ============================================================

window.importarHistoricoHandler = async function(event) {
    var file = event.target.files[0];
    if (!file) return;

    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Selecione ou crie um aluno primeiro!', 'error');
        event.target.value = '';
        return;
    }

    var preview = document.getElementById('importPreview');
    if (preview) {
        preview.innerHTML = '<div class="info">Processando PDF... <span class="loading"></span></div>';
        preview.classList.add('show');
    }

    try {
        var arrayBuffer = await file.arrayBuffer();
        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        var textoCompleto = '';

        for (var i = 1; i <= pdf.numPages; i++) {
            var page = await pdf.getPage(i);
            var textContent = await page.getTextContent();
            var pageText = textContent.items.map(function(item) { return item.str; }).join(' ');
            textoCompleto += pageText + '\n';
        }

        var regex = /(\d{4}\.\d)\s+([A-ZÇÃÕÁÉÍÓÚÂÊÎÔÛÀ\s\'\-]+?)\s+(APR|REP|DISPCN|DISP|MATR|REPF|REPMF|TRANC|TRTAL)\s+([A-Z0-9.]+)\s+(\d+)\s+([\d.]+|--)\s+([\d.]+)/gi;

        var todasOcorrencias = [];
        var match;
        while ((match = regex.exec(textoCompleto)) !== null) {
            var periodo = match[1];
            var nome = match[2].trim();
            var situacao = match[3];
            var codigo = match[4].trim();
            var ch = parseInt(match[5]);

            if (codigo.indexOf('ENADE') !== -1 || nome.indexOf('ENADE') !== -1) continue;

            todasOcorrencias.push({
                periodo: periodo,
                codigo: codigo,
                nome: nome,
                ch: ch,
                situacao: situacao
            });
        }

        if (todasOcorrencias.length === 0) {
            if (preview) preview.innerHTML = '<div class="error">Nenhuma disciplina encontrada no PDF.</div>';
            showToast('Nenhuma disciplina encontrada.', 'error');
            event.target.value = '';
            return;
        }

        var resultado = gerenciador.importarHistorico(
            aluno.id || gerenciador.alunoAtivoId,
            todasOcorrencias
        );

        var countAPR = Object.values(resultado.disciplinas).filter(function(d) { return d.status === 'done'; }).length;
        
        var messageId = 'aviso_' + Date.now();
        
        var html = `
            <div class="success">Importação concluída para <strong>${aluno.nome}</strong>!</div>
            <div class="info">${countAPR} disciplina(s) processada(s)</div>
            <div class="info">${resultado.optativas ? resultado.optativas.length : 0} optativa(s) identificada(s)</div>
            ${Object.keys(resultado.equivalencias || {}).length > 0 ? '<div class="info">' + Object.keys(resultado.equivalencias).length + ' equivalência(s) aplicada(s)</div>' : ''}
        `;

        html += `
            <div id="${messageId}" style="background:#fff8e1;border:2px solid #ff6f00;border-radius:8px;padding:20px;margin-top:10px;position:relative;">
                <button onclick="fecharAvisoImportacao('${messageId}')" 
                        style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:20px;cursor:pointer;color:#999;padding:4px 8px;border-radius:4px;"
                        onmouseover="this.style.background='#ffebee'" 
                        onmouseout="this.style.background='none'"
                        title="Fechar aviso">
                    x
                </button>
                
                <h3 style="color:#e65100;margin:0 0 8px 0;">VERIFICAÇÃO MANUAL NECESSÁRIA</h3>
                <p style="margin:4px 0;color:#bf360c;">
                    A importação automática pode não ter capturado todas as disciplinas corretamente.
                </p>
                <p style="margin:4px 0;color:#bf360c;font-weight:bold;">
                    Por favor, verifique o fluxograma do aluno e corrija manualmente:
                </p>
                <ul style="margin:8px 0 12px 20px;color:#bf360c;font-size:13px;">
                    <li>Disciplinas que podem ter sido importadas com código errado</li>
                    <li>Optativas que precisam ser alocadas manualmente</li>
                    <li>Equivalências que não foram detectadas</li>
                    <li>Disciplinas com status incorreto</li>
                </ul>

                <div style="background:#fff3e0;padding:10px;border-radius:6px;margin:8px 0;border-left:4px solid #ff6f00;">
                    <p style="margin:0;font-size:13px;color:#e65100;">
                        Dica: Clique em cada disciplina no fluxograma para ajustar o status 
                        (cursada, cursando, planejada ou não cursada).
                    </p>
                </div>

                <hr style="margin:16px 0;border-color:#ffe0b2;">

                <p style="font-weight:bold;color:#1a237e;margin:0 0 12px 0;">O que você deseja fazer agora?</p>

                <div style="display:flex;flex-wrap:wrap;gap:12px;">
                    <button onclick="window.gerarPDFHandler()" style="flex:1;min-width:200px;padding:14px 20px;background:#1a237e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
                        Gerar PDF
                        <br><span style="font-weight:normal;font-size:12px;opacity:0.8;">Exportar o fluxograma completo</span>
                    </button>

                    <button onclick="window.abrirPreMatriculaHandler()" style="flex:1;min-width:200px;padding:14px 20px;background:#ce93d8;color:#1a237e;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
                        Fazer pré-matrícula
                        <br><span style="font-weight:normal;font-size:12px;opacity:0.8;">Planejar disciplinas para o próximo semestre</span>
                    </button>
                </div>

                <hr style="margin:16px 0;border-color:#ffe0b2;">

                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <p style="margin:0;font-size:12px;color:#666;">
                        Lembre-se: Verifique sempre se todas as disciplinas do histórico foram importadas corretamente.
                    </p>
                    <button onclick="fecharAvisoImportacao('${messageId}')" 
                            style="padding:6px 16px;background:#ff6f00;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">
                        Já verifiquei, fechar aviso
                    </button>
                </div>
            </div>
        `;

        html += `
            <div style="margin-top:16px;padding:16px;background:#f5f5f5;border-radius:8px;border:1px solid #e0e0e0;">
                <p style="font-weight:bold;color:#1a237e;margin:0 0 12px 0;">Ações rápidas:</p>
                <div style="display:flex;flex-wrap:wrap;gap:12px;">
                    <button onclick="window.gerarPDFHandler()" style="flex:1;min-width:200px;padding:14px 20px;background:#1a237e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
                        Gerar PDF
                        <br><span style="font-weight:normal;font-size:12px;opacity:0.8;">Exportar o fluxograma completo</span>
                    </button>

                    <button onclick="window.abrirPreMatriculaHandler()" style="flex:1;min-width:200px;padding:14px 20px;background:#ce93d8;color:#1a237e;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
                        Fazer pré-matrícula
                        <br><span style="font-weight:normal;font-size:12px;opacity:0.8;">Planejar disciplinas para o próximo semestre</span>
                    </button>
                </div>
            </div>
        `;

        if (preview) preview.innerHTML = html;
        showToast(countAPR + ' disciplinas processadas. Verifique o fluxograma!', 'warning');

    } catch (error) {
        console.error('Erro ao importar:', error);
        if (preview) preview.innerHTML = '<div class="error">Erro ao processar o PDF: ' + error.message + '</div>';
        showToast('Erro ao importar o PDF', 'error');
    }

    event.target.value = '';
};

function fecharAvisoImportacao(messageId) {
    var elemento = document.getElementById(messageId);
    if (elemento) {
        elemento.style.transition = 'opacity 0.3s ease';
        elemento.style.opacity = '0';
        setTimeout(function() {
            elemento.style.display = 'none';
        }, 300);
    }
}

window.fecharAvisoImportacao = fecharAvisoImportacao;

// ============================================================
// HANDLERS - VERIFICACAO DE CORRECOES
// ============================================================

window.verificarCorrecoesHandler = function() {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    var pendentes = gerenciador.verificarCorrecoes(
        aluno.id || gerenciador.alunoAtivoId
    );

    var preview = document.getElementById('importPreview');
    if (!preview) return;

    if (pendentes.total === 0) {
        preview.innerHTML = '<div class="success">Disciplinas processadas com sucesso!</div>';
        preview.innerHTML += renderOpcoesPosValidacao();
        showToast('Tudo correto!', 'success');
        return;
    }

    var successDiv = preview.querySelector('.success');
    if (successDiv) {
        preview.innerHTML = successDiv.outerHTML + renderErrosCorrecao(pendentes);
    } else {
        preview.innerHTML = renderErrosCorrecao(pendentes);
    }
    showToast(pendentes.total + ' erro(s) encontrado(s)', 'error');
};

// ============================================================
// HANDLERS - EXPORT/IMPORT
// ============================================================

window.exportAllDataHandler = function() {
    var data = gerenciador.exportar();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'alunos_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Dados exportados!', 'success');
};

window.importAllDataHandler = function(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            var count = gerenciador.importar(data);
            showToast('Importados ' + count + ' alunos!', 'success');
            atualizarUI();
        } catch (err) {
            showToast('Erro ao importar: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

window.clearAllDataHandler = function() {
    if (!confirm('Tem certeza que deseja apagar TODOS os dados?')) return;
    gerenciador.limpar();
    showToast('Todos os dados foram removidos.', 'info');
    atualizarUI();
};

// ============================================================
// HANDLERS - PDF
// ============================================================

window.gerarPDFHandler = function() {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Selecione um aluno primeiro!', 'error');
        return;
    }

    var curso = aluno.curso || 'bmat';
    var curriculo = getCurriculo(curso);
    var progresso = gerenciador.getProgressoAtivo();
    var cursoLabel = curso === 'bcet' ? 'BCET - Itinerário Matemática (PPC 2025)' : 'BMAT (PPC 2013)';
    var stats = gerenciador.getEstatisticasOptativas(gerenciador.alunoAtivoId);
    var excecoes = aluno.excecoes || [];

    var linhas = [];
    var separador = '='.repeat(60);

    linhas.push('RELATÓRIO ACADÊMICO');
    linhas.push(separador);
    linhas.push('Aluno: ' + aluno.nome);
    if (aluno.matricula) linhas.push('Matrícula: ' + aluno.matricula);
    linhas.push('Curso: ' + cursoLabel);
    linhas.push('Progresso: ' + (progresso ? progresso.done + '/' + progresso.total + ' (' + progresso.pct + '%)' : '0/0 (0%)'));
    if (progresso && progresso.planned > 0) linhas.push('Planejadas: ' + progresso.planned + ' disciplinas');
    linhas.push('Data: ' + new Date().toLocaleDateString('pt-BR'));
    linhas.push('');

    linhas.push('DISCIPLINAS POR SEMESTRE');
    linhas.push(separador);

    for (var s = 0; s < curriculo.length; s++) {
        var semestre = curriculo[s];
        linhas.push('\n' + semestre.nome + ':');
        
        var temAlgumaDisciplina = false;
        for (var d = 0; d < semestre.disciplinas.length; d++) {
            var disc = semestre.disciplinas[d];
            if (!disc.isOptativa) {
                temAlgumaDisciplina = true;
                break;
            }
        }
        if (!temAlgumaDisciplina) continue;

        for (var d = 0; d < semestre.disciplinas.length; d++) {
            var disc = semestre.disciplinas[d];
            var codigo = disc.codigo;
            var nome = getNomeDisciplina(codigo);
            var status = 'not-started';
            var emoji = '  ';
            var badge = '';

            if (disc.isOptativa) {
                var optCod = aluno.optativas[codigo];
                if (optCod) {
                    codigo = optCod;
                    nome = getNomeDisciplina(optCod) || optCod;
                    var optStatus = aluno.progresso[optCod]?.status || 'not-started';
                    status = optStatus;
                    if (status === 'done') { emoji = '[X]'; badge = ' (optativa)'; } 
                    else if (status === 'pending') { emoji = '[~]'; badge = ' (optativa)'; } 
                    else if (status === 'planned') { emoji = '[P]'; badge = ' (optativa)'; }
                } else {
                    emoji = '[ ]';
                    nome = 'Optativa (não selecionada)';
                }
            } else {
                status = aluno.progresso[codigo]?.status || 'not-started';
                if (status === 'done') { emoji = '[X]'; } 
                else if (status === 'pending') { emoji = '[~]'; } 
                else if (status === 'planned') { emoji = '[P]'; } 
                else { emoji = '[ ]'; }
            }

            var horas = disc.horas || '68h';
            linhas.push('  ' + emoji + ' ' + codigo + ' - ' + nome + ' (' + horas + ')' + badge);
        }
    }

    // OBRIGATÓRIAS PLANEJADAS (incluindo exceções obrigatórias)
    var obrigatoriasPlanejadas = [];
    for (var codigo in aluno.progresso) {
        if (aluno.progresso[codigo] && aluno.progresso[codigo].status === 'planned' && !isOptativaGlobal(codigo)) {
            obrigatoriasPlanejadas.push(codigo);
        }
    }

    for (var i = 0; i < excecoes.length; i++) {
        var exc = excecoes[i];
        if (exc.tipo === 'obrigatoria' && obrigatoriasPlanejadas.indexOf(exc.codigo) === -1) {
            obrigatoriasPlanejadas.push(exc.codigo);
        }
    }

    linhas.push('');
    linhas.push('OBRIGATÓRIAS PLANEJADAS (Próximo Semestre):');
    linhas.push(separador);

    if (obrigatoriasPlanejadas.length > 0) {
        for (var i = 0; i < obrigatoriasPlanejadas.length; i++) {
            var codigo = obrigatoriasPlanejadas[i];
            var nome = getNomeDisciplina(codigo) || codigo;
            var horas = obterHorasDisciplina(codigo, curso) || '68h';
            linhas.push('  [P] ' + codigo + ' - ' + nome + ' (' + horas + ')');
        }
    } else {
        linhas.push('  Nenhuma obrigatória planejada.');
    }
    linhas.push('');

    // RESUMO DE OPTATIVAS (incluindo exceções optativas)
    linhas.push('RESUMO DE OPTATIVAS');
    linhas.push(separador);

    if (stats) {
        var planejadasLista = stats.planejadasLista || [];
        var excecoesOptativas = excecoes.filter(function(e) { return e.tipo === 'optativa'; });
        
        for (var i = 0; i < excecoesOptativas.length; i++) {
            var exc = excecoesOptativas[i];
            if (planejadasLista.indexOf(exc.codigo) === -1) {
                planejadasLista.push(exc.codigo);
            }
        }

        if (planejadasLista.length > 0) {
            linhas.push('Optativas Planejadas (Próximo Semestre):');
            planejadasLista.forEach(function(codigo, index) {
                var nome = getNomeDisciplina(codigo) || codigo;
                linhas.push('  [P] ' + codigo + ' - ' + nome + ' (Prioridade ' + (index + 1) + ')');
            });
            linhas.push('');
        }

        if (stats.cursadasLista && stats.cursadasLista.length > 0) {
            linhas.push('Optativas já cursadas:');
            stats.cursadasLista.forEach(function(codigo) {
                var nome = getNomeDisciplina(codigo) || codigo;
                linhas.push('  [X] ' + codigo + ' - ' + nome);
            });
            linhas.push('');
        }
    }

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
    linhas.push('Relatório gerado em ' + new Date().toLocaleString('pt-BR'));
    linhas.push('Gerenciador de Alunos - BMAT/BCET');

    var texto = linhas.join('\n');
    var { jsPDF } = window.jspdf;
    var pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    var margin = 20;
    var pageWidth = pdf.internal.pageSize.getWidth();
    var pageHeight = pdf.internal.pageSize.getHeight();
    var maxWidth = pageWidth - 2 * margin;
    var lineHeight = 5.5;
    var y = margin;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    var lines = texto.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var wrapped = pdf.splitTextToSize(lines[i], maxWidth);
        for (var j = 0; j < wrapped.length; j++) {
            if (y + lineHeight > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
            pdf.text(wrapped[j], margin, y);
            y += lineHeight;
        }
    }

    var nomeArquivo = 'relatorio_' + aluno.nome.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    pdf.save(nomeArquivo);

    showToast('PDF gerado com sucesso!', 'success');
};

// ============================================================
// HANDLER - VERSAO
// ============================================================

window.alternarVersao = function() {
    console.log('alternarVersao chamado!');
    var grid = document.getElementById('mainGrid');
    var btn = document.getElementById('btnToggleVersion');
    if (grid.classList.contains('modo-mobile')) {
        grid.classList.remove('modo-mobile');
        grid.classList.add('clasica', 'modo-clasica');
        document.body.classList.remove('modo-mobile');
        document.body.classList.add('modo-clasica');
        if (btn) {
            btn.textContent = 'Mobile';
            btn.className = 'btn-toggle-version';
        }
    } else {
        grid.classList.remove('clasica', 'modo-clasica');
        grid.classList.add('modo-mobile');
        document.body.classList.remove('modo-clasica');
        document.body.classList.add('modo-mobile');
        if (btn) {
            btn.textContent = 'Clássica';
            btn.className = 'btn-toggle-version mobile';
        }
    }
    renderFluxograma(gerenciador);
    showToast('Versão ' + (grid.classList.contains('modo-mobile') ? 'Mobile' : 'Clássica') + ' ativada!', 'info');
};

// ============================================================
// HANDLERS - MATRICULA
// ============================================================

window.removerMatriculaHandler = function(codigo) {
    var aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return;

    if (!confirm('Remover ' + codigo + ' das disciplinas em andamento?')) return;

    try {
        if (aluno.progresso[codigo] && aluno.progresso[codigo].status === 'pending' && 
            aluno.progresso[codigo].origem === 'matricula_atual') {
            delete aluno.progresso[codigo];
            if (aluno.historico_completo[codigo] && aluno.historico_completo[codigo].origem === 'matricula_atual') {
                delete aluno.historico_completo[codigo];
            }
            gerenciador._notifyListeners('removerMatricula', { alunoId: aluno.id, codigo: codigo });
            atualizarUI();
            showToast(codigo + ' removida das disciplinas em andamento.', 'info');
        } else {
            showToast(codigo + ' não pode ser removida manualmente.', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// ============================================================
// FUNCOES AUXILIARES
// ============================================================

function fecharConfirmModal() {
    var modal = document.querySelector('.confirm-modal');
    if (modal) modal.remove();
}

function obterHorasDisciplina(codigo, curso) {
    var curriculo = getCurriculo(curso);
    for (var s = 0; s < curriculo.length; s++) {
        var semestre = curriculo[s];
        for (var d = 0; d < semestre.disciplinas.length; d++) {
            var disc = semestre.disciplinas[d];
            if (disc.codigo === codigo) {
                return disc.horas || '68h';
            }
        }
    }
    return '68h';
}

// ============================================================
// EXPOSICAO GLOBAL (ALIASES)
// ============================================================

window.addAlunoCompleto = window.adicionarAlunoHandler;
window.addMultipleAlunos = window.adicionarMultiplosHandler;
window.deleteAluno = window.removerAlunoHandler;
window.selectAluno = window.selecionarAlunoHandler;
window.selecionarCurso = window.selecionarCursoHandler;
window.toggleDiscipline = window.toggleDisciplinaHandler;

window.abrirModalOptativa = abrirModalOptativa;
window.fecharModalOptativa = fecharModalOptativa;
window.removerOptativaDoSlot = window.removerOptativaDoSlotHandler;

window.removerOptativaPlanejada = window.removerOptativaPlanejadaHandler;
window.limparOptativasPlanejadas = window.limparOptativasPlanejadasHandler;
window.abrirModalStatusOptativa = abrirModalStatusOptativa;
window.confirmarStatusOptativa = confirmarStatusOptativa;
window.fecharModalStatusOptativa = fecharModalStatusOptativa;

// Exceções
window.abrirModalExcecoes = window.abrirModalExcecoesHandler;
window.fecharModalExcecoes = window.fecharModalExcecoesHandler;
window.adicionarExcecao = window.adicionarExcecaoHandler;
window.removerExcecao = window.removerExcecaoHandler;
window.limparExcecoes = window.limparExcecoesHandler;
window.filtrarDisciplinasExcecao = window.filtrarDisciplinasExcecao;

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

window.alternarVersao = window.alternarVersao;

window.removerMatriculaHandler = window.removerMatriculaHandler;
window.fecharConfirmModal = fecharConfirmModal;

window.showToast = showToast;

console.log('App carregado com sucesso - Versão COMPLETA!');