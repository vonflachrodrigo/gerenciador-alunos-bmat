        // ============================================================
        // 1. CONFIGURAÇÃO CENTRALIZADA
        // ============================================================
        // está no config.js
        // ============================================================
        // 2. LÓGICA DE NEGÓCIO (FUNÇÕES PURAS)
        // ============================================================

        // 2.1 Normalização de código
        // 2.2 Verifica se é optativa no curso atual
        // 2.3 Verifica se é optativa em qualquer curso
        // 2.4 Obtém equivalência
        // 2.5 Obtém nome da disciplina
        // 2.6 Obtém pré-requisitos
        // 2.7 Processa disciplinas do histórico
        // 2.8 Aloca optativas
        // 2.9 Calcula progresso
        // ...
        // 2.13
        // ============================================================
        // 3. GERENCIAMENTO DE ESTADO
        // ============================================================

        let state = {
            alunos: {},
            nextId: 1,
            alunoAtivoId: null,
            cursoAtivo: 'bmat'
        };

        let modalContexto = null;
        let quebraContexto = null;

        // ============================================================
        // 4. FUNÇÕES DE INTERFACE
        // ============================================================

        // 4.1 Renderizar lista de alunos
        function renderAlunoList() {
            const container = document.getElementById('alunoList');
            const keys = Object.keys(state.alunos);
            if (keys.length === 0) {
                container.innerHTML = '<div style="padding:16px;text-align:center;color:#999;">Nenhum aluno cadastrado</div>';
                return;
            }
            container.innerHTML = '';
            for (const id of keys) {
                const aluno = state.alunos[id];
                const curriculo = getCurriculo(aluno.curso || 'bmat');
                const progresso = calcularProgresso(curriculo, aluno.progresso || {}, aluno.optativas || {});
                const pct = progresso.pct || 0;

                const div = document.createElement('div');
                div.className = `aluno-item ${id === state.alunoAtivoId ? 'active' : ''}`;
                const matriculaStr = aluno.matricula ? ` (${aluno.matricula})` : '';
                const cursoStr = aluno.curso === 'bcet' ? ' 📘' : ' 📐';
                div.innerHTML = `
                        <span class="aluno-name">${aluno.nome}${matriculaStr}${cursoStr}</span>
                        <span class="aluno-progress">${progresso.done}/${progresso.total} (${pct}%)</span>
                        <div class="aluno-actions">
                            <button onclick="event.stopPropagation();deleteAluno('${id}')" class="btn-del" title="Remover" aria-label="Remover aluno">✕</button>
                        </div>
                    `;
                div.onclick = () => selectAluno(id);
                container.appendChild(div);
            }
        }

        // 4.2 Selecionar aluno
        function selectAluno(id) {
            state.alunoAtivoId = id;
            renderAlunoList();
            renderFluxograma(id);
        }

        // 4.3 Adicionar aluno
        function addAlunoCompleto() {
            const nomeInput = document.getElementById('newAlunoNome');
            const matriculaInput = document.getElementById('newAlunoMatricula');
            const nome = nomeInput.value.trim();
            const matricula = matriculaInput.value.trim();

            if (!nome) {
                showToast('Digite o nome do aluno!', 'error');
                return;
            }

            const id = String(state.nextId++);
            state.alunos[id] = {
                nome: nome,
                matricula: matricula || '',
                progresso: {},
                optativas: {},
                quebras: {},
                equiv: {},
                historico_completo: {},
                historico_optativas: {},
                curso: state.cursoAtivo,
                dadosPessoais: {}
            };

            nomeInput.value = '';
            matriculaInput.value = '';

            renderAlunoList();
            state.alunoAtivoId = id;
            renderFluxograma(id);
            updateAlunoCount();
            saveData();
            showToast(`✅ Aluno "${nome}" adicionado!`, 'success');
        }

        // 4.4 Adicionar múltiplos alunos
        function addMultipleAlunos() {
            const texto = prompt('Digite os nomes dos alunos, um por linha. Para matrícula, use: Nome | Matrícula');
            if (!texto) return;
            const linhas = texto.split('\n').map(s => s.trim()).filter(s => s);
            if (linhas.length === 0) {
                showToast('Nenhum nome válido.', 'error');
                return;
            }

            const nomesExistentes = new Set();
            const matriculasExistentes = new Set();
            for (const id in state.alunos) {
                nomesExistentes.add(state.alunos[id].nome.toLowerCase().trim());
                if (state.alunos[id].matricula) matriculasExistentes.add(state.alunos[id].matricula);
            }

            let count = 0,
                ignorados = 0;
            for (const linha of linhas) {
                const partes = linha.split('|').map(s => s.trim());
                const nome = partes[0];
                const matricula = partes[1] || '';
                if (!nome) continue;

                const nomeLower = nome.toLowerCase().trim();
                if (nomesExistentes.has(nomeLower)) { ignorados++; continue; }
                if (matricula && matriculasExistentes.has(matricula)) { ignorados++; continue; }

                const id = String(state.nextId++);
                state.alunos[id] = {
                    nome: nome,
                    matricula: matricula,
                    progresso: {},
                    optativas: {},
                    quebras: {},
                    equiv: {},
                    historico_completo: {},
                    historico_optativas: {},
                    curso: state.cursoAtivo,
                    dadosPessoais: {}
                };
                nomesExistentes.add(nomeLower);
                if (matricula) matriculasExistentes.add(matricula);
                count++;
            }

            renderAlunoList();
            updateAlunoCount();
            saveData();
            let msg = `✅ ${count} alunos adicionados!`;
            if (ignorados > 0) msg += ` ⚠️ ${ignorados} duplicatas ignoradas.`;
            showToast(msg, 'success');
        }

        // 4.5 Deletar aluno
        function deleteAluno(id) {
            if (!confirm(`Remover aluno "${state.alunos[id].nome}"?`)) return;
            delete state.alunos[id];
            if (state.alunoAtivoId === id) {
                const keys = Object.keys(state.alunos);
                state.alunoAtivoId = keys.length > 0 ? keys[0] : null;
            }
            renderAlunoList();
            if (state.alunoAtivoId) {
                renderFluxograma(state.alunoAtivoId);
            } else {
                document.getElementById('fluxogramaContent').innerHTML =
                    `<div class="no-aluno"><h3>👈 Adicione um aluno</h3><p>Use o formulário à esquerda ou importe um histórico.</p></div>`;
            }
            updateAlunoCount();
            saveData();
            showToast('🗑️ Aluno removido.', 'info');
        }

        // 4.6 Selecionar curso
        function selecionarCurso(curso) {
            state.cursoAtivo = curso;
            document.getElementById('cursoBMAT').className = curso === 'bmat' ? 'active' : '';
            document.getElementById('cursoBCET').className = curso === 'bcet' ? 'active' : '';

            if (state.alunoAtivoId && state.alunos[state.alunoAtivoId]) {
                const aluno = state.alunos[state.alunoAtivoId];
                aluno.curso = curso;
                renderFluxograma(state.alunoAtivoId);
            }
            saveData();
            showToast(`📚 Curso ${curso === 'bmat' ? 'BMAT (PPC 2013)' : 'BCET - Matemática (PPC 2025)'} selecionado`, 'info');
        }

        // 4.7 Renderizar fluxograma
        function renderFluxograma(alunoId) {
            const aluno = state.alunos[alunoId];
            if (!aluno) {
                document.getElementById('fluxogramaContent').innerHTML =
                    `<div class="no-aluno"><h3>👈 Aluno não encontrado</h3></div>`;
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
                        html += renderOptativa(alunoId, disc);
                    } else {
                        html += renderDisciplina(alunoId, disc);
                    }
                }
                html += `</div>`;
            }

            // Disciplinas extras
            const extras = getDisciplinasExtras(alunoId);
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
                                const onClick = isBlocked ? `onclick="abrirModalQuebra('${alunoId}','${d.codigo}')"` :
                                    `onclick="toggleDiscipline('${alunoId}','${d.codigo}')"`;
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
            document.getElementById('fluxogramaContent').innerHTML = html;
        }

        // 4.8 Renderizar disciplina
        function renderDisciplina(alunoId, disc) {
            const aluno = state.alunos[alunoId];
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
            const onClick = isBlocked ? `onclick="abrirModalQuebra('${alunoId}','${codigo}')"` :
                `onclick="toggleDiscipline('${alunoId}','${codigo}')"`;
            const finalOnClick = isEquiv ?
                `style="cursor:default;" onclick="showToast('⚠️ Disciplina cursada por equivalência', 'info')"` :
                onClick;

            return `
                    <button class="${classe}" ${finalOnClick}>
                        <span class="code">${codigo}</span> ${getNomeDisciplina(codigo)}
                        <span class="hours">${disc.horas || '68h'}</span>
                        ${badge}
                    </button>
                `;
        }

        // 4.9 Renderizar optativa
        function renderOptativa(alunoId, disc) {
            const aluno = state.alunos[alunoId];
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
                    <button class="${classe}" onclick="toggleDiscipline('${alunoId}','${optCodigo}')">
                        <span class="code">${optCodigo}</span> ${displayName}
                        <span class="hours">${disc.horas}</span>
                        ${badge}
                    </button>
                `;
        }

        // 4.10 Toggle discipline
        function toggleDiscipline(alunoId, codigo) {
            const aluno = state.alunos[alunoId];
            if (!aluno) return;
            if (!aluno.progresso) aluno.progresso = {};
            if (!aluno.historico_completo) aluno.historico_completo = {};

            const curso = aluno.curso || 'bmat';
            const slots = getSlotsOptativa(curso);

            if (aluno.equiv && aluno.equiv[codigo]) {
                showToast('⚠️ Disciplina cursada por equivalência', 'info');
                return;
            }

            // Se for slot de optativa
            if (slots.includes(codigo)) {
                abrirModalOptativa(alunoId, codigo);
                return;
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
                renderFluxograma(alunoId);
                renderAlunoList();
                saveData();
                const msg = next === 'done' ? '✅ cursada' : next === 'planned' ? '📌 planejada' : '🟡 cursando';
                showToast(`📌 ${codigo} ${msg}`, 'info');
                return;
            }

            // Disciplina normal
            const prereqCheck = verificarPreRequisitos(codigo, curso, aluno.progresso, aluno.quebras);
            if (prereqCheck.status === 'blocked') {
                abrirModalQuebra(alunoId, codigo);
                return;
            }

            const states = ['not-started', 'pending', 'done', 'planned'];
            const current = aluno.progresso[codigo]?.status || 'not-started';
            const nextIndex = (states.indexOf(current) + 1) % states.length;
            aluno.progresso[codigo] = { status: states[nextIndex], origem: 'manual' };
            aluno.historico_completo[codigo] = {
                status: states[nextIndex],
                origem: curso,
                data: new Date().toISOString()
            };

            renderFluxograma(alunoId);
            renderAlunoList();
            saveData();
        }

        // 4.11 Abrir modal optativa
        function abrirModalOptativa(alunoId, optCodigo) {
            const aluno = state.alunos[alunoId];
            if (!aluno) return;

            modalContexto = { alunoId, optCodigo };

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

            // Verifica optativas já alocadas
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

            // Filtra optativas já alocadas em outros slots
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
                const invalidaLabel = !isValida && !isSelected && !isOcupado ? ' ⚠️' : '';
                const ocupadoLabel = isOcupado && !isSelected ? ' 🔒' : '';

                div.innerHTML = `
                        <span class="opt-code">${opt.codigo}</span>
                        ${opt.nome} ${origemLabel}
                        <span class="opt-pre">${preDisplay}</span>
                        ${isSelected ? ' ✅ Selecionada' : ''}
                        ${invalidaLabel}
                        ${ocupadoLabel}
                    `;

                if (isOcupado && !isSelected) {
                    div.onclick = () => showToast(`⚠️ ${opt.codigo} já selecionada em outro semestre`, 'error');
                } else {
                    div.onclick = () => selecionarOptativa(opt.codigo);
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

        // 4.12 Selecionar optativa
        function selecionarOptativa(codigo) {
            if (!modalContexto) return;
            const { alunoId, optCodigo } = modalContexto;
            const aluno = state.alunos[alunoId];
            if (!aluno) return;

            if (!aluno.historico_optativas) aluno.historico_optativas = {};
            if (!aluno.historico_completo) aluno.historico_completo = {};

            const slots = getSlotsOptativa(aluno.curso || 'bmat');

            // Verifica duplicidade
            for (const slot of slots) {
                if (slot === optCodigo) continue;
                if (aluno.optativas[slot] === codigo) {
                    showToast(`⚠️ A optativa ${codigo} já foi selecionada em outro semestre!`, 'error');
                    return;
                }
            }

            // Verifica se é optativa global
            if (!isOptativaGlobal(codigo)) {
                showToast(`⚠️ ${codigo} não é uma optativa válida!`, 'error');
                return;
            }

            // Aviso se não é válida no curso atual
            if (!isOptativa(codigo, aluno.curso || 'bmat')) {
                if (!confirm(`⚠️ ${codigo} não é uma optativa válida no curso atual.\n\nDeseja mesmo assim selecioná-la?`)) {
                    return;
                }
            }

            // Verifica pré-requisitos
            const prereqs = getPreRequisitos(codigo, aluno.curso || 'bmat');
            if (prereqs.length > 0) {
                const temTodos = prereqs.every(pre => aluno.progresso[pre]?.status === 'done');
                if (!temTodos) {
                    const preNomes = prereqs.map(c => `${c} - ${getNomeDisciplina(c)}`).join(', ');
                    if (!confirm(
                            `⚠️ O aluno não possui todos os pré-requisitos.\n\nPré-requisitos necessários:\n${preNomes}\n\nDeseja continuar?`
                        )) {
                        return;
                    }
                }
            }

            // Adiciona ou remove
            if (aluno.optativas[optCodigo] === codigo) {
                delete aluno.optativas[optCodigo];
                delete aluno.progresso[codigo];
                delete aluno.historico_optativas[optCodigo];
                showToast(`🗑️ Optativa ${codigo} removida!`, 'info');
            } else {
                if (aluno.optativas[optCodigo]) {
                    const antiga = aluno.optativas[optCodigo];
                    delete aluno.progresso[antiga];
                }
                aluno.optativas[optCodigo] = codigo;
                aluno.progresso[codigo] = { status: 'pending', origem: 'manual' };
                aluno.historico_optativas[optCodigo] = {
                    codigo: codigo,
                    origem: aluno.curso || 'bmat',
                    data: new Date().toISOString()
                };
                aluno.historico_completo[codigo] = {
                    status: 'pending',
                    origem: aluno.curso || 'bmat',
                    data: new Date().toISOString()
                };
                showToast(`✅ Optativa ${codigo} selecionada!`, 'success');
            }

            closeOptModal();
            renderFluxograma(alunoId);
            renderAlunoList();
            saveData();
        }

        // 4.13 Fechar modal optativa
        function closeOptModal() {
            document.getElementById('optModal').classList.remove('show');
            modalContexto = null;
        }

        // 4.14 Limpar optativa
        function clearOptativa() {
            if (!modalContexto) return;
            const { alunoId, optCodigo } = modalContexto;
            const aluno = state.alunos[alunoId];
            if (!aluno) return;

            if (aluno.optativas[optCodigo]) {
                const antiga = aluno.optativas[optCodigo];
                delete aluno.progresso[antiga];
                delete aluno.optativas[optCodigo];
                delete aluno.historico_optativas[optCodigo];
            }

            closeOptModal();
            renderFluxograma(alunoId);
            renderAlunoList();
            saveData();
            showToast('🗑️ Optativa removida!', 'info');
        }

        document.getElementById('optModal').addEventListener('click', function(e) {
            if (e.target === this) closeOptModal();
        });

        // 4.15 Modal quebra
        function abrirModalQuebra(alunoId, codigo) {
            const aluno = state.alunos[alunoId];
            if (!aluno) return;

            quebraContexto = { alunoId, codigo };
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
        }

        function confirmarQuebra() {
            if (!quebraContexto) return;
            const { alunoId, codigo } = quebraContexto;
            const aluno = state.alunos[alunoId];
            if (!aluno) return;

            if (!aluno.quebras) aluno.quebras = {};
            aluno.quebras[codigo] = true;

            if (!aluno.progresso[codigo] || aluno.progresso[codigo]?.status === 'not-started') {
                aluno.progresso[codigo] = { status: 'pending', origem: 'quebra' };
            }

            fecharModalQuebra();
            renderFluxograma(alunoId);
            renderAlunoList();
            saveData();
            showToast(`🔓 Quebra concedida para ${codigo}!`, 'success');
        }

        function removerQuebra() {
            if (!quebraContexto) return;
            const { alunoId, codigo } = quebraContexto;
            const aluno = state.alunos[alunoId];
            if (!aluno) return;

            if (aluno.quebras && aluno.quebras[codigo]) {
                delete aluno.quebras[codigo];
                fecharModalQuebra();
                renderFluxograma(alunoId);
                renderAlunoList();
                saveData();
                showToast(`🗑️ Quebra removida para ${codigo}`, 'info');
            } else {
                showToast('❌ Nenhuma quebra encontrada.', 'error');
            }
        }

        function fecharModalQuebra() {
            document.getElementById('quebraModal').classList.remove('show');
            quebraContexto = null;
        }

        document.getElementById('quebraModal').addEventListener('click', function(e) {
            if (e.target === this) fecharModalQuebra();
        });

        // 4.16 Disciplinas extras
        function getDisciplinasExtras(alunoId) {
            const aluno = state.alunos[alunoId];
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

        // 4.17 Importar histórico
        async function importarHistorico(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!state.alunoAtivoId || !state.alunos[state.alunoAtivoId]) {
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

                const aluno = state.alunos[state.alunoAtivoId];
                const curso = aluno.curso || 'bmat';

                // Processa o histórico
                const resultado = processarHistorico(todasOcorrencias, curso);

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
                aluno.optativas = alocarOptativas(resultado.optativas, aluno.optativas, slotsDisponiveis);

                // Salva histórico das optativas
                for (const slot in aluno.optativas) {
                    if (!aluno.historico_optativas[slot]) {
                        aluno.historico_optativas[slot] = {
                            codigo: aluno.optativas[slot],
                            origem: 'importado',
                            data: new Date().toISOString()
                        };
                    }
                }

                aluno.curso = curso;

                renderFluxograma(state.alunoAtivoId);
                renderAlunoList();
                saveData();

                const countAPR = Object.values(resultado.disciplinas).filter(d => d.status === 'done').length;
                let html = `
                        <div class="success">✅ Disciplinas processadas para <strong>${aluno.nome}</strong>!</div>
                        <div class="info">📚 ${countAPR} disciplinas CURSADAS</div>
                        <div class="info">📌 ${resultado.optativas.length} optativa(s) identificada(s)</div>
                        ${Object.keys(resultado.equivalencias).length > 0 ? `<div class="info">🔗 ${Object.keys(resultado.equivalencias).length} equivalência(s) aplicada(s)</div>` : ''}
                    `;

                preview.innerHTML = html;

                // ============================================================
                // VERIFICA SE HÁ PENDÊNCIAS E EXIBE OPÇÕES
                // ============================================================
                const pendentes = verificarStatusCorrecoes(state.alunoAtivoId);
                if (pendentes.total === 0) {
                    exibirOpcoesPosValidacao();
                } else {
                    verificarCorrecoes();
                }

                showToast(`✅ ${countAPR} disciplinas processadas!`, 'success');

            } catch (error) {
                console.error('❌ Erro ao importar:', error);
                preview.innerHTML = `<div class="error">❌ Erro ao processar o PDF: ${error.message}</div>`;
                showToast('❌ Erro ao importar o PDF', 'error');
            }

            event.target.value = '';
        }

        // 4.18 Atualizar contagem de alunos
        function updateAlunoCount() {
            document.getElementById('alunoCount').textContent = Object.keys(state.alunos).length;
        }

        // 4.19 Alternar versão
        function alternarVersao() {
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
            if (state.alunoAtivoId && state.alunos[state.alunoAtivoId]) {
                renderFluxograma(state.alunoAtivoId);
            }
            showToast(`📱 Versão ${grid.classList.contains('modo-mobile') ? 'Mobile' : 'Clássica'} ativada!`, 'info');
        }

        // 4.20 Toast
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

        // 4.21 Salvar dados
        function saveData() {
            localStorage.setItem('gerenciador_bmat_bcet_status', JSON.stringify({
                alunos: state.alunos,
                nextId: state.nextId,
                cursoAtivo: state.cursoAtivo
            }));
        }

        // 4.22 Exportar dados
        function exportAllData() {
            const data = {
                alunos: state.alunos,
                nextId: state.nextId,
                cursoAtivo: state.cursoAtivo,
                exportado: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `alunos_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('📤 Dados exportados!', 'success');
        }

        // 4.23 Importar dados
        function importAllData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.alunos && typeof data.alunos === 'object') {
                        state.alunos = data.alunos;
                        state.nextId = data.nextId || 1;
                        if (data.cursoAtivo) state.cursoAtivo = data.cursoAtivo;
                        for (const id in state.alunos) {
                            if (!state.alunos[id].progresso) state.alunos[id].progresso = {};
                            if (!state.alunos[id].optativas) state.alunos[id].optativas = {};
                            if (!state.alunos[id].quebras) state.alunos[id].quebras = {};
                            if (!state.alunos[id].equiv) state.alunos[id].equiv = {};
                            if (!state.alunos[id].historico_completo) state.alunos[id].historico_completo = {};
                            if (!state.alunos[id].historico_optativas) state.alunos[id].historico_optativas = {};
                            if (!state.alunos[id].curso) state.alunos[id].curso = 'bmat';
                        }
                        document.getElementById('cursoBMAT').className = state.cursoAtivo === 'bmat' ? 'active' : '';
                        document.getElementById('cursoBCET').className = state.cursoAtivo === 'bcet' ? 'active' : '';
                        const keys = Object.keys(state.alunos);
                        state.alunoAtivoId = keys.length > 0 ? keys[0] : null;
                        renderAlunoList();
                        if (state.alunoAtivoId) renderFluxograma(state.alunoAtivoId);
                        updateAlunoCount();
                        saveData();
                        showToast(`📥 Importados ${keys.length} alunos!`, 'success');
                    } else {
                        showToast('❌ Formato inválido.', 'error');
                    }
                } catch (err) {
                    showToast('❌ Erro ao importar: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        // 4.24 Limpar todos os dados
        function clearAllData() {
            if (!confirm('⚠️ Tem certeza que deseja apagar TODOS os dados?')) return;
            state.alunos = {};
            state.nextId = 1;
            state.alunoAtivoId = null;
            renderAlunoList();
            document.getElementById('fluxogramaContent').innerHTML =
                `<div class="no-aluno"><h3>👈 Adicione um aluno</h3><p>Use o formulário à esquerda ou importe um histórico.</p></div>`;
            updateAlunoCount();
            saveData();
            showToast('🗑️ Todos os dados foram removidos.', 'info');
        }

        // ============================================================
        // 4.25 GERAR PDF - RELATÓRIO ESTRUTURADO COM LEGENDA
        // ============================================================

        function gerarPDFVisual() {
            if (!state.alunoAtivoId || !state.alunos[state.alunoAtivoId]) {
                showToast('❌ Selecione um aluno primeiro!', 'error');
                return;
            }

            const aluno = state.alunos[state.alunoAtivoId];
            const curso = aluno.curso || 'bmat';
            const curriculo = getCurriculo(curso);
            const progresso = calcularProgresso(curriculo, aluno.progresso, aluno.optativas);
            const cursoLabel = curso === 'bcet' ? 'BCET - Itinerário Matemática (PPC 2025)' : 'BMAT (PPC 2013)';

            const linhas = [];
            const separador = '='.repeat(60);
            const separador2 = '-'.repeat(60);

            // ============================================================
            // CABEÇALHO
            // ============================================================
            linhas.push('RELATÓRIO ACADÊMICO');
            linhas.push(separador);
            linhas.push(`Aluno: ${aluno.nome}`);
            if (aluno.matricula) linhas.push(`Matrícula: ${aluno.matricula}`);
            linhas.push(`Curso: ${cursoLabel}`);
            linhas.push(`Progresso: ${progresso.done}/${progresso.total} (${progresso.pct}%)`);
            if (progresso.planned > 0) linhas.push(`Planejadas: ${progresso.planned} disciplinas`);
            linhas.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
            linhas.push('');

            // ============================================================
            // DISCIPLINAS POR SEMESTRE
            // ============================================================
            linhas.push('DISCIPLINAS POR SEMESTRE');
            linhas.push(separador);

            for (const semestre of curriculo) {
                let temDisciplinas = false;
                for (const disc of semestre.disciplinas) {
                    const codigo = disc.codigo;
                    if (disc.isOptativa) {
                        const optCod = aluno.optativas[codigo];
                        if (optCod) {
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
                            badge = '';
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

            // ============================================================
            // EQUIVALÊNCIAS
            // ============================================================
            if (Object.keys(aluno.equiv || {}).length > 0) {
                linhas.push('');
                linhas.push('EQUIVALENCIAS APLICADAS');
                linhas.push(separador);
                for (const [codigo, info] of Object.entries(aluno.equiv)) {
                    linhas.push(`  ${codigo} -> via ${info.via}`);
                }
            }

            // ============================================================
            // OPTATIVAS SELECIONADAS
            // ============================================================
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

            // ============================================================
            // PLANEJADAS PARA PROXIMO SEMESTRE
            // ============================================================
            const planejadas = Object.entries(aluno.progresso || {}).filter(
                ([codigo, info]) => info?.status === 'planned'
            );
            if (planejadas.length > 0) {
                linhas.push('');
                linhas.push('PLANEJADAS PARA PROXIMO SEMESTRE');
                linhas.push(separador);
                for (const [codigo, info] of planejadas) {
                    const nome = getNomeDisciplina(codigo) || codigo;
                    const horas = '68h';
                    linhas.push(`  [P] ${codigo} - ${nome} (${horas})`);
                }
            }

            // ============================================================
            // DISCIPLINAS PENDENTES
            // ============================================================
            const pendentes = [];
            for (const semestre of curriculo) {
                for (const disc of semestre.disciplinas) {
                    const codigo = disc.codigo;
                    if (disc.isOptativa) {
                        const optCod = aluno.optativas[codigo];
                        if (!optCod) {
                            pendentes.push({ codigo: codigo, nome: 'Optativa (não selecionada)', horas: disc.horas ||
                                    '68h' });
                        } else {
                            const status = aluno.progresso[optCod]?.status || 'not-started';
                            if (status === 'not-started') {
                                pendentes.push({ codigo: optCod, nome: getNomeDisciplina(optCod) || optCod, horas: disc
                                        .horas || '68h' });
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

            // ============================================================
            // LEGENDA
            // ============================================================
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

            // ============================================================
            // RODAPÉ
            // ============================================================
            linhas.push('');
            linhas.push(separador);
            linhas.push(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`);
            linhas.push('Gerenciador de Alunos - BMAT/BCET');

            // ============================================================
            // GERAR PDF
            // ============================================================
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
        }

        // ============================================================
        // 5. NOVAS FUNÇÕES DE VALIDAÇÃO E PRÉ-MATRÍCULA (COM OPTATIVAS)
        // ============================================================

        let planejamentoTemp = {};

        // 5.1 Verifica status das correções
        function verificarStatusCorrecoes(alunoId) {
            const aluno = state.alunos[alunoId];
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
                    'OPT_BCET_1': { esperado: 'GCET1061', via: 'GCET200', nome: 'Tópicos Especiais de Matemática I',
                        semestre: '5º' },
                    'OPT_BCET_2': { esperado: 'GCET1062', via: 'GCET675', nome: 'Tópicos Especiais de Matemática II',
                        semestre: '6º' }
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

        // 5.2 Exibe opções pós-validação
        function exibirOpcoesPosValidacao() {
            const preview = document.getElementById('importPreview');

            preview.innerHTML += `
                <div style="background:#e8f5e9;border:2px solid #2e7d32;border-radius:8px;padding:20px;margin-top:10px;">
                    <h3 style="color:#1b5e20;margin:0 0 8px 0;">✅ TUDO CORRETO!</h3>
                    <p style="margin:4px 0;color:#2e7d32;">
                        Todas as verificações foram concluídas e o fluxograma está completo e correto.
                    </p>

                    <hr style="margin:16px 0;border-color:#a5d6a7;">

                    <p style="font-weight:bold;color:#1a237e;margin:0 0 12px 0;">📋 O que você deseja fazer agora?</p>

                    <div style="display:flex;flex-wrap:wrap;gap:12px;">
                        <button onclick="gerarPDFVisual()" style="flex:1;min-width:200px;padding:14px 20px;background:#1a237e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
                            📄 Gerar PDF
                            <br><span style="font-weight:normal;font-size:12px;opacity:0.8;">Exportar o fluxograma completo</span>
                        </button>

                        <button onclick="abrirPreMatricula()" style="flex:1;min-width:200px;padding:14px 20px;background:#ce93d8;color:#1a237e;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">
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

        // 5.3 Verifica e exibe correções
        function verificarCorrecoes() {
            if (!state.alunoAtivoId) {
                showToast('❌ Nenhum aluno selecionado.', 'error');
                return;
            }

            const pendentes = verificarStatusCorrecoes(state.alunoAtivoId);
            const preview = document.getElementById('importPreview');

            if (pendentes.total === 0) {
                // Remove o conteúdo antigo e exibe as opções
                preview.innerHTML = `<div class="success">✅ Disciplinas processadas com sucesso!</div>`;
                exibirOpcoesPosValidacao();
                showToast('✅ Tudo correto!', 'success');
                return;
            }

            let html = `
                <div style="background:#ffebee;border:2px solid #c62828;border-radius:8px;padding:16px;margin-top:10px;">
                    <h3 style="color:#b71c1c;margin:0 0 8px 0;">❌ ${pendentes.total} ERRO(S) ENCONTRADO(S)</h3>
                    <p style="margin:4px 0;color:#c62828;font-size:13px;">
                        Corrija os itens abaixo e clique em "Verificar novamente":
                    </p>
            `;

            if (pendentes.fisicas.length > 0) {
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

            if (pendentes.optativas.length > 0) {
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

            if (pendentes.ignoradas.length > 0) {
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
                        <button onclick="verificarCorrecoes()" style="padding:8px 20px;background:#c62828;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;">
                            🔍 Verificar novamente
                        </button>
                        <span style="margin-left:10px;font-size:12px;color:#666;">
                            ${pendentes.total} erro(s) encontrado(s)
                        </span>
                    </div>
                </div>
            `;

            // Mantém o conteúdo anterior e adiciona os erros
            const successDiv = preview.querySelector('.success');
            if (successDiv) {
                preview.innerHTML = successDiv.outerHTML + html;
            } else {
                preview.innerHTML = html;
            }
            showToast(`❌ ${pendentes.total} erro(s) encontrado(s)`, 'error');
        }

        // 5.4 Abrir modal de pré-matrícula (COM OPTATIVAS)
        function abrirPreMatricula() {
            const aluno = state.alunos[state.alunoAtivoId];
            if (!aluno) {
                showToast('❌ Nenhum aluno selecionado.', 'error');
                return;
            }

            const curso = aluno.curso || 'bmat';
            const curriculo = getCurriculo(curso);

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

            let totalPlanejadas = Object.keys(planejamentoTemp).length;

            // ============================================================
            // SEÇÃO 1: DISCIPLINAS OBRIGATÓRIAS
            // ============================================================
            html += `<div class="section-title">📚 DISCIPLINAS OBRIGATÓRIAS</div>`;

            let temObrigatoria = false;

            for (const semestre of curriculo) {
                let temDisponiveis = false;
                for (const disc of semestre.disciplinas) {
                    if (disc.isOptativa) continue;
                    const status = aluno.progresso[disc.codigo]?.status || 'not-started';
                    if (status !== 'done' && status !== 'equiv-done') {
                        temDisponiveis = true;
                        break;
                    }
                }
                if (!temDisponiveis) continue;

                html += `<div class="semester-label">${semestre.nome}</div>`;

                for (const disc of semestre.disciplinas) {
                    if (disc.isOptativa) continue;

                    const codigo = disc.codigo;
                    const status = aluno.progresso[codigo]?.status || 'not-started';
                    const isPlanned = status === 'planned';
                    const isDone = status === 'done' || status === 'equiv-done';

                    if (isDone) continue;

                    temObrigatoria = true;
                    const checked = isPlanned ? 'checked' : '';

                    html += `
                        <label class="discipline-item ${isPlanned ? 'planned' : ''}">
                            <input type="checkbox" ${checked} 
                                   onchange="togglePlanejamento('${codigo}')" 
                                   style="margin-right:8px;">
                            <strong>${codigo}</strong> - ${getNomeDisciplina(codigo)}
                            <span class="hours">${disc.horas}</span>
                            ${isPlanned ? '<span class="planned-label">📌 Planejada</span>' : ''}
                        </label>
                    `;
                }
            }

            if (!temObrigatoria) {
                html += `<div class="empty-message">✅ Todas as disciplinas obrigatórias já foram cursadas!</div>`;
            }

            // ============================================================
            // SEÇÃO 2: OPTATIVAS
            // ============================================================
            html += `<div class="section-title">📌 OPTATIVAS DISPONÍVEIS</div>`;

            const todasOptativas = getTodasOptativas();
            const slotsDisponiveis = ['OPT3', 'OPT4', 'OPT5'];
            const slotsOcupados = new Set();

            // Verifica optativas já alocadas
            for (const slot of ['OPT1', 'OPT2', 'OPT3', 'OPT4', 'OPT5']) {
                if (aluno.optativas[slot]) {
                    slotsOcupados.add(aluno.optativas[slot]);
                }
            }

            const optativasDisponiveis = todasOptativas.filter(opt => {
                // Já foi cursada?
                if (aluno.progresso[opt.codigo]?.status === 'done') return false;
                // Já está alocada em algum slot?
                if (slotsOcupados.has(opt.codigo)) return false;
                // Já está planejada?
                if (planejamentoTemp[opt.codigo]) return true;
                return true;
            });

            // Remove duplicatas
            const optativasUnicas = [];
            const codigosVistos = new Set();
            for (const opt of optativasDisponiveis) {
                if (!codigosVistos.has(opt.codigo)) {
                    optativasUnicas.push(opt);
                    codigosVistos.add(opt.codigo);
                }
            }

            let temOptativa = false;

            for (const opt of optativasUnicas) {
                const isPlanned = planejamentoTemp[opt.codigo] || false;
                const checked = isPlanned ? 'checked' : '';
                const slotsOcupadosLista = [];
                for (const slot of ['OPT1', 'OPT2', 'OPT3', 'OPT4', 'OPT5']) {
                    if (aluno.optativas[slot] === opt.codigo) {
                        slotsOcupadosLista.push(slot);
                    }
                }
                const ocupadoStr = slotsOcupadosLista.length > 0 ? ` (já alocada em ${slotsOcupadosLista.join(', ')})` : '';

                temOptativa = true;
                html += `
                    <label class="discipline-item optativa-item ${isPlanned ? 'planned' : ''}">
                        <input type="checkbox" ${checked} 
                               onchange="togglePlanejamento('${opt.codigo}')" 
                               style="margin-right:8px;">
                        <strong>${opt.codigo}</strong> - ${opt.nome}
                        <span class="opt-label">optativa</span>
                        <span class="hours">68h</span>
                        ${isPlanned ? '<span class="planned-label">📌 Planejada</span>' : ''}
                        ${ocupadoStr}
                    </label>
                `;
            }

            if (!temOptativa) {
                html += `<div class="empty-message">🎉 Todas as optativas disponíveis já estão alocadas!</div>`;
            }

            // ============================================================
            // RODAPÉ DO MODAL
            // ============================================================
            const totalSelecionadas = Object.keys(planejamentoTemp).length;
            html += `
                </div>
                <div class="modal-actions">
                    <button class="btn-save" onclick="salvarPlanejamento()">
                        💾 Salvar planejamento (${totalSelecionadas} selecionadas)
                    </button>
                    <button class="btn-cancel" onclick="fecharPreMatricula()">Cancelar</button>
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
        }

        // 5.5 Toggle planejamento
        function togglePlanejamento(codigo) {
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
        }

        // 5.6 Salvar planejamento (COM OPTATIVAS)
        function salvarPlanejamento() {
            const aluno = state.alunos[state.alunoAtivoId];
            if (!aluno) {
                showToast('❌ Nenhum aluno selecionado.', 'error');
                return;
            }

            // Remove todas as disciplinas marcadas como 'planned'
            for (const codigo in aluno.progresso) {
                if (aluno.progresso[codigo]?.status === 'planned') {
                    delete aluno.progresso[codigo];
                }
            }

            // Remove optativas planejadas dos slots
            for (const slot of ['OPT3', 'OPT4', 'OPT5']) {
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

            for (const codigo in planejamentoTemp) {
                if (isOptativaGlobal(codigo)) {
                    optativasPlanejadas.push(codigo);
                } else {
                    obrigatoriasPlanejadas.push(codigo);
                }
            }

            // Salva obrigatórias
            let countObrigatorias = 0;
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
                countObrigatorias++;
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

            let countOptativas = 0;
            let slotsIndex = 0;
            const listaOptativas = [];

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
                listaOptativas.push(`${slot}: ${codigo}`);
                slotsIndex++;
                countOptativas++;
            }

            renderFluxograma(state.alunoAtivoId);
            renderAlunoList();
            saveData();

            fecharPreMatricula();

            // Monta resumo
            let lista = [];
            if (countObrigatorias > 0) {
                lista.push(`📚 Obrigatórias (${countObrigatorias}):`);
                for (const codigo of obrigatoriasPlanejadas) {
                    lista.push(`  • ${codigo} - ${getNomeDisciplina(codigo)}`);
                }
            }
            if (countOptativas > 0) {
                lista.push(`\n📌 Optativas planejadas (${countOptativas}):`);
                for (const item of listaOptativas) {
                    const [slot, codigo] = item.split(': ');
                    lista.push(`  • ${slot}: ${codigo} - ${getNomeDisciplina(codigo)}`);
                }
            }

            const resumo = lista.join('\n');

            const confirmModal = document.createElement('div');
            confirmModal.className = 'confirm-modal';
            confirmModal.id = 'confirmModal';
            confirmModal.innerHTML = `
                <div class="modal-content">
                    <h3>✅ Planejamento salvo!</h3>
                    <div class="summary">
                        <p>📌 <strong>${countObrigatorias + countOptativas}</strong> disciplina(s) planejada(s):</p>
                        <div class="list">${resumo}</div>
                    </div>
                    <hr style="margin:12px 0;border-color:#e0e0e0;">
                    <p class="question">❓ Você terminou de alocar todas as disciplinas do próximo semestre?</p>
                    <div class="actions">
                        <button class="btn-yes" onclick="finalizarPreMatricula()">✅ Sim, terminar e gerar PDF</button>
                        <button class="btn-no" onclick="fecharConfirmModal()">❌ Não, continuar editando</button>
                    </div>
                    <p class="footer-note">💡 Se escolher "Sim", o PDF será gerado automaticamente.</p>
                </div>
            `;
            document.body.appendChild(confirmModal);

            planejamentoTemp = {};
            showToast(`✅ ${countObrigatorias + countOptativas} disciplina(s) planejada(s)!`, 'success');
        }

        // 5.7 Finalizar pré-matrícula
        function finalizarPreMatricula() {
            fecharConfirmModal();
            showToast('📄 Gerando PDF com o planejamento...', 'info');
            setTimeout(() => { gerarPDFVisual(); }, 500);
        }

        // 5.8 Fechar modais
        function fecharPreMatricula() {
            const modal = document.getElementById('preMatriculaModal');
            if (modal) modal.remove();
        }

        function fecharConfirmModal() {
            const modal = document.getElementById('confirmModal');
            if (modal) modal.remove();
        }

        // ============================================================
        // 6. INICIALIZAÇÃO
        // ============================================================

        document.addEventListener('DOMContentLoaded', function() {
            const saved = localStorage.getItem('gerenciador_bmat_bcet_status');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    state.alunos = data.alunos || {};
                    state.nextId = data.nextId || 1;
                    state.cursoAtivo = data.cursoAtivo || 'bmat';
                    for (const id in state.alunos) {
                        if (!state.alunos[id].progresso) state.alunos[id].progresso = {};
                        if (!state.alunos[id].optativas) state.alunos[id].optativas = {};
                        if (!state.alunos[id].quebras) state.alunos[id].quebras = {};
                        if (!state.alunos[id].equiv) state.alunos[id].equiv = {};
                        if (!state.alunos[id].historico_completo) state.alunos[id].historico_completo = {};
                        if (!state.alunos[id].historico_optativas) state.alunos[id].historico_optativas = {};
                        if (!state.alunos[id].curso) state.alunos[id].curso = 'bmat';
                    }
                } catch (e) {
                    console.error('Erro ao carregar dados:', e);
                    state.alunos = {};
                    state.nextId = 1;
                }
            }

            document.getElementById('cursoBMAT').className = state.cursoAtivo === 'bmat' ? 'active' : '';
            document.getElementById('cursoBCET').className = state.cursoAtivo === 'bcet' ? 'active' : '';

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

            renderAlunoList();
            const keys = Object.keys(state.alunos);
            if (keys.length > 0) {
                state.alunoAtivoId = keys[0];
                renderFluxograma(state.alunoAtivoId);
            } else {
                document.getElementById('fluxogramaContent').innerHTML =
                    `<div class="no-aluno"><h3>👈 Adicione um aluno</h3><p>Use o formulário à esquerda ou importe um histórico.</p></div>`;
            }
            updateAlunoCount();
            saveData();

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
        // 7. EXPOSIÇÃO GLOBAL (para chamadas inline no HTML)
        // ============================================================

        window.addAlunoCompleto = addAlunoCompleto;
        window.addMultipleAlunos = addMultipleAlunos;
        window.deleteAluno = deleteAluno;
        window.selectAluno = selectAluno;
        window.selecionarCurso = selecionarCurso;
        window.toggleDiscipline = toggleDiscipline;
        window.importarHistorico = importarHistorico;
        window.alternarVersao = alternarVersao;
        window.exportAllData = exportAllData;
        window.importAllData = importAllData;
        window.clearAllData = clearAllData;
        window.gerarPDFVisual = gerarPDFVisual;
        window.showToast = showToast;
        window.abrirModalQuebra = abrirModalQuebra;
        window.confirmarQuebra = confirmarQuebra;
        window.removerQuebra = removerQuebra;
        window.fecharModalQuebra = fecharModalQuebra;
        window.clearOptativa = clearOptativa;
        window.closeOptModal = closeOptModal;
        window.selecionarOptativa = selecionarOptativa;
        window.verificarCorrecoes = verificarCorrecoes;
        window.exibirOpcoesPosValidacao = exibirOpcoesPosValidacao;
        window.abrirPreMatricula = abrirPreMatricula;
        window.togglePlanejamento = togglePlanejamento;
        window.salvarPlanejamento = salvarPlanejamento;
        window.finalizarPreMatricula = finalizarPreMatricula;
        window.fecharPreMatricula = fecharPreMatricula;
        window.fecharConfirmModal = fecharConfirmModal;
