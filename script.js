// Envolve todo o código em uma IIFE para criar um escopo local e evitar poluição global.
(function() {
    'use strict'; // Habilita o modo estrito para melhor qualidade de código

    // --- Constantes ---
    const MAX_DESFILES_POR_LOJA = 6;
    const MAX_DESFILES_POR_MODELO = 6;
    const MAX_DESFILES_MODELO_LOJA = 2;
    const MINUTOS_INTERVALO_MODELO = 4;
    const STORAGE_KEYS = {
        lojas: 'lojas',
        modelos: 'modelos',
        desfiles: 'desfiles',
        bloqueios: 'bloqueios'
    };

    // --- Estado da Aplicação ---
    let lojas = [];
    let modelos = [];
    let desfiles = [];
    let bloqueios = [];

    // --- Seletores do DOM ( कैशिंग ) ---
    // Fazemos isso uma vez para evitar buscas repetidas no DOM.
    const DOMElements = {
        lojaForm: document.getElementById('loja-form'),
        modeloForm: document.getElementById('modelo-form'),
        desfileForm: document.getElementById('desfile-form'),
        condForm: document.getElementById('condicoes-form'),
        lojaInput: document.getElementById('loja-nome'),
        modeloInput: document.getElementById('modelo-nome'),
        modeloNumInput: document.getElementById('modelo-numero'),
        modeloSelect: document.getElementById('desfile-modelo'),
        lojaSelect: document.getElementById('desfile-loja'),
        horaInput: document.getElementById('desfile-hora'),
        msgDiv: document.getElementById('mensagem'),
        histDiv: document.getElementById('historico'),
        condModelSelect: document.getElementById('condicao-modelo'),
        condLojaSelect: document.getElementById('condicao-loja'),
        condListDiv: document.getElementById('condicoes-lista'),
        desfileEditIdInput: document.getElementById('desfile-edit-id'),
        desfileSubmitBtn: document.getElementById('desfile-submit-btn'),
        desfileCancelBtn: document.getElementById('desfile-cancel-btn'),
        desfileFormTitle: document.getElementById('desfile-form-title'),
        registrarDesfileSection: document.getElementById('registrar-desfile-section'),
        btnLimparHistorico: document.getElementById('btn-limpar-historico'),
        btnLimparTudo: document.getElementById('btn-limpar-tudo')
    };

    // --- Funções de Persistência (LocalStorage) ---

    /**
     * Carrega os dados do LocalStorage para o estado da aplicação.
     * Realiza validações básicas nos dados carregados.
     */
    function carregarDados() {
        try {
            lojas = JSON.parse(localStorage.getItem(STORAGE_KEYS.lojas)) || [];
            modelos = JSON.parse(localStorage.getItem(STORAGE_KEYS.modelos)) || [];
            desfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.desfiles)) || [];
            bloqueios = JSON.parse(localStorage.getItem(STORAGE_KEYS.bloqueios)) || [];

            // Validação e Limpeza básica dos dados carregados
            if (!Array.isArray(lojas)) lojas = [];
            if (!Array.isArray(modelos)) modelos = [];
            if (!Array.isArray(desfiles)) desfiles = [];
            if (!Array.isArray(bloqueios)) bloqueios = [];

            // Filtra desfiles inválidos (ex: sem ID, dados faltando)
            const desfilesOriginaisCount = desfiles.length;
            desfiles = desfiles.filter(d =>
                d && typeof d === 'object' &&
                d.id != null && // Verifica se id existe e não é null/undefined
                d.modelo != null && // Verifica modelo, loja, hora
                d.loja != null &&
                d.hora != null
            );

            if (desfiles.length !== desfilesOriginaisCount) {
                console.warn("Desfiles inválidos foram removidos do localStorage durante o carregamento.");
                salvarDados(); // Salva a lista limpa imediatamente
            }

             // Filtra bloqueios inválidos
             bloqueios = bloqueios.filter(b =>
                b && typeof b === 'object' &&
                b.modelo != null && b.loja != null &&
                modelos[b.modelo] && lojas[b.loja] // Verifica se modelo/loja ainda existem
            );


        } catch (e) {
            console.error("Erro Crítico ao carregar dados do localStorage:", e);
            alert("Erro ao carregar dados salvos. Os dados podem ter sido corrompidos ou são de uma versão incompatível. Iniciando com dados vazios.");
            lojas = []; modelos = []; desfiles = []; bloqueios = [];
            localStorage.clear(); // Limpa o localStorage potencialmente corrompido
        }
    }

    /**
     * Salva o estado atual da aplicação (arrays) no LocalStorage.
     */
    function salvarDados() {
        try {
            localStorage.setItem(STORAGE_KEYS.lojas, JSON.stringify(lojas));
            localStorage.setItem(STORAGE_KEYS.modelos, JSON.stringify(modelos));
            localStorage.setItem(STORAGE_KEYS.desfiles, JSON.stringify(desfiles));
            localStorage.setItem(STORAGE_KEYS.bloqueios, JSON.stringify(bloqueios));
        } catch (error) {
            console.error("Erro ao salvar dados no localStorage:", error);
            mostrarMensagem("Erro ao salvar dados. Suas últimas alterações podem não ter sido salvas.", true);
        }
    }

    // --- Funções de Renderização (Atualização da UI) ---

    /**
     * Cria e retorna um elemento Option para selects.
     * @param {string} text - O texto visível da opção.
     * @param {string|number} value - O valor da opção.
     * @returns {HTMLOptionElement} O elemento option criado.
     */
    function criarOption(text, value) {
        const option = document.createElement('option');
        option.textContent = text;
        option.value = value;
        return option;
    }

    /**
     * Popula um elemento select com opções de um array de dados.
     * @param {HTMLSelectElement} selectElement - O elemento select a ser populado.
     * @param {Array} dataArray - O array de dados (lojas ou modelos).
     * @param {string} placeholder - O texto da opção inicial (placeholder).
     */
    function popularSelect(selectElement, dataArray, placeholder) {
        // Guarda o valor selecionado antes de limpar, se houver
        const valorAtual = selectElement.value;
        selectElement.innerHTML = ''; // Limpa opções existentes
        selectElement.appendChild(criarOption(placeholder, '')); // Adiciona placeholder

        // Ordena os dados pelo nome para exibição consistente
        const dadosOrdenados = [...dataArray].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        dadosOrdenados.forEach((item) => {
            // Encontra o índice original no array principal (necessário pois usamos índices como ID)
            const originalIndex = dataArray.findIndex(original => original && original.nome === item.nome);
            if (originalIndex > -1 && item && item.nome) { // Garante que o item e nome existem
                selectElement.appendChild(criarOption(item.nome, originalIndex));
            }
        });

        // Tenta restaurar o valor selecionado anteriormente, se ainda for válido
         if (dataArray[valorAtual]) {
            selectElement.value = valorAtual;
        }
    }

    /**
     * Atualiza todos os selects da página (lojas e modelos).
     */
    function atualizarTodosOsSelects() {
        popularSelect(DOMElements.modeloSelect, modelos, 'Selecione a modelo');
        popularSelect(DOMElements.lojaSelect, lojas, 'Selecione a loja');
        popularSelect(DOMElements.condModelSelect, modelos, 'Selecione a modelo');
        popularSelect(DOMElements.condLojaSelect, lojas, 'Selecione a loja');
    }

    /**
     * Renderiza a lista de restrições na tela.
     */
    function renderizarCondicoes() {
        const { condListDiv } = DOMElements;
        condListDiv.innerHTML = ''; // Limpa lista atual

        if (!Array.isArray(bloqueios)) {
             console.error("Erro: 'bloqueios' não é um array!", bloqueios);
             condListDiv.innerHTML = '<p class="error-message">Erro ao carregar restrições.</p>';
             return;
        }

        if (bloqueios.length === 0) {
            condListDiv.innerHTML = '<p>Nenhuma restrição definida.</p>';
            return;
        }

        // Ordena para exibição consistente
        const bloqueiosOrdenados = [...bloqueios].sort((a,b) => {
             const nomeModeloA = modelos[a?.modelo]?.nome || '';
             const nomeModeloB = modelos[b?.modelo]?.nome || '';
             const lojaIndexA = a?.loja ?? -1;
             const lojaIndexB = b?.loja ?? -1;
             return nomeModeloA.localeCompare(nomeModeloB) || (lojaIndexA - lojaIndexB);
         });

        const fragment = document.createDocumentFragment(); // Usa fragmento para eficiência
        bloqueiosOrdenados.forEach((b) => {
            if (b && b.modelo != null && b.loja != null) { // Verifica validade do bloqueio
                const modelo = modelos[b.modelo];
                const loja = lojas[b.loja];
                if (modelo && loja) { // Verifica se modelo e loja ainda existem
                    const div = document.createElement('div');
                    div.innerHTML = `❌ ${modelo.nome} não pode usar roupas da loja <strong>${loja.nome}</strong>`;
                    fragment.appendChild(div);
                }
            }
        });
        condListDiv.appendChild(fragment);
    }


    /**
     * Renderiza o histórico de desfiles de forma otimizada.
     */
    function renderizarHistorico() {
        const { histDiv } = DOMElements;
        histDiv.innerHTML = ''; // Limpa

        if (!Array.isArray(desfiles)) {
             console.error("Erro: 'desfiles' não é um array!", desfiles);
             histDiv.innerHTML = '<p class="error-message">Erro ao carregar histórico.</p>';
             return;
        }
        // Filtra desfiles inválidos ANTES de qualquer processamento
        const desfilesValidos = desfiles.filter(d =>
            d && typeof d === 'object' && d.id != null &&
            d.modelo != null && d.loja != null && d.hora != null
        );

        if (desfilesValidos.length === 0) {
            histDiv.innerHTML = '<p>Nenhum desfile registrado ainda.</p>';
            return;
        }

        // Contagem por loja (apenas dos válidos)
        const contagemLojas = {};
        desfilesValidos.forEach(d => {
             if (lojas[d.loja]) { // Conta apenas se a loja existe
                contagemLojas[d.loja] = (contagemLojas[d.loja] || 0) + 1;
             }
        });

        // Ordena os desfiles válidos
        const desfilesOrdenados = [...desfilesValidos].sort((a, b) => {
             try {
                 if (a.loja !== b.loja) {
                     const nomeLojaA = lojas[a.loja]?.nome || '';
                     const nomeLojaB = lojas[b.loja]?.nome || '';
                     const comparacaoLoja = nomeLojaA.localeCompare(nomeLojaB);
                      if (comparacaoLoja !== 0 || (nomeLojaA && nomeLojaB)) return comparacaoLoja;
                      return (a.loja ?? -1) - (b.loja ?? -1);
                 }
                 const horaA = String(a.hora ?? '');
                 const horaB = String(b.hora ?? '');
                 return horaA.localeCompare(horaB);
             } catch (sortError) {
                 console.error("Erro sort:", sortError, a, b); return 0;
             }
         });

        const fragment = document.createDocumentFragment(); // Otimização: cria elementos fora do DOM
        let lojaAtual = null;

        desfilesOrdenados.forEach(d => {
            const modeloExiste = modelos[d.modelo];
            const lojaExiste = lojas[d.loja];
            const modeloNome = modeloExiste ? modeloExiste.nome : 'Modelo Removido';
            const lojaNome = lojaExiste ? lojaExiste.nome : 'Loja Removida';
            const lojaIndex = d.loja;

            // Cabeçalho da Loja
            if (lojaIndex !== lojaAtual) {
                if (lojaAtual !== null) {
                    fragment.appendChild(document.createElement('hr'));
                }
                const h3 = document.createElement('h3');
                h3.textContent = `Loja: ${lojaNome} ${(!lojaExiste ? '(Removida)' : '')}`;
                fragment.appendChild(h3);

                const totalDesfilesLoja = contagemLojas[lojaIndex] || 0; // Pega contagem dos válidos
                if (totalDesfilesLoja >= MAX_DESFILES_POR_LOJA) {
                    const avisoDiv = document.createElement('div');
                    avisoDiv.className = 'aviso-excesso';
                    avisoDiv.innerHTML = `⚠️ Limite de ${MAX_DESFILES_POR_LOJA} desfiles atingido nesta loja! (${totalDesfilesLoja} registrados)`;
                    fragment.appendChild(avisoDiv);
                }
                lojaAtual = lojaIndex;
            }

            // Item do Desfile
            const itemDiv = document.createElement('div');
            itemDiv.className = 'desfile-item';
            itemDiv.dataset.id = d.id;

            const infoSpan = document.createElement('span');
            infoSpan.className = 'desfile-info';
            infoSpan.innerHTML = `🕘 ${d.hora} - ${modeloNome} ${(!modeloExiste ? '(Removido)' : '')} desfilou`;

            const actionsSpan = document.createElement('span');
            actionsSpan.className = 'desfile-actions';

            const editButton = document.createElement('button');
            editButton.className = 'edit-desfile-btn';
            editButton.dataset.id = d.id;
            editButton.title = "Editar Desfile";
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.disabled = !modeloExiste || !lojaExiste; // Desabilita se modelo/loja removido

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-desfile-btn';
            deleteButton.dataset.id = d.id;
            deleteButton.title = "Apagar Desfile";
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';

            actionsSpan.appendChild(editButton);
            actionsSpan.appendChild(deleteButton);
            itemDiv.appendChild(infoSpan);
            itemDiv.appendChild(actionsSpan);
            fragment.appendChild(itemDiv);
        });

        histDiv.appendChild(fragment); // Adiciona tudo ao DOM de uma vez
    }

    /**
     * Exibe uma mensagem de status ou erro para o usuário.
     * @param {string} texto - A mensagem a ser exibida.
     * @param {boolean} [isError=false] - Define se a mensagem é de erro (true) ou sucesso/info (false).
     */
    function mostrarMensagem(texto, isError = false) {
        const { msgDiv } = DOMElements;
        msgDiv.textContent = texto;
        msgDiv.className = isError ? 'error visible' : 'success visible'; // Adiciona 'visible'

        // Opcional: esconder a mensagem após alguns segundos
        // setTimeout(() => {
        //     msgDiv.classList.remove('visible');
        //     // Atraso um pouco mais para remover o texto e classes de cor
        //     setTimeout(() => {
        //          msgDiv.textContent = '';
        //          msgDiv.className = '';
        //     }, 300); // Tempo da transição de opacidade
        // }, 5000); // 5 segundos
    }

    // --- Lógica de Negócio e Validação ---

    /**
     * Verifica se uma modelo pode desfilar em uma loja e horário específicos.
     * @param {string|number} modeloIndex - Índice da modelo no array 'modelos'.
     * @param {string|number} lojaIndex - Índice da loja no array 'lojas'.
     * @param {string} hora - Horário no formato "HH:MM".
     * @param {number|null} [idParaIgnorar=null] - ID do desfile a ser ignorado na validação (durante edição).
     * @returns {string|null} Retorna uma string de erro se não puder desfilar, ou null se puder.
     */
    function podeDesfilar(modeloIndex, lojaIndex, hora, idParaIgnorar = null) {
        // Converte índices para número para garantir consistência
        const modIdx = Number(modeloIndex);
        const lojIdx = Number(lojaIndex);

        // Validações básicas de índice e dados
        if (isNaN(modIdx) || isNaN(lojIdx) || !modelos[modIdx] || !lojas[lojIdx] || !hora) {
            return 'Modelo, loja ou horário inválido/não selecionado.';
        }

        const modelo = modelos[modIdx];
        const lojaNome = lojas[lojIdx]?.nome || 'selecionada';
        const horaMinutos = parseInt(hora.split(':')[0]) * 60 + parseInt(hora.split(':')[1]);
        if (isNaN(horaMinutos)) return 'Horário inválido.'; // Verifica se o parsing do horário funcionou

        // Filtra desfiles válidos, ignorando o ID especificado
        const desfilesParaVerificar = desfiles.filter(d =>
            d && d.id != null && d.id !== idParaIgnorar // Compara IDs (idParaIgnorar já deve ser número)
        );

        // 1. Limite TOTAL por LOJA
        if (desfilesParaVerificar.filter(d => d.loja == lojIdx).length >= MAX_DESFILES_POR_LOJA) {
            return `A loja ${lojaNome} já atingiu o limite de ${MAX_DESFILES_POR_LOJA} desfiles no total.`;
        }

        // 2. Horário ocupado por OUTRA modelo
        const horarioOcupado = desfilesParaVerificar.find(d => d.hora === hora && d.modelo != modIdx);
        if (horarioOcupado) {
            const modeloOcupante = modelos[horarioOcupado.modelo]?.nome || 'Outra modelo';
            return `Horário ${hora} já ocupado por ${modeloOcupante}.`;
        }

        // 3. Restrição Modelo-Loja
        if (bloqueios.some(b => b && b.modelo == modIdx && b.loja == lojIdx)) {
            return `Modelo ${modelo.nome} está bloqueada para a loja ${lojaNome}.`;
        }

        // Filtra desfiles apenas para a modelo atual
        const desfilesModelo = desfilesParaVerificar.filter(d => d.modelo == modIdx);

        // 4. Limite de desfiles GERAL da modelo
        if (desfilesModelo.length >= MAX_DESFILES_POR_MODELO) {
            return `Modelo ${modelo.nome} já atingiu o limite de ${MAX_DESFILES_POR_MODELO} desfiles (geral).`;
        }

        // 5. Limite de desfiles da modelo PELA MESMA LOJA
        if (desfilesModelo.filter(d => d.loja == lojIdx).length >= MAX_DESFILES_MODELO_LOJA) {
            return `Modelo ${modelo.nome} já desfilou ${MAX_DESFILES_MODELO_LOJA} vezes pela loja ${lojaNome}.`;
        }

        // 6. Intervalo mínimo entre desfiles da mesma modelo
        const tempoModelo = parseInt(modelo.numero);
        if (isNaN(tempoModelo) || tempoModelo <= 0) {
            return `Tempo de desfile inválido para ${modelo.nome}. Verifique o cadastro.`;
        }
        const intervaloMinimo = tempoModelo + MINUTOS_INTERVALO_MODELO;

        for (let d of desfilesModelo) {
            if (d.hora && typeof d.hora === 'string' && d.hora.includes(':')) {
                const minutosDesfileAnterior = parseInt(d.hora.split(':')[0]) * 60 + parseInt(d.hora.split(':')[1]);
                if (!isNaN(minutosDesfileAnterior) && Math.abs(horaMinutos - minutosDesfileAnterior) < intervaloMinimo) {
                    return `Intervalo insuficiente para ${modelo.nome}. Precisa de ${intervaloMinimo} min. Último desfile dela às ${d.hora}.`;
                }
            }
        }

        return null; // Nenhuma regra impediu, pode desfilar.
    }


    // --- Funções de Ação (Adicionar, Editar, Apagar, Limpar) ---

    /** Limpa o formulário de desfile e o estado de edição. */
    function cancelarEdicao() {
        DOMElements.desfileEditIdInput.value = ''; // Limpa ID
        DOMElements.desfileForm.reset(); // Reseta o formulário para valores padrão
        DOMElements.desfileFormTitle.textContent = "Registrar Desfile";
        DOMElements.desfileSubmitBtn.textContent = "Registrar";
        DOMElements.desfileCancelBtn.style.display = 'none'; // Esconde botão Cancelar
        DOMElements.desfileForm.classList.remove('editing'); // Remove classe CSS
        DOMElements.msgDiv.textContent = ''; // Limpa mensagens
        DOMElements.msgDiv.className = ''; // Remove classes de cor/visibilidade
    }

    /** Prepara o formulário para editar um desfile existente. */
    function prepararEdicaoDesfile(id) {
        const idNumerico = Number(id);
        if (isNaN(idNumerico)) return;

        const desfileParaEditar = desfiles.find(d => d && d.id === idNumerico);
        if (desfileParaEditar) {
             // Verifica se modelo e loja ainda existem
            if (!modelos[desfileParaEditar.modelo] || !lojas[desfileParaEditar.loja]) {
                mostrarMensagem("Não é possível editar: Modelo ou Loja original não existe mais.", true);
                return;
            }

            DOMElements.desfileEditIdInput.value = idNumerico;
            DOMElements.modeloSelect.value = desfileParaEditar.modelo;
            DOMElements.lojaSelect.value = desfileParaEditar.loja;
            DOMElements.horaInput.value = desfileParaEditar.hora;

            DOMElements.desfileFormTitle.textContent = "Editar Desfile";
            DOMElements.desfileSubmitBtn.textContent = "Atualizar Desfile";
            DOMElements.desfileCancelBtn.style.display = 'inline-block';
            DOMElements.desfileForm.classList.add('editing');
            DOMElements.registrarDesfileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            mostrarMensagem(''); // Limpa mensagens anteriores
        } else {
            console.error('Desfile não encontrado para editar com ID:', idNumerico);
            mostrarMensagem('Erro: Desfile não encontrado para editar.', true);
        }
    }

    /** Apaga um desfile do histórico. */
    function apagarDesfile(id) {
        const idNumerico = Number(id);
         if (isNaN(idNumerico)) return;

        const desfileIndex = desfiles.findIndex(d => d && d.id === idNumerico);
        if (desfileIndex > -1) {
            const modeloNome = modelos[desfiles[desfileIndex].modelo]?.nome || 'Desconhecido';
            const lojaNome = lojas[desfiles[desfileIndex].loja]?.nome || 'Desconhecida';
            const hora = desfiles[desfileIndex].hora;

            if (confirm(`Tem certeza que deseja apagar o desfile de ${modeloNome} por ${lojaNome} às ${hora}?`)) {
                desfiles.splice(desfileIndex, 1);
                salvarDados();
                renderizarHistorico(); // Atualiza UI
                mostrarMensagem('Desfile apagado com sucesso.');
                // Cancela edição se estava editando o item apagado
                if (Number(DOMElements.desfileEditIdInput.value) === idNumerico) {
                    cancelarEdicao();
                }
            }
        } else {
            console.error('Desfile não encontrado para apagar com ID:', idNumerico);
            mostrarMensagem('Erro: Desfile não encontrado para apagar.', true);
        }
    }

     /** Limpa todos os dados da aplicação. */
    function limparTodosOsDados() {
        if (confirm('Tem certeza que deseja apagar TODOS os dados (lojas, modelos, desfiles, restrições)? Esta ação não pode ser desfeita.')) {
            localStorage.clear();
            lojas = []; modelos = []; desfiles = []; bloqueios = [];
            cancelarEdicao(); // Reseta o formulário de desfile
            // Atualiza toda a UI para refletir o estado vazio
            atualizarTodosOsSelects();
            renderizarCondicoes();
            renderizarHistorico();
            mostrarMensagem("Todos os dados foram apagados.");
        }
    }

     /** Limpa apenas o histórico de desfiles. */
    function limparApenasHistorico() {
        if (desfiles.length === 0) {
            mostrarMensagem("O histórico de desfiles já está vazio.");
            return;
        }
        if (confirm('Tem certeza que deseja apagar APENAS o histórico de desfiles? Lojas, modelos e restrições serão mantidos.')) {
            desfiles = [];
            salvarDados(); // Salva o array vazio
            renderizarHistorico(); // Atualiza UI
             if (DOMElements.desfileEditIdInput.value) { // Se estava editando algo
                 cancelarEdicao(); // Cancela a edição
             }
            mostrarMensagem('Histórico de desfiles limpo com sucesso.');
        }
    }

    // --- Inicialização e Event Listeners ---

    /** Configura todos os event listeners da aplicação. */
    function inicializarEventos() {
        DOMElements.lojaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nomeLoja = DOMElements.lojaInput.value.trim();
            if (!nomeLoja) { mostrarMensagem('O nome da loja não pode estar vazio.', true); return; }
            if (!lojas.some(l => l && l.nome && l.nome.toLowerCase() === nomeLoja.toLowerCase())) {
                lojas.push({ nome: nomeLoja });
                salvarDados();
                atualizarTodosOsSelects(); // Atualiza todos os selects que usam lojas
                DOMElements.lojaInput.value = '';
                mostrarMensagem(`Loja "${nomeLoja}" adicionada com sucesso.`);
            } else {
                mostrarMensagem('Uma loja com este nome já existe.', true);
            }
        });

        DOMElements.modeloForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nomeModelo = DOMElements.modeloInput.value.trim();
            const numModelo = parseInt(DOMElements.modeloNumInput.value);
            if (!nomeModelo) { mostrarMensagem('O nome da modelo não pode estar vazio.', true); return; }
            if (isNaN(numModelo) || numModelo <= 0) { mostrarMensagem('O tempo de desfile deve ser um número positivo de minutos.', true); return; }

            if (!modelos.some(m => m && m.nome && m.nome.toLowerCase() === nomeModelo.toLowerCase())) {
                modelos.push({ nome: nomeModelo, numero: numModelo });
                salvarDados();
                atualizarTodosOsSelects(); // Atualiza todos os selects que usam modelos
                DOMElements.modeloForm.reset(); // Limpa o formulário
                mostrarMensagem(`Modelo "${nomeModelo}" adicionada com sucesso.`);
            } else {
                mostrarMensagem('Uma modelo com este nome já existe.', true);
            }
        });

        DOMElements.desfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const modeloIndex = DOMElements.modeloSelect.value;
            const lojaIndex = DOMElements.lojaSelect.value;
            const hora = DOMElements.horaInput.value;
            const idEmEdicaoString = DOMElements.desfileEditIdInput.value;
            const idEmEdicaoNumerico = idEmEdicaoString ? Number(idEmEdicaoString) : null;

            // Validação inicial
            if (modeloIndex === "" || lojaIndex === "" || !hora) {
                mostrarMensagem('Por favor, selecione modelo, loja e horário.', true);
                return;
            }
             if (idEmEdicaoString && isNaN(idEmEdicaoNumerico)) {
                 console.error("ID de edição inválido:", idEmEdicaoString);
                 mostrarMensagem("Erro interno ao editar. Cancele e tente novamente.", true);
                 return;
            }


            const erro = podeDesfilar(modeloIndex, lojaIndex, hora, idEmEdicaoNumerico);

            if (erro) {
                mostrarMensagem(erro, true); // Mostra erro principal

                // Lógica de sugestão (pode ser movida para função separada se ficar complexa)
                let sugestoes = [];
                const lojaNomeParaSugestao = lojas[lojaIndex]?.nome || 'esta loja';
                modelos.forEach((modelo, index) => {
                    if (modelo && index != modeloIndex) { // Verifica se modelo existe
                        if (podeDesfilar(index, lojaIndex, hora, idEmEdicaoNumerico) === null) {
                            sugestoes.push(modelo.nome);
                        }
                    }
                });
                if (sugestoes.length > 0) {
                     DOMElements.msgDiv.innerHTML += `<br>💡 Sugestões para ${lojaNomeParaSugestao} às ${hora}: <strong>${sugestoes.join(', ')}</strong>`;
                } else {
                     // Mensagem adicional se não houver sugestões (opcional)
                }

            } else {
                // Sucesso - Adicionar ou Atualizar
                const nomeModelo = modelos[modeloIndex]?.nome || 'Modelo';
                const nomeLoja = lojas[lojaIndex]?.nome || 'Loja';

                if (idEmEdicaoNumerico !== null) { // Atualizando
                    const desfileIndex = desfiles.findIndex(d => d && d.id === idEmEdicaoNumerico);
                    if (desfileIndex > -1) {
                        desfiles[desfileIndex] = { ...desfiles[desfileIndex], modelo: modeloIndex, loja: lojaIndex, hora: hora }; // Atualiza
                        salvarDados();
                        renderizarHistorico();
                        mostrarMensagem(`Desfile de ${nomeModelo} atualizado com sucesso.`);
                        cancelarEdicao();
                    } else {
                        console.error("Erro ao atualizar: Desfile não encontrado com ID:", idEmEdicaoNumerico);
                        mostrarMensagem('Erro ao atualizar: Desfile não encontrado.', true);
                        cancelarEdicao(); // Cancela mesmo com erro
                    }
                } else { // Adicionando
                    const novoDesfile = { id: Date.now(), modelo: modeloIndex, loja: lojaIndex, hora: hora };
                    desfiles.push(novoDesfile);
                    salvarDados();
                    renderizarHistorico();
                    mostrarMensagem(`Desfile de ${nomeModelo} registrado com sucesso.`);
                    // Limpa campos após adicionar com sucesso
                    DOMElements.modeloSelect.value = '';
                    DOMElements.lojaSelect.value = '';
                    DOMElements.horaInput.value = '';
                }
            }
        });

        DOMElements.condForm.addEventListener('submit', (e) => {
             e.preventDefault();
             const modeloIndex = DOMElements.condModelSelect.value;
             const lojaIndex = DOMElements.condLojaSelect.value;
             if (modeloIndex === "" || lojaIndex === "") { mostrarMensagem('Selecione a modelo e a loja para criar a restrição.', true); return; }
             if (!modelos[modeloIndex] || !lojas[lojaIndex]) { mostrarMensagem("Erro: Modelo ou Loja selecionado inválido.", true); return; }

             const jaExiste = bloqueios.some(b => b && b.modelo == modeloIndex && b.loja == lojaIndex);
             if (!jaExiste) {
                 bloqueios.push({ modelo: modeloIndex, loja: lojaIndex });
                 salvarDados();
                 renderizarCondicoes();
                 mostrarMensagem(`Restrição adicionada: ${modelos[modeloIndex].nome} X ${lojas[lojaIndex].nome}.`);
                 DOMElements.condForm.reset(); // Limpa selects do form de condição
             } else {
                 mostrarMensagem('Esta restrição já existe.', true);
             }
        });

        // Delegação de Eventos para botões no Histórico
        DOMElements.histDiv.addEventListener('click', (event) => {
            const targetButton = event.target.closest('button'); // Pega o botão mesmo se clicou no ícone
            if (!targetButton) return;

            const idString = targetButton.dataset.id;
            if (!idString) return;
            const idNumerico = Number(idString);
            if (isNaN(idNumerico)) return;

            if (targetButton.classList.contains('delete-desfile-btn')) {
                apagarDesfile(idNumerico);
            } else if (targetButton.classList.contains('edit-desfile-btn')) {
                 if (!targetButton.disabled) {
                     prepararEdicaoDesfile(idNumerico);
                 }
            }
        });

        // Botões de Limpeza
        DOMElements.desfileCancelBtn.addEventListener('click', cancelarEdicao);
        DOMElements.btnLimparHistorico.addEventListener('click', limparApenasHistorico);
        DOMElements.btnLimparTudo.addEventListener('click', limparTodosOsDados);
    }

    /** Função principal de inicialização da aplicação */
    function inicializarAplicacao() {
        carregarDados(); // Carrega dados do localStorage
        atualizarTodosOsSelects(); // Popula selects com dados carregados/atuais
        renderizarCondicoes(); // Exibe restrições
        renderizarHistorico(); // Exibe histórico
        inicializarEventos(); // Configura listeners de eventos
        cancelarEdicao(); // Garante estado inicial limpo do form de desfile
        console.log("Aplicação inicializada.");
    }

    // --- Ponto de Entrada ---
    // Garante que o DOM está pronto antes de executar o script
    document.addEventListener('DOMContentLoaded', inicializarAplicacao);

})(); // Fim da IIFE