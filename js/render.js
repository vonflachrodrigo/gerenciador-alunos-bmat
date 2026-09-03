// ============================================================
// FUNCOES DE RENDERIZACAO
// ============================================================

function renderAlunoList(gerenciador) {
    const container = document.getElementById('alunoList');
    const alunos = gerenciador.getAlunos();
    const keys = Object.keys(alunos);

    if (keys.length === 0) {
        container.innerHTML = '<div style="padding:16px;text-align:center;color:#999;">Nenhum aluno cadastrado</div>';
        return;
    }

    container.innerHTML = '';
    for (const id of keys) {
        const aluno = alunos[id];
        const progresso = gerenciador.getProgresso(id);
        const pct = progresso ? progresso.pct || 0 : 0;
        const cursoStr = aluno.curso === 'bcet' ? ' BCET' : ' BMAT';
        const isActive = id === gerenciador.alunoAtivoId;

        const div = document.createElement('div');
        div.className = `aluno-item ${isActive ? 'active' : ''}`;
        const matriculaStr = aluno.matricula ? ' (' + aluno.matricula + ')' : '';

        div.innerHTML = `
            <span class="aluno-name">${aluno.nome}${matriculaStr}${cursoStr}</span>
            <span class="aluno-progress">${progresso ? progresso.done + '/' + progresso.total + ' (' + pct + '%)' : '0/0 (0%)'}</span>
            <div class="aluno-actions">
                <button onclick="event.stopPropagation();window.removerAlunoHandler('${id}')" class="btn-del" title="Remover">x</button>
            </div>
        `;

        div.onclick = function() { window.selecionarAlunoHandler(id); };
        container.appendChild(div);
    }
}

function renderFluxograma(gerenciador) {
    const container = document.getElementById('fluxogramaContent');
    const headerContainer = document.getElementById('alunoHeader');
    const alunoId = gerenciador.alunoAtivoId;
    const aluno = gerenciador.getAlunoAtivo();

    if (!aluno) {
        if (headerContainer) headerContainer.innerHTML = '';
        container.innerHTML = `
            <div class="no-aluno">
                <h3>Adicione um aluno</h3>
                <p>Use o formulário à esquerda ou importe um histórico.</p>
            </div>
        `;
        return;
    }

    if (!aluno.progresso) aluno.progresso = {};
    if (!aluno.optativas) aluno.optativas = {};
    if (!aluno.optativasPlanejadas) aluno.optativasPlanejadas = [];
    if (!aluno.excecoes) aluno.excecoes = [];
    if (!aluno.quebras) aluno.quebras = {};
    if (!aluno.equiv) aluno.equiv = {};

    const curso = aluno.curso || 'bmat';
    const curriculo = getCurriculo(curso);
    const progresso = calcularProgresso(curriculo, aluno.progresso, aluno.optativas);
    const cursoLabel = curso === 'bcet' ? 'BCET - Matemática' : 'BMAT';
    const stats = gerenciador.getEstatisticasOptativas(alunoId);

    if (headerContainer) {
        headerContainer.innerHTML = `
            <div class="aluno-header">
                <h2>${aluno.nome}${aluno.matricula ? ' (' + aluno.matricula + ')' : ''} - ${cursoLabel}</h2>
                <div class="stats-badge">
                    <span class="done-count">Cursadas: ${progresso.done}</span>
                    <span class="pending-count">Cursando: ${progresso.pending}</span>
                    <span class="planned-count">Planejadas: ${progresso.planned}</span>
                    <span class="total-count">Total: ${progresso.total}</span>
                    <span style="background:#1a237e;color:white;padding:2px 10px;border-radius:12px;font-size:12px;">${progresso.pct}%</span>
                </div>
            </div>
        `;
    }

    let html = `
        <div class="legend">
            <div class="legend-item"><span class="legend-color done"></span> Cursada</div>
            <div class="legend-item"><span class="legend-color pending"></span> Cursando</div>
            <div class="legend-item"><span class="legend-color not-started"></span> Não cursada</div>
            <div class="legend-item"><span class="legend-color equiv"></span> Equivalência</div>
            <div class="legend-item"><span class="legend-color opt-selected"></span> Optativa</div>
            <div class="legend-item"><span class="legend-color quebra"></span> Quebra</div>
            <div class="legend-item"><span class="legend-color planned"></span> Planejada</div>
        </div>
        <div class="semester-grid">
    `;

    for (const semestre of curriculo) {
        html += `<div class="semester-card"><div class="semester-title ${semestre.cls}">${semestre.nome}</div>`;
        for (const disc of semestre.disciplinas) {
            if (disc.isOptativa) {
                html += renderOptativa(gerenciador, disc);
            } else {
                html += renderDisciplina(gerenciador, disc);
            }
        }
        html += '</div>';
    }

    html += '</div>';

    html += renderOptativasPlanejadas(gerenciador);
    html += renderExcecoes(gerenciador);

    const extras = getDisciplinasExtras(gerenciador);
    if (extras.length > 0) {
        html += `
            <div style="margin-top:16px;padding:12px 16px;background:#fff3e0;border-radius:8px;border:2px solid #ff6f00;">
                <div style="font-weight:bold;color:#e65100;font-size:14px;margin-bottom:8px;">
                    Disciplinas Extras (do histórico)
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${extras.map(function(d) {
                        const status = aluno.progresso[d.codigo]?.status || 'not-started';
                        const isEquiv = aluno.equiv && aluno.equiv[d.codigo];
                        const isQuebra = aluno.quebras && aluno.quebras[d.codigo];
                        let finalClass = status === 'done' ? 'done' : status === 'planned' ? 'planned' : 'not-started';
                        if (isEquiv && status === 'done') finalClass = 'equiv-done';
                        if (isQuebra) finalClass = 'quebra';
                        const onClick = `onclick="window.toggleDisciplinaHandler('${d.codigo}')"`;
                        return `
                            <div class="discipline ${finalClass}" ${onClick} style="display:inline-block;padding:4px 10px;margin:2px;border-radius:4px;border:1px solid #ddd;cursor:pointer;font-size:12px;">
                                <span class="code">${d.codigo}</span> ${getNomeDisciplina(d.codigo) || d.codigo}
                                <span class="hours">${d.ch || '68h'}</span>
                                ${isEquiv ? '<span class="equiv-badge">Equiv.</span>' : ''}
                                ${isQuebra ? '<span class="quebra-badge">QUEBRA</span>' : ''}
                                ${status === 'planned' ? '<span class="planned-badge">Planejada</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="margin-top:6px;font-size:11px;color:#666;">
                    Disciplinas que estão no histórico mas não fazem parte do currículo atual.
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderDisciplina(gerenciador, disc) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return '';

    const curso = aluno.curso || 'bmat';
    const codigo = disc.codigo;

    const status = aluno.progresso[codigo]?.status || 'not-started';
    const isEquiv = aluno.equiv && aluno.equiv[codigo];
    const isQuebra = aluno.quebras && aluno.quebras[codigo];
    const isOpt = isOptativa(codigo, curso);

    let classe = 'discipline';
    if (isEquiv && status === 'done') classe += ' equiv-done';
    else if (isOpt && status === 'done') classe += ' opt-selected';
    else if (isOpt && status === 'pending') classe += ' opt-pending';
    else if (isQuebra) classe += ' quebra';
    else if (status === 'planned') classe += ' planned';
    else if (status === 'done') classe += ' done';
    else if (status === 'pending') classe += ' pending';
    else classe += ' not-started';

    const prereqCheck = verificarPreRequisitos(codigo, curso, aluno.progresso, aluno.quebras);
    if (prereqCheck.status === 'none') classe += ' prereq-none';
    else if (prereqCheck.status === 'ok') classe += ' prereq-ok';
    else if (prereqCheck.status === 'pending') classe += ' prereq-pending';
    else if (prereqCheck.status === 'blocked') classe += ' prereq-blocked blocked';
    else if (prereqCheck.status === 'quebra') classe += ' prereq-quebra';

    let badge = '';
    if (isEquiv) {
        const equivInfo = aluno.equiv[codigo];
        badge += '<span class="equiv-badge">Equiv.</span>';
        if (equivInfo) badge += ' <span class="prereq-badge">via ' + equivInfo.via + '</span>';
    }
    if (isQuebra) badge += ' <span class="quebra-badge">QUEBRA</span>';
    if (isOpt && !isEquiv) badge += ' <span class="opt-badge">Opt.</span>';
    if (status === 'planned') badge += ' <span class="planned-badge">Planejada</span>';

    const prereqs = getPreRequisitos(codigo, curso);
    if (prereqs.length > 0 && !isEquiv && prereqCheck.status !== 'quebra' && status !== 'planned') {
        const feitos = prereqs.filter(function(p) { return aluno.progresso[p]?.status === 'done'; }).length;
        badge += '<span class="prereq-badge">' + feitos + '/' + prereqs.length + ' pré-req</span>';
    }

    const isBlocked = prereqCheck.status === 'blocked';
    const onClick = isBlocked ? `onclick="window.abrirModalQuebraHandler('${codigo}')"` :
        `onclick="window.toggleDisciplinaHandler('${codigo}')"`;
    const finalOnClick = isEquiv ?
        'style="cursor:default;" onclick="window.showToast(\'Disciplina cursada por equivalência\', \'info\')"' :
        onClick;

    return `
        <button class="${classe}" ${finalOnClick}>
            <span class="code">${codigo}</span> ${getNomeDisciplina(codigo)}
            <span class="hours">${disc.horas || '68h'}</span>
            ${badge}
        </button>
    `;
}

function renderOptativa(gerenciador, disc) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return '';

    const optCodigo = disc.codigo;
    const optSelecionada = aluno.optativas[optCodigo] || null;

    if (!optSelecionada) {
        return `
            <button class="discipline not-started" onclick="window.abrirModalOptativa('${optCodigo}')">
                <span class="code">${optCodigo}</span> Optativa (selecionar)
                <span class="hours">${disc.horas}</span>
                <span style="font-size:10px;color:#666;">(clique para selecionar)</span>
            </button>
        `;
    }

    const optStatus = aluno.progresso[optSelecionada]?.status || 'not-started';
    const isEquiv = aluno.equiv && aluno.equiv[optSelecionada];
    const isQuebra = aluno.quebras && aluno.quebras[optSelecionada];

    let classe = 'discipline';
    let badge = '';
    const nomeDisciplina = getNomeDisciplina(optSelecionada) || optSelecionada;
    let displayName = optSelecionada + ' - ' + nomeDisciplina;

    if (isEquiv && optStatus === 'done') {
        classe += ' equiv-done';
        badge = '<span class="equiv-badge">Equiv.</span>';
        const equivInfo = aluno.equiv[optSelecionada];
        if (equivInfo) badge += ' <span class="prereq-badge">via ' + equivInfo.via + '</span>';
    } else if (isQuebra) {
        classe += ' quebra';
        badge = '<span class="quebra-badge">QUEBRA</span>';
    } else if (optStatus === 'done') {
        classe += ' opt-selected';
        badge = '<span class="opt-badge">Opt.</span>';
    } else if (optStatus === 'pending') {
        classe += ' opt-pending';
        badge = '<span class="opt-badge">Opt.</span>';
    } else if (optStatus === 'planned') {
        classe += ' planned';
        badge = '<span class="planned-badge">Planejada</span>';
    } else {
        classe += ' opt-selected';
        badge = '<span class="opt-badge">Opt.</span>';
    }

    return `
        <button class="${classe}" onclick="window.abrirModalStatusOptativa('${optSelecionada}', '${optCodigo}')">
            <span class="code">${optCodigo}</span> ${displayName}
            <span class="hours">${disc.horas}</span>
            ${badge}
        </button>
    `;
}

function renderOptativasPlanejadas(gerenciador) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return '';

    const planejadas = aluno.optativasPlanejadas || [];
    const stats = gerenciador.getEstatisticasOptativas(gerenciador.alunoAtivoId);

    if (planejadas.length === 0) {
        return `
            <div style="margin-top:16px;padding:12px 16px;background:#f8f9fa;border-radius:8px;border:2px dashed #ddd;text-align:center;">
                <span style="color:#999;font-size:13px;">Nenhuma optativa planejada (0 de 5)</span>
                <button onclick="window.abrirPreMatriculaHandler()" style="margin-left:12px;padding:4px 12px;background:#7c4dff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                    Planejar
                </button>
            </div>
        `;
    }

    let html = `
        <div style="margin-top:16px;padding:12px 16px;background:#f3e5f5;border-radius:8px;border:2px solid #7b1fa2;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <div>
                    <span style="font-weight:bold;color:#4a148c;font-size:15px;">OPTATIVAS PLANEJADAS</span>
                    <span style="margin-left:8px;font-size:12px;color:#666;">(${planejadas.length} de 5)</span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button onclick="window.abrirPreMatriculaHandler()" style="padding:4px 12px;background:#7c4dff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                        Planejar mais
                    </button>
                    ${planejadas.length > 0 ? `
                        <button onclick="window.limparOptativasPlanejadasHandler()" style="padding:4px 12px;background:#ef5350;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                            Limpar todas
                        </button>
                    ` : ''}
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
    `;

    planejadas.forEach(function(codigo, index) {
        const nome = getNomeDisciplina(codigo) || codigo;
        const prioridade = index + 1;
        const emoji = ['1', '2', '3', '4', '5'][index] || '#' + prioridade;

        html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:6px;border-left:4px solid #7b1fa2;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:150px;">
                    <span style="font-weight:bold;font-size:14px;color:#4a148c;">${emoji}</span>
                    <span style="font-weight:500;font-size:13px;">${codigo}</span>
                    <span style="font-size:12px;color:#666;">- ${nome}</span>
                </div>
                <div style="display:flex;gap:4px;">
                    <button onclick="abrirModalStatusOptativa('${codigo}')" 
                            style="padding:2px 10px;background:#7c4dff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">
                        Status
                    </button>
                    <button onclick="window.removerOptativaPlanejadaHandler('${codigo}')" 
                            style="padding:2px 10px;background:#ef5350;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">
                        x
                    </button>
                </div>
            </div>
        `;
    });

    html += `
            </div>
            ${stats && stats.faltando > 0 ? `
                <div style="margin-top:8px;font-size:12px;color:#e65100;background:#fff3e0;padding:6px 12px;border-radius:4px;">
                    Você ainda precisa cursar ${stats.faltando} optativa(s) para concluir o curso.
                </div>
            ` : stats && stats.concluido ? `
                <div style="margin-top:8px;font-size:12px;color:#2e7d32;background:#e8f5e9;padding:6px 12px;border-radius:4px;">
                    Todas as optativas foram cumpridas!
                </div>
            ` : ''}
        </div>
    `;

    return html;
}

// ============================================================
// FUNCAO: RENDER EXCECOES (COM TEXTO MELHORADO)
// ============================================================

function renderExcecoes(gerenciador) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return '';

    const excecoes = aluno.excecoes || [];

    if (excecoes.length === 0) {
        return `
            <div style="margin-top:16px;padding:12px 16px;background:#fff8e1;border-radius:8px;border:2px dashed #ff6f00;text-align:center;">
                <span style="color:#e65100;font-size:13px;">Nenhuma disciplina adicionada</span>
                <button onclick="window.abrirModalExcecoesHandler()" style="margin-left:12px;padding:4px 12px;background:#ff6f00;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                    + Adicionar Disciplina
                </button>
            </div>
        `;
    }

    let html = `
        <div style="margin-top:16px;padding:12px 16px;background:#fff3e0;border-radius:8px;border:2px solid #ff6f00;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                <div>
                    <span style="font-weight:bold;color:#e65100;font-size:15px;">📌 Planejamento Flexível</span>
                    <span style="margin-left:8px;font-size:12px;color:#666;">(${excecoes.length} disciplina(s) adicionada(s))</span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button onclick="window.abrirModalExcecoesHandler()" style="padding:4px 12px;background:#ff6f00;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                        + Adicionar Disciplina
                    </button>
                    ${excecoes.length > 0 ? `
                        <button onclick="window.limparExcecoesHandler()" style="padding:4px 12px;background:#ef5350;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                            Limpar todas
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div style="font-size:12px;color:#bf360c;margin-bottom:10px;background:#fff8e1;padding:6px 12px;border-radius:4px;">
                Este espaço permite que você inclua disciplinas de outros cursos no seu planejamento. 
                Ideal para optativas ou disciplinas do outro PPC que não aparecem no fluxograma acima.
            </div>

            <div style="display:flex;flex-direction:column;gap:4px;">
    `;

    excecoes.forEach(function(exc) {
        const tipoLabel = exc.tipo === 'optativa' ? 'Optativa' : 'Obrigatória';
        const corTipo = exc.tipo === 'optativa' ? '#4a148c' : '#1a237e';

        html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:white;border-radius:6px;border-left:4px solid #ff6f00;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:150px;">
                    <span style="font-weight:bold;font-size:14px;color:#e65100;">!</span>
                    <span style="font-weight:500;font-size:13px;">${exc.codigo}</span>
                    <span style="font-size:12px;color:#666;">- ${exc.nome}</span>
                    <span style="font-size:10px;background:${corTipo};color:white;padding:2px 8px;border-radius:10px;">${tipoLabel}</span>
                </div>
                <div style="display:flex;gap:4px;">
                    <button onclick="window.removerExcecaoHandler('${exc.codigo}')" 
                            style="padding:2px 10px;background:#ef5350;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">
                        x
                    </button>
                </div>
            </div>
        `;
    });

    html += `
            </div>
            <div style="margin-top:8px;font-size:11px;color:#e65100;background:#fff8e1;padding:6px 12px;border-radius:4px;">
                Disciplinas adicionadas aqui aparecerão no relatório como planejadas [P]. 
                Caso sejam equivalentes a alguma disciplina do seu PPC, serão aproveitadas no futuro.
            </div>
        </div>
    `;

    return html;
}

// ============================================================
// FUNCAO: RENDER MODAL EXCECOES
// ============================================================

function renderModalExcecoes(gerenciador) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) {
        showToast('Nenhum aluno selecionado.', 'error');
        return;
    }

    const disciplinas = gerenciador.getDisciplinasForaDoCurriculo(gerenciador.alunoAtivoId);
    const excecoes = aluno.excecoes || [];
    const codigosExcecoes = new Set(excecoes.map(function(e) { return e.codigo; }));

    const modalExistente = document.getElementById('modalExcecoes');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'modalExcecoes';
    modal.style.display = 'flex';

    let html = `
        <div style="background:white;border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,0.3);">
            <h2 style="color:#e65100;margin:0 0 4px 0;">Adicionar Disciplina</h2>
            <div style="color:#666;margin-bottom:16px;font-size:13px;">
                Disciplinas de outros cursos (${aluno.curso === 'bmat' ? 'BMAT → BCET' : 'BCET → BMAT'})
            </div>
            
            <input type="text" id="buscaExcecao" placeholder="Buscar disciplina..." 
                   style="padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px;"
                   onkeyup="window.filtrarDisciplinasExcecao(this.value)">
            
            <div id="listaExcecoes" style="flex:1;overflow-y:auto;max-height:400px;">
    `;

    if (disciplinas.length === 0) {
        html += `
            <div style="text-align:center;padding:40px 20px;color:#999;">
                <p>Nenhuma disciplina de outros cursos disponível.</p>
                <p style="font-size:12px;">Todas as disciplinas do outro curso já estão no currículo atual.</p>
            </div>
        `;
    } else {
        let ultimoTipo = '';
        for (const disc of disciplinas) {
            if (disc.tipo !== ultimoTipo) {
                ultimoTipo = disc.tipo;
                const label = ultimoTipo === 'obrigatoria' ? 'OBRIGATÓRIAS ' + disc.origem.toUpperCase() : 'OPTATIVAS ' + disc.origem.toUpperCase();
                html += `
                    <div style="font-weight:bold;color:#1a237e;margin:12px 0 6px 0;padding-top:8px;border-top:1px solid #e0e0e0;">${label}</div>
                `;
            }

            const isBloqueada = codigosExcecoes.has(disc.codigo);
            const isPlanejada = aluno.progresso[disc.codigo]?.status === 'planned';
            const isCursada = aluno.progresso[disc.codigo]?.status === 'done';
            const isPending = aluno.progresso[disc.codigo]?.status === 'pending';

            const bloqueada = isBloqueada || isPlanejada || isCursada || isPending;
            let motivo = '';
            if (isBloqueada) motivo = 'Já está na lista de disciplinas adicionadas';
            else if (isPlanejada) motivo = 'Já está planejada normalmente';
            else if (isCursada) motivo = 'Já foi cursada';
            else if (isPending) motivo = 'Já está em andamento';

            const bgColor = bloqueada ? '#ffebee' : '#f5f5f5';
            const borderColor = bloqueada ? '#c62828' : (disc.tipo === 'optativa' ? '#4a148c' : '#1a237e');
            const opacidade = bloqueada ? '0.6' : '1';

            html += `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${bgColor};border-radius:6px;margin-bottom:4px;border-left:4px solid ${borderColor};opacity:${opacidade};">
                    <div>
                        <span style="font-weight:500;font-size:13px;">${disc.codigo}</span>
                        <span style="font-size:12px;color:#666;">- ${disc.nome}</span>
                        <span style="font-size:10px;background:${borderColor};color:white;padding:2px 8px;border-radius:10px;margin-left:8px;">${disc.tipo === 'optativa' ? 'Optativa' : 'Obrigatória'} ${disc.origem.toUpperCase()}</span>
                        ${bloqueada ? `<span style="font-size:10px;color:#c62828;margin-left:8px;">[Bloqueado] ${motivo}</span>` : ''}
                    </div>
                    ${bloqueada ? `
                        <button style="padding:4px 12px;background:#bdbdbd;color:#666;border:none;border-radius:4px;cursor:not-allowed;font-size:12px;" disabled>
                            Indisponível
                        </button>
                    ` : `
                        <button onclick="window.adicionarExcecaoHandler('${disc.codigo}')" 
                                style="padding:4px 12px;background:#ff6f00;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                            + Adicionar
                        </button>
                    `}
                </div>
            `;
        }
    }

    html += `
            </div>
            <div style="display:flex;gap:10px;margin-top:12px;padding-top:12px;border-top:2px solid #e0e0e0;">
                <button onclick="window.fecharModalExcecoesHandler()" style="flex:1;padding:10px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                    Fechar
                </button>
            </div>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === this) window.fecharModalExcecoesHandler();
    });
}

// ============================================================
// FUNCOES AUXILIARES
// ============================================================

function getDisciplinasExtras(gerenciador) {
    const aluno = gerenciador.getAlunoAtivo();
    if (!aluno) return [];

    const curso = aluno.curso || 'bmat';
    const curriculo = getCurriculo(curso);
    const codigosDoCurso = new Set();
    for (const sem of curriculo) {
        for (const disc of sem.disciplinas) {
            if (!disc.isOptativa) codigosDoCurso.add(disc.codigo);
        }
    }

    const extras = [];
    for (const codigo in aluno.progresso) {
        if (codigo.startsWith('OPT')) continue;
        if (codigo.startsWith('OPT_BCET')) continue;
        if (codigosDoCurso.has(codigo)) continue;
        if (isOptativa(codigo, curso)) continue;
        if (aluno.equiv && aluno.equiv[codigo]) continue;
        if (aluno.progresso[codigo]?.status === 'not-started') continue;

        extras.push({ codigo: codigo, ch: '68h' });
    }

    return extras;
}

function renderImportPreview(resultado, aluno, pendentes) {
    const preview = document.getElementById('importPreview');
    preview.classList.add('show');

    const countAPR = Object.values(resultado.disciplinas).filter(function(d) { return d.status === 'done'; }).length;

    let html = `
        <div class="success">Disciplinas processadas para <strong>${aluno.nome}</strong>!</div>
        <div class="info">${countAPR} disciplina(s) CURSADAS</div>
        <div class="info">${resultado.optativas.length} optativa(s) identificada(s)</div>
        ${Object.keys(resultado.equivalencias).length > 0 ? '<div class="info">' + Object.keys(resultado.equivalencias).length + ' equivalência(s) aplicada(s)</div>' : ''}
    `;

    if (pendentes && pendentes.total === 0) {
        html += renderOpcoesPosValidacao();
    }

    preview.innerHTML = html;
}

function renderOpcoesPosValidacao() {
    return `
        <div style="background:#e8f5e9;border:2px solid #2e7d32;border-radius:8px;padding:20px;margin-top:10px;">
            <h3 style="color:#1b5e20;margin:0 0 8px 0;">TUDO CORRETO!</h3>
            <p style="margin:4px 0;color:#2e7d32;">
                Todas as verificações foram concluídas e o fluxograma está completo e correto.
            </p>

            <hr style="margin:16px 0;border-color:#a5d6a7;">

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

            <hr style="margin:16px 0;border-color:#a5d6a7;">

            <p style="margin:0;font-size:12px;color:#666;">
                Você pode voltar ao fluxograma a qualquer momento para fazer ajustes manuais.
            </p>
        </div>
    `;
}

function renderErrosCorrecao(pendentes) {
    if (!pendentes || pendentes.total === 0) return '';

    let html = `
        <div style="background:#ffebee;border:2px solid #c62828;border-radius:8px;padding:16px;margin-top:10px;">
            <h3 style="color:#b71c1c;margin:0 0 8px 0;">${pendentes.total} ERRO(S) ENCONTRADO(S)</h3>
            <p style="margin:4px 0;color:#c62828;font-size:13px;">
                Corrija os itens abaixo e clique em "Verificar novamente":
            </p>
    `;

    if (pendentes.fisicas && pendentes.fisicas.length > 0) {
        html += `
            <div style="margin-top:8px;">
                <p style="font-weight:bold;color:#b71c1c;margin:0;">Erros nas Físicas:</p>
                ${pendentes.fisicas.map(function(f) {
                    return `
                        <div style="padding:8px 10px;margin:4px 0;background:#fff8e1;border-left:3px solid #c62828;border-radius:4px;font-size:13px;">
                            <strong>${f.codigo} (${f.nome})</strong>
                            <span style="color:#666;font-size:12px;">
                                -> ${f.componentes.join(' + ')} estão cursadas, mas ${f.codigo} não está como equivalência
                            </span>
                            <br>
                            <span style="color:#bf360c;font-size:12px;">${f.sugestao}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    if (pendentes.optativas && pendentes.optativas.length > 0) {
        html += `
            <div style="margin-top:8px;">
                <p style="font-weight:bold;color:#b71c1c;margin:0;">Erros nas Optativas:</p>
                ${pendentes.optativas.map(function(o) {
                    return `
                        <div style="padding:8px 10px;margin:4px 0;background:#fff8e1;border-left:3px solid #c62828;border-radius:4px;font-size:13px;">
                            <strong>${o.slot}</strong>
                            <span style="color:#666;font-size:12px;">
                                -> Deve conter ${o.esperado} (${o.nome})
                                <br>
                                -> Atual: ${o.atual} | Origem: ${o.via}
                            </span>
                            <br>
                            <span style="color:#bf360c;font-size:12px;">${o.sugestao}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    if (pendentes.ignoradas && pendentes.ignoradas.length > 0) {
        html += `
            <div style="margin-top:8px;">
                <p style="font-weight:bold;color:#b71c1c;margin:0;">Disciplinas que viraram obrigatórias:</p>
                ${pendentes.ignoradas.map(function(i) {
                    return `
                        <div style="padding:8px 10px;margin:4px 0;background:#fff8e1;border-left:3px solid #c62828;border-radius:4px;font-size:13px;">
                            <strong>${i.bmat}</strong> -> <strong>${i.bcet}</strong>
                            <span style="color:#666;font-size:12px;">(optativa virou obrigatória)</span>
                            <br>
                            <span style="color:#bf360c;font-size:12px;">${i.sugestao}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    html += `
        <div style="margin-top:12px;padding-top:8px;border-top:1px solid #ef9a9a;">
            <button onclick="window.verificarCorrecoesHandler()" style="padding:8px 20px;background:#c62828;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;">
                Verificar novamente
            </button>
            <span style="margin-left:10px;font-size:12px;color:#666;">
                ${pendentes.total} erro(s) encontrado(s)
            </span>
        </div>
    </div>
    `;

    return html;
}