// ============================================================
// FUNÇÕES DE RENDERIZAÇÃO
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
        const cursoStr = aluno.curso === 'bcet' ? ' 📘' : ' 📐';
        const isActive = id === gerenciador.alunoAtivoId;

        const div = document.createElement('div');
        div.className = `aluno-item ${isActive ? 'active' : ''}`;
        const matriculaStr = aluno.matricula ? ` (${aluno.matricula})` : '';

        div.innerHTML = `
            <span class="aluno-name">${aluno.nome}${matriculaStr}${cursoStr}</span>
            <span class="aluno-progress">${progresso ? `${progresso.done}/${progresso.total} (${pct}%)` : '0/0 (0%)'}</span>
            <div class="aluno-actions">
                <button onclick="event.stopPropagation();window.removerAlunoHandler('${id}')" class="btn-del" title="Remover" aria-label="Remover aluno">✕</button>
            </div>
        `;

        div.onclick = () => window.selecionarAlunoHandler(id);
        container.appendChild(div);
    }
}

function renderFluxograma(gerenciador) {
    const container = document.getElementById('fluxogramaContent');
    const alunoId = gerenciador.alunoAtivoId;
    const aluno = gerenciador.getAlunoAtivo();

    if (!aluno) {
        container.innerHTML = `
            <div class="no-aluno">
                <h3>👈 Adicione um aluno</h3>
                <p>Use o formulário à esquerda ou importe um histórico.</p>
            </div>
        `;
        return;
    }

    if (!aluno.progresso) aluno.progresso = {};
    if (!aluno.optativas) aluno.optativas = {};
    if (!aluno.quebras) aluno.quebras = {};
    if (!aluno.equiv) aluno.equiv = {};

    const curso = aluno.curso || 'bmat';
    const curriculo = getCurriculo(curso);
    const progresso = calcularProgresso(curriculo, aluno.progresso, aluno.optativas);
    const cursoLabel = curso === 'bcet' ? '📘 BCET - Matemática' : '📐 BMAT';

    let html = `
        <div class="aluno-header">
            <h2>📘 ${aluno.nome} ${aluno.matricula ? `(${aluno.matricula})` : ''} - ${cursoLabel}</h2>
            <div class="stats-badge">
                <span class="done-count">✅ ${progresso.done}</span>
                <span class="pending-count">🟡 ${progresso.pending}</span>
                <span class="planned-count">📌 ${progresso.planned}</span>
                <span class="total-count">📚 ${progresso.total}</span>
                <span style="background:#1a237e;color:white;padding:2px 10px;border-radius:12px;font-size:12px;">${progresso.pct}%</span>
            </div>
        </div>
        <div class="legend">
            <div class="legend-item"><span class="legend-color done"></span> Cursada</div>
            <div class="legend-item"><span class="legend-color pending"></span> Cursando</div>
            <div class="legend-item"><span class="legend-color not-started"></span> Não cursada</div>
            <div class="legend-item"><span class="legend-color equiv"></span> Equivalência</div>
            <div class="legend-item"><span class="legend-color opt-selected"></span> Optativa</div>
            <div class="legend-item"><span class="legend-color quebra"></span> Quebra</div>
            <div class="legend-item" style="background:#f3e5f5;padding:2px 8px;border-radius:12px;">
                <span class="legend-color" style="background:#ce93d8;border-color:#7b1fa2;"></span> 
                Cursará no próximo semestre
            </div>
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
        html += `</div>`;
    }

    // Disciplinas extras
    const extras = getDisciplinasExtras(gerenciador);
    if (extras.length > 0) {
        html += `
            <div class="semester-card" style="grid-column:1/-1;border-color:#ff6f00;">
                <div class="semester-title" style="background:#ff6f00;">📋 Disciplinas Extras</div>
                ${extras.map(d => {
                    const status = aluno.progresso[d.codigo]?.status || 'not-started';
                    const isEquiv = aluno.equiv && aluno.equiv[d.codigo];
                    const isQuebra = aluno.quebras && aluno.quebras[d.codigo];
                    let finalClass = status === 'done' ? 'done' : status === 'planned' ? 'planned' : 'not-started';
                    if (isEquiv && status === 'done') finalClass = 'equiv-done';
                    if (isQuebra) finalClass = 'quebra';
                    const prereqCheck = verificarPreRequisitos(d.codigo, curso, aluno.progresso, aluno.quebras);
                    const isBlocked = prereqCheck.status === 'blocked';
                    const onClick = isBlocked ? `onclick="window.abrirModalQuebraHandler('${d.codigo}')"` :
                        `onclick="window.toggleDisciplinaHandler('${d.codigo}')"`;
                    return `
                        <div class="discipline ${finalClass}" ${onClick} style="border-color:#ff6f00;">
                            <span class="code">${d.codigo}</span> ${getNomeDisciplina(d.codigo) || d.codigo}
                            <span class="hours">${d.ch || '68h'}</span>
                            ${isEquiv ? '<span class="equiv-badge">🔗 Equiv.</span>' : ''}
                            ${isQuebra ? '<span class="quebra-badge">🔓 QUEBRA</span>' : ''}
                            ${status === 'planned' ? '<span class="planned-badge">📌 Planejada</span>' : ''}
                            <span class="quebra-badge">📄 Histórico</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    html += `</div>`;
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
        badge += `<span class="equiv-badge">🔗 Equiv.</span>`;
        if (equivInfo) badge += ` <span class="prereq-badge">via ${equivInfo.via}</span>`;
    }
    if (isQuebra) badge += ` <span class="quebra-badge">🔓 QUEBRA</span>`;
    if (isOpt && !isEquiv) badge += ` <span class="opt-badge">📌 Opt.</span>`;
    if (status === 'planned') badge += ` <span class="planned-badge">📌 Planejada</span>`;

    const prereqs = getPreRequisitos(codigo, curso);
    if (prereqs.length > 0 && !isEquiv && prereqCheck.status !== 'quebra' && status !== 'planned') {
        const feitos = prereqs.filter(p => aluno.progresso[p]?.status === 'done').length;
        badge += `<span class="prereq-badge">${feitos}/${prereqs.length} pré-req</span>`;
    }

    const isBlocked = prereqCheck.status === 'blocked';
    const onClick = isBlocked ? `onclick="window.abrirModalQuebraHandler('${codigo}')"` :
        `onclick="window.toggleDisciplinaHandler('${codigo}')"`;
    const finalOnClick = isEquiv ?
        `style="cursor:default;" onclick="window.showToast('⚠️ Disciplina cursada por equivalência', 'info')"` :
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

    const curso = aluno.curso || 'bmat';
    const optCodigo = disc.codigo;
    const optSelecionada = aluno.optativas[optCodigo] || null;
    let status = 'not-started';
    let displayName = optCodigo;
    let badge = '';
    let classe = 'discipline';

    if (optSelecionada) {
        const optStatus = aluno.progresso[optSelecionada]?.status || 'not-started';
        const isEquiv = aluno.equiv && aluno.equiv[optSelecionada];
        const isQuebra = aluno.quebras && aluno.quebras[optSelecionada];

        if (isEquiv && optStatus === 'done') {
            status = 'equiv-done';
            badge = `<span class="equiv-badge">🔗 Equiv.</span>`;
            const equivInfo = aluno.equiv[optSelecionada];
            if (equivInfo) badge += ` <span class="prereq-badge">via ${equivInfo.via}</span>`;
        } else if (isQuebra) {
            status = 'quebra';
            badge = `<span class="quebra-badge">🔓 QUEBRA</span>`;
        } else if (optStatus === 'done') {
            status = 'opt-selected';
            badge = `<span class="opt-badge">📌 Opt.</span>`;
        } else if (optStatus === 'pending') {
            status = 'opt-pending';
            badge = `<span class="opt-badge">📌 Opt.</span>`;
        } else if (optStatus === 'planned') {
            status = 'planned';
            badge = `<span class="planned-badge">📌 Planejada</span>`;
        } else {
            status = 'opt-selected';
            badge = `<span class="opt-badge">📌 Opt.</span>`;
        }

        const todasOptativas = getTodasOptativas();
        const optInfo = todasOptativas.find(o => o.codigo === optSelecionada);
        displayName = `${optSelecionada} - ${optInfo ? optInfo.nome : 'Optativa'}`;
    } else {
        displayName = 'Optativa (selecionar)';
        status = 'not-started';
    }

    if (status === 'equiv-done') classe += ' equiv-done';
    else if (status === 'opt-selected') classe += ' opt-selected';
    else if (status === 'opt-pending') classe += ' opt-pending';
    else if (status === 'quebra') classe += ' quebra';
    else if (status === 'planned') classe += ' planned';
    else if (status === 'done') classe += ' done';
    else if (status === 'pending') classe += ' pending';
    else classe += ' not-started';

    return `
        <button class="${classe}" onclick="window.toggleDisciplinaHandler('${optCodigo}')">
            <span class="code">${optCodigo}</span> ${displayName}
            <span class="hours">${disc.horas}</span>
            ${badge}
        </button>
    `;
}

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

        extras.push({ codigo, ch: '68h' });
    }

    return extras;
}

function renderImportPreview(resultado, aluno, pendentes) {
    const preview = document.getElementById('importPreview');
    preview.classList.add('show');

    const countAPR = Object.values(resultado.disciplinas).filter(d => d.status === 'done').length;

    let html = `
        <div class="success">✅ Disciplinas processadas para <strong>${aluno.nome}</strong>!</div>
        <div class="info">📚 ${countAPR} disciplinas CURSADAS</div>
        <div class="info">📌 ${resultado.optativas.length} optativa(s) identificada(s)</div>
        ${Object.keys(resultado.equivalencias).length > 0 ? `<div class="info">🔗 ${Object.keys(resultado.equivalencias).length} equivalência(s) aplicada(s)</div>` : ''}
    `;

    if (pendentes && pendentes.total === 0) {
        html += renderOpcoesPosValidacao();
    }

    preview.innerHTML = html;
}

function renderOpcoesPosValidacao() {
    return `
        <div style="background:#e8f5e9;border:2px solid #2e7d32;border-radius:8px;padding:20px;margin-top:10px;">
            <h3 style="color:#1b5e20;margin:0 0 8px 0;">✅ TUDO CORRETO!</h3>
            <p style="margin:4px 0;color:#2e7d32;">
                Todas as verificações foram concluídas e o fluxograma está completo e correto.
            </p>

            <hr style="margin:16px 0;border-color:#a5d6a7;">

            <p style="font-weight:bold;color:#1a237e;margin:0 0 12px 0;">📋 O que você deseja fazer agora?</p>

            <div style="display:flex;flex-wrap:wrap;gap:12px;">
                <button onclick="window.gerarPDFHandler()" style="flex:1;min-width:200px;padding:14px 20px;background:#1a237e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
                    📄 Gerar PDF
                    <br><span style="font-weight:normal;font-size:12px;opacity:0.8;">Exportar o fluxograma completo</span>
                </button>

                <button onclick="window.abrirPreMatriculaHandler()" style="flex:1;min-width:200px;padding:14px 20px;background:#ce93d8;color:#1a237e;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
                    📋 Fazer pré-matrícula
                    <br><span style="font-weight:normal;font-size:12px;opacity:0.8;">Planejar disciplinas para o próximo semestre</span>
                </button>
            </div>

            <hr style="margin:16px 0;border-color:#a5d6a7;">

            <p style="margin:0;font-size:12px;color:#666;">
                💡 Você pode voltar ao fluxograma a qualquer momento para fazer ajustes manuais.
            </p>
        </div>
    `;
}

function renderErrosCorrecao(pendentes) {
    if (!pendentes || pendentes.total === 0) return '';

    let html = `
        <div style="background:#ffebee;border:2px solid #c62828;border-radius:8px;padding:16px;margin-top:10px;">
            <h3 style="color:#b71c1c;margin:0 0 8px 0;">❌ ${pendentes.total} ERRO(S) ENCONTRADO(S)</h3>
            <p style="margin:4px 0;color:#c62828;font-size:13px;">
                Corrija os itens abaixo e clique em "Verificar novamente":
            </p>
    `;

    if (pendentes.fisicas && pendentes.fisicas.length > 0) {
        html += `
            <div style="margin-top:8px;">
                <p style="font-weight:bold;color:#b71c1c;margin:0;">📌 Erros nas Físicas:</p>
                ${pendentes.fisicas.map(f => `
                    <div style="padding:8px 10px;margin:4px 0;background:#fff8e1;border-left:3px solid #c62828;border-radius:4px;font-size:13px;">
                        <strong>❌ ${f.codigo} (${f.nome})</strong>
                        <span style="color:#666;font-size:12px;">
                            → ${f.componentes.join(' + ')} estão cursadas, mas ${f.codigo} não está como equivalência
                        </span>
                        <br>
                        <span style="color:#bf360c;font-size:12px;">💡 ${f.sugestao}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (pendentes.optativas && pendentes.optativas.length > 0) {
        html += `
            <div style="margin-top:8px;">
                <p style="font-weight:bold;color:#b71c1c;margin:0;">📌 Erros nas Optativas:</p>
                ${pendentes.optativas.map(o => `
                    <div style="padding:8px 10px;margin:4px 0;background:#fff8e1;border-left:3px solid #c62828;border-radius:4px;font-size:13px;">
                        <strong>❌ ${o.slot}</strong>
                        <span style="color:#666;font-size:12px;">
                            → Deve conter ${o.esperado} (${o.nome})
                            <br>
                            → Atual: ${o.atual} | Origem: ${o.via}
                        </span>
                        <br>
                        <span style="color:#bf360c;font-size:12px;">💡 ${o.sugestao}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (pendentes.ignoradas && pendentes.ignoradas.length > 0) {
        html += `
            <div style="margin-top:8px;">
                <p style="font-weight:bold;color:#b71c1c;margin:0;">📌 Disciplinas que viraram obrigatórias:</p>
                ${pendentes.ignoradas.map(i => `
                    <div style="padding:8px 10px;margin:4px 0;background:#fff8e1;border-left:3px solid #c62828;border-radius:4px;font-size:13px;">
                        <strong>⚠️ ${i.bmat}</strong> → <strong>${i.bcet}</strong>
                        <span style="color:#666;font-size:12px;">(optativa virou obrigatória)</span>
                        <br>
                        <span style="color:#bf360c;font-size:12px;">💡 ${i.sugestao}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    html += `
        <div style="margin-top:12px;padding-top:8px;border-top:1px solid #ef9a9a;">
            <button onclick="window.verificarCorrecoesHandler()" style="padding:8px 20px;background:#c62828;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;">
                🔍 Verificar novamente
            </button>
            <span style="margin-left:10px;font-size:12px;color:#666;">
                ${pendentes.total} erro(s) encontrado(s)
            </span>
        </div>
    </div>
    `;

    return html;
}