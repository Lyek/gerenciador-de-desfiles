let lojas = JSON.parse(localStorage.getItem('lojas')) || [];
let modelos = JSON.parse(localStorage.getItem('modelos')) || [];
let desfiles = JSON.parse(localStorage.getItem('desfiles')) || [];
let bloqueios = JSON.parse(localStorage.getItem('bloqueios')) || [];

// --- Elementos do DOM ---
const lojaForm = document.getElementById('loja-form');
const modeloForm = document.getElementById('modelo-form');
const desfileForm = document.getElementById('desfile-form');
const condForm = document.getElementById('condicoes-form');
const lojaInput = document.getElementById('loja-nome');
const modeloInput = document.getElementById('modelo-nome');
const modeloNumInput = document.getElementById('modelo-numero');
const modeloSelect = document.getElementById('desfile-modelo');
const lojaSelect = document.getElementById('desfile-loja');
const horaInput = document.getElementById('desfile-hora');
const msgDiv = document.getElementById('mensagem');
const histDiv = document.getElementById('historico');
const condModelSelect = document.getElementById('condicao-modelo');
const condLojaSelect = document.getElementById('condicao-loja');
const condList = document.getElementById('condicoes-lista');
const desfileEditIdInput = document.getElementById('desfile-edit-id'); // Input hidden
const desfileSubmitBtn = document.getElementById('desfile-submit-btn'); // Botão Registrar/Atualizar
const desfileCancelBtn = document.getElementById('desfile-cancel-btn'); // Botão Cancelar Edição
const desfileFormTitle = document.getElementById('desfile-form-title'); // Título do formulário
const registrarDesfileSection = document.getElementById('registrar-desfile-section'); // Seção do formulário

// --- Funções Core ---
function salvar() {
  try {
    localStorage.setItem('lojas', JSON.stringify(lojas));
    localStorage.setItem('modelos', JSON.stringify(modelos));
    // Garante que apenas desfiles com ID sejam salvos
    const desfilesValidosParaSalvar = desfiles.filter(d => d && typeof d === 'object' && d.id !== undefined && d.id !== null);
    localStorage.setItem('desfiles', JSON.stringify(desfilesValidosParaSalvar));
    localStorage.setItem('bloqueios', JSON.stringify(bloqueios));
  } catch (error) {
    console.error("Erro ao salvar no localStorage:", error);
    alert("Erro ao salvar dados. Verifique o console.");
  }
}


function atualizarSelects() {
  const currentModelo = modeloSelect.value;
  const currentLoja = lojaSelect.value;
  const currentCondModelo = condModelSelect.value;
  const currentCondLoja = condLojaSelect.value;

  modeloSelect.innerHTML = condModelSelect.innerHTML = '<option value="">Selecione a modelo</option>';
  lojaSelect.innerHTML = condLojaSelect.innerHTML = '<option value="">Selecione a loja</option>';

  try {
    const modelosOrdenados = [...modelos].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const lojasOrdenadas = [...lojas].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    modelosOrdenados.forEach((m) => {
      const originalIndex = modelos.findIndex(original => original.nome === m.nome);
      if (originalIndex > -1) {
          const opt = new Option(m.nome, originalIndex);
          modeloSelect.appendChild(opt.cloneNode(true));
          condModelSelect.appendChild(opt.cloneNode(true));
      }
    });

    lojasOrdenadas.forEach((l) => {
      const originalIndex = lojas.findIndex(original => original.nome === l.nome);
      if (originalIndex > -1) {
          const opt = new Option(l.nome, originalIndex);
          lojaSelect.appendChild(opt.cloneNode(true));
          condLojaSelect.appendChild(opt.cloneNode(true));
      }
    });

    // Restaura seleção se possível e válida
    if (modelos[currentModelo]) modeloSelect.value = currentModelo;
    if (lojas[currentLoja]) lojaSelect.value = currentLoja;
    if (modelos[currentCondModelo]) condModelSelect.value = currentCondModelo;
    if (lojas[currentCondLoja]) condLojaSelect.value = currentCondLoja;

  } catch(error) {
      console.error("Erro em atualizarSelects:", error);
      alert("Erro ao atualizar as listas de seleção. Verifique o console.");
  }
}

function mostrarCondicoes() {
  condList.innerHTML = '';
  if (!Array.isArray(bloqueios)) {
    console.error("Erro: 'bloqueios' não é um array!", bloqueios);
    condList.innerHTML = '<p style="color: red;">Erro ao carregar restrições.</p>';
    return;
  }

  if (bloqueios.length === 0) {
      condList.innerHTML = '<p>Nenhuma restrição definida.</p>';
      return;
  }

  try {
    bloqueios.sort((a,b) => {
        const nomeModeloA = modelos[a.modelo]?.nome || '';
        const nomeModeloB = modelos[b.modelo]?.nome || '';
        // Verifica se a/b e a.loja/b.loja são válidos
        const lojaIndexA = a?.loja ?? -1;
        const lojaIndexB = b?.loja ?? -1;
        return nomeModeloA.localeCompare(nomeModeloB) || (lojaIndexA - lojaIndexB);
    })
    bloqueios.forEach((b) => {
      if (b && typeof b === 'object' && b.modelo !== undefined && b.loja !== undefined) {
          const modelo = modelos[b.modelo]?.nome;
          const loja = lojas[b.loja]?.nome;
          if (modelo && loja) { // Só exibe se modelo e loja ainda existem
            condList.innerHTML += `<div>❌ ${modelo} não pode usar roupas da loja <strong>${loja}</strong></div>`;
          }
      } else {
          console.warn("Item de bloqueio inválido encontrado:", b);
      }
    });
  } catch (error) {
      console.error("Erro em mostrarCondicoes:", error);
      condList.innerHTML = '<p style="color: red;">Erro ao exibir restrições.</p>';
  }
}


// --- FUNÇÃO mostrarHistorico COM DEBUG ---
function mostrarHistorico() {
    console.log("--- Iniciando mostrarHistorico ---"); // Log 1: Função iniciada
    console.log("Dados crus - Desfiles:", JSON.stringify(desfiles)); // Log 2: Verifica dados crus
    console.log("Dados crus - Lojas:", JSON.stringify(lojas));
    console.log("Dados crus - Modelos:", JSON.stringify(modelos));

    try { // Adiciona um bloco try...catch para capturar erros internos
        histDiv.innerHTML = ''; // Limpa o histórico atual

        // Verifica se desfiles é um array válido
        if (!Array.isArray(desfiles)) {
            console.error("ERRO: 'desfiles' não é um array!", desfiles);
            histDiv.innerHTML = '<p style="color: red;">Erro interno: dados de desfiles inválidos.</p>';
            return;
        }

        // 1. Contar desfiles por loja (com verificação)
        const contagemLojas = {};
        desfiles.forEach((d, index) => {
            // Verifica se o item 'd' e suas propriedades são válidos
            if (d && typeof d === 'object' && d.loja !== undefined && d.loja !== null && lojas[d.loja]) {
                 contagemLojas[d.loja] = (contagemLojas[d.loja] || 0) + 1;
            } else {
                // Não loga aviso aqui para não poluir, a validação ocorrerá depois
            }
        });
        console.log("Contagem por loja:", contagemLojas); // Log 3: Verifica contagem

        // 2. Ordenar desfiles (com verificação e filtro)
        const desfilesOrdenados = [...desfiles]
            .filter(d => d && typeof d === 'object' && d.id !== undefined && d.id !== null && d.modelo !== undefined && d.loja !== undefined && d.hora !== undefined) // Filtra itens inválidos ANTES de ordenar
            .sort((a, b) => {
                try { // try...catch dentro do sort para isolar erros de comparação
                    // Compara pelo índice da loja primeiro
                    if (a.loja !== b.loja) {
                        const nomeLojaA = lojas[a.loja]?.nome || '';
                        const nomeLojaB = lojas[b.loja]?.nome || '';
                        const comparacaoLoja = nomeLojaA.localeCompare(nomeLojaB);
                        // Fallback para índice numérico se nomes forem iguais ou um não existir
                        if (comparacaoLoja !== 0 || (nomeLojaA && nomeLojaB)) {
                             return comparacaoLoja;
                        }
                         return (a.loja ?? -1) - (b.loja ?? -1); // Usa ?? para tratar null/undefined
                    }
                    // Dentro da mesma loja, ordena por hora
                     // Garante que a.hora e b.hora são strings antes de comparar
                    const horaA = String(a.hora ?? '');
                    const horaB = String(b.hora ?? '');
                    return horaA.localeCompare(horaB);
                } catch (sortError) {
                    console.error("Erro dentro da função sort:", sortError, "Itens:", a, b);
                    return 0; // Retorna 0 para evitar quebrar a ordenação
                }
            });
        console.log("Desfiles válidos e ordenados:", JSON.stringify(desfilesOrdenados)); // Log 4: Verifica ordenação

        let lojaAtual = null;

        // 3. Iterar e exibir (com verificação robusta)
        if (desfilesOrdenados.length > 0) {
            desfilesOrdenados.forEach((d, index) => {
                console.log(`Processando item ordenado ${index}:`, d); // Log 5: Verifica cada item VÁLIDO

                // As verificações principais já foram feitas no filter antes do sort
                // Mas verificamos se modelo/loja ainda existem
                const modeloExiste = modelos[d.modelo];
                const lojaExiste = lojas[d.loja];
                if (!modeloExiste) console.warn(`Modelo com índice ${d.modelo} não encontrado para o item ${index}:`, d);
                if (!lojaExiste) console.warn(`Loja com índice ${d.loja} não encontrada para o item ${index}:`, d);

                const modeloNome = modeloExiste ? modeloExiste.nome : 'Modelo Removido'; // Nome mais claro
                const lojaNome = lojaExiste ? lojaExiste.nome : 'Loja Removida'; // Nome mais claro
                const lojaIndex = d.loja;

                // Exibe cabeçalho da loja se mudar
                if (lojaIndex !== lojaAtual) {
                    if (lojaAtual !== null) {
                        histDiv.innerHTML += '<hr>';
                    }
                    let cabecalhoLoja = `<h3>Loja: ${lojaNome} ${(lojaExiste?'':'(Removida)')}</h3>`; // Indica se foi removida
                    // Usa contagemLojas que foi calculada ANTES do filtro para ter o total real
                    const totalDesfilesLojaOriginal = desfiles.filter(df => df && df.loja === lojaIndex).length; // Recalcula total original se necessário, ou usa contagemLojas se confiável
                    if (totalDesfilesLojaOriginal >= 6) {
                        cabecalhoLoja += `<div class="aviso-excesso">⚠️ Limite de 6 desfiles atingido nesta loja! (${totalDesfilesLojaOriginal} registrados)</div>`;
                    }
                    histDiv.innerHTML += cabecalhoLoja;
                    lojaAtual = lojaIndex;
                }

                // Monta o HTML do item (com try...catch para segurança extra na string)
                try {
                    const itemHtml = `
                        <div class="desfile-item" data-id="${d.id}">
                            <span class="desfile-info">🕘 ${d.hora} - ${modeloNome} ${(modeloExiste?'':'(Removido)')} desfilou</span>
                            <span class="desfile-actions">
                                <button class="edit-desfile-btn" data-id="${d.id}" title="Editar Desfile" ${(!modeloExiste || !lojaExiste) ? 'disabled' : ''}> <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-desfile-btn" data-id="${d.id}" title="Apagar Desfile">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </span>
                        </div>`;
                     histDiv.innerHTML += itemHtml;
                } catch (htmlError) {
                     console.error(`Erro ao gerar HTML para o item ${index}:`, htmlError, d);
                      histDiv.innerHTML += `<p style="color:red;">Erro ao exibir item ${index}</p>`; // Indica erro no item específico
                }
            });
        } else if (desfiles.length > 0) {
             // Se tinha desfiles mas a lista ordenada ficou vazia (devido a filtros)
             console.warn("Desfiles existem, mas nenhum é válido para exibição (sem ID, modelo/loja/hora inválido?). Verifique os dados crus.");
             histDiv.innerHTML = '<p>Nenhum desfile válido para exibir. Verifique os dados registrados ou limpe o histórico.</p>';
        } else {
            // Nenhum desfile registrado
             histDiv.innerHTML = '<p>Nenhum desfile registrado ainda.</p>';
        }

         console.log("--- Finalizando mostrarHistorico ---"); // Log 6: Função concluída

    } catch (error) {
        console.error("--- ERRO GERAL EM mostrarHistorico ---:", error); // Log 7: Erro capturado
        // Mostra uma mensagem de erro clara na interface
        histDiv.innerHTML = '<p style="color: red; font-weight: bold;">Ocorreu um erro ao carregar o histórico. Verifique o console do navegador (F12) para mais detalhes.</p>';
    }
}
// --- FIM DA FUNÇÃO mostrarHistorico COM DEBUG ---


function podeDesfilar(modeloIndex, lojaIndex, hora, idParaIgnorar = null) {
    if (modeloIndex === "" || lojaIndex === "" || !modelos[modeloIndex] || !lojas[lojaIndex]) {
        return 'Modelo ou loja inválida/não selecionada.';
    }

    const modelo = modelos[modeloIndex];
    const lojaNome = lojas[lojaIndex]?.nome || 'selecionada';
    const horaMinutos = parseInt(hora.split(':')[0]) * 60 + parseInt(hora.split(':')[1]);

    // Filtra desfiles válidos ignorando o ID especificado (comparação numérica)
    const desfilesParaVerificar = desfiles.filter(d => d && typeof d === 'object' && d.id !== undefined && d.id !== null && d.id !== idParaIgnorar);

    // 1. Verifica o limite de desfiles TOTAL por LOJA
    const desfilesDaLoja = desfilesParaVerificar.filter(d => d.loja == lojaIndex);
    if (desfilesDaLoja.length >= 6) {
        return `A loja ${lojaNome} já atingiu o limite de 6 desfiles no total.`;
    }

    // 2. Verifica se o horário exato já está ocupado por OUTRA modelo
    const horarioOcupado = desfilesParaVerificar.find(d => d.hora === hora && d.modelo != modeloIndex);
    if (horarioOcupado && horarioOcupado.modelo != modeloIndex) {
        const modeloOcupante = modelos[horarioOcupado.modelo]?.nome || 'Outra modelo';
        return `Horário ${hora} já ocupado por ${modeloOcupante}.`;
    }

    // 3. Restrição de loja específica para a modelo
    if (bloqueios.some(b => b && b.modelo == modeloIndex && b.loja == lojaIndex)) {
        return `Modelo ${modelo.nome} está bloqueada para a loja ${lojaNome}.`;
    }

    // Filtra desfiles apenas para a modelo atual (da lista já filtrada por ID)
    const desfilesModelo = desfilesParaVerificar.filter(d => d.modelo == modeloIndex);

    // 4. Total de desfiles da modelo (geral)
    if (desfilesModelo.length >= 6) {
        return `Modelo ${modelo.nome} já atingiu o limite de 6 desfiles (geral).`;
    }

    // 5. Desfiles da modelo PELA MESMA LOJA
    const porLoja = desfilesModelo.filter(d => d.loja == lojaIndex);
    if (porLoja.length >= 2) {
        return `Modelo ${modelo.nome} já desfilou 2 vezes pela loja ${lojaNome}.`;
    }

    // 6. Intervalo de 4 minutos + tempo de desfile da modelo
    const tempoModelo = parseInt(modelo.numero);
    if (isNaN(tempoModelo) || tempoModelo <= 0) {
        console.warn(`Modelo ${modelo.nome} com tempo de desfile inválido: ${modelo.numero}`);
        return `Tempo de desfile inválido para ${modelo.nome}. Verifique o cadastro.`;
    }
    const intervaloMinimo = tempoModelo + 4;

    for (let d of desfilesModelo) {
        // Verifica se d.hora é válido antes de calcular
        if (d.hora && typeof d.hora === 'string' && d.hora.includes(':')) {
            const minutosDesfileAnterior = parseInt(d.hora.split(':')[0]) * 60 + parseInt(d.hora.split(':')[1]);
            if (!isNaN(minutosDesfileAnterior) && Math.abs(horaMinutos - minutosDesfileAnterior) < intervaloMinimo) {
                return `Intervalo insuficiente para ${modelo.nome}. Precisa de ${intervaloMinimo} min. Último desfile dela às ${d.hora}.`;
            }
        } else {
            console.warn("Item de desfile com hora inválida encontrado durante verificação de intervalo:", d);
        }
    }

    return null; // Pode desfilar
}

// --- Funções de Ação (Apagar, Editar, Cancelar) ---
function apagarDesfile(id) {
    const idNumerico = Number(id);
    if (isNaN(idNumerico)) { console.error("ID inválido para apagar:", id); return; }

    const desfileIndex = desfiles.findIndex(d => d && d.id === idNumerico);
    if (desfileIndex > -1) {
        const modeloNome = modelos[desfiles[desfileIndex].modelo]?.nome || 'Desconhecido';
        const lojaNome = lojas[desfiles[desfileIndex].loja]?.nome || 'Desconhecida';
        const hora = desfiles[desfileIndex].hora;
        if (confirm(`Tem certeza que deseja apagar o desfile de ${modeloNome} por ${lojaNome} às ${hora}?`)) {
            desfiles.splice(desfileIndex, 1);
            salvar();
            mostrarHistorico();
            alert('Desfile apagado.');
            if(Number(desfileEditIdInput.value) === idNumerico) {
                 cancelarEdicao();
            }
        }
    } else {
        console.error('Desfile não encontrado para apagar com ID:', idNumerico);
        alert('Erro: Desfile não encontrado para apagar.');
    }
}

function editarDesfile(id) {
    const idNumerico = Number(id);
     if (isNaN(idNumerico)) { console.error("ID inválido para editar:", id); return; }

    const desfileParaEditar = desfiles.find(d => d && d.id === idNumerico);
    if (desfileParaEditar) {
        // Verifica se modelo e loja ainda existem antes de preencher
        if (!modelos[desfileParaEditar.modelo]) {
            alert(`Não é possível editar: O modelo original deste desfile foi removido.`);
            return;
        }
        if (!lojas[desfileParaEditar.loja]) {
             alert(`Não é possível editar: A loja original deste desfile foi removida.`);
            return;
        }

        desfileEditIdInput.value = idNumerico;
        modeloSelect.value = desfileParaEditar.modelo;
        lojaSelect.value = desfileParaEditar.loja;
        horaInput.value = desfileParaEditar.hora;

        desfileFormTitle.textContent = "Editar Desfile";
        desfileSubmitBtn.textContent = "Atualizar Desfile";
        desfileCancelBtn.style.display = 'inline-block';
        desfileForm.classList.add('editing');
        registrarDesfileSection.scrollIntoView({ behavior: 'smooth' });

        msgDiv.textContent = '';
        msgDiv.style.backgroundColor = '';
        msgDiv.style.border = '';
    } else {
         console.error('Desfile não encontrado para editar com ID:', idNumerico);
         alert('Erro: Desfile não encontrado para editar.');
    }
}

function cancelarEdicao() {
    desfileEditIdInput.value = '';
    modeloSelect.value = '';
    lojaSelect.value = '';
    horaInput.value = '';

    desfileFormTitle.textContent = "Registrar Desfile";
    desfileSubmitBtn.textContent = "Registrar";
    desfileCancelBtn.style.display = 'none';
    desfileForm.classList.remove('editing');
     msgDiv.textContent = '';
     msgDiv.style.backgroundColor = '';
     msgDiv.style.border = '';
}


// --- Event Handlers ---
lojaForm.onsubmit = (e) => {
  e.preventDefault();
  const nomeLoja = lojaInput.value.trim();
  if (!nomeLoja) { alert('Erro: O nome da loja não pode estar vazio.'); return; }
  if (!lojas.some(l => l && l.nome && l.nome.toLowerCase() === nomeLoja.toLowerCase())) {
    lojas.push({ nome: nomeLoja });
    salvar();
    atualizarSelects();
    lojaInput.value = '';
    alert(`Loja "${nomeLoja}" adicionada.`);
  } else {
    alert('Erro: Uma loja com este nome já existe.');
  }
};

modeloForm.onsubmit = (e) => {
  e.preventDefault();
  const nomeModelo = modeloInput.value.trim();
  const numModelo = parseInt(modeloNumInput.value);
  if (!nomeModelo) { alert('Erro: O nome da modelo não pode estar vazio.'); return; }
  if (isNaN(numModelo) || numModelo <= 0) { alert('Erro: O tempo de desfile deve ser um número positivo de minutos.'); return; }

  if (!modelos.some(m => m && m.nome && m.nome.toLowerCase() === nomeModelo.toLowerCase())) {
    modelos.push({ nome: nomeModelo, numero: numModelo });
    salvar();
    atualizarSelects();
     modeloInput.value = '';
     modeloNumInput.value = '';
    alert(`Modelo "${nomeModelo}" adicionada (tempo: ${numModelo} min).`);
  } else {
    alert('Erro: Uma modelo com este nome já existe.');
  }
};

desfileForm.onsubmit = (e) => {
    e.preventDefault();
    const modeloIndex = modeloSelect.value;
    const lojaIndex = lojaSelect.value;
    const hora = horaInput.value;
    const idEmEdicaoString = desfileEditIdInput.value;
    const idEmEdicaoNumerico = idEmEdicaoString ? Number(idEmEdicaoString) : null;

    if (idEmEdicaoString && isNaN(idEmEdicaoNumerico)) {
        console.error("ID de edição inválido no formulário:", idEmEdicaoString);
        msgDiv.textContent = '❌ Erro interno ao tentar editar. Cancele e tente novamente.';
        msgDiv.style.color = 'red';
        return;
    }

    if (modeloIndex === "" || lojaIndex === "" || !hora) {
        msgDiv.textContent = '❌ Por favor, selecione modelo, loja e horário.';
        msgDiv.style.color = 'red';
        return;
    }

    const erro = podeDesfilar(modeloIndex, lojaIndex, hora, idEmEdicaoNumerico);

    if (erro) {
        msgDiv.textContent = '❌ Erro: ' + erro;
        msgDiv.style.color = 'red';
        msgDiv.innerHTML += '<br>';

        let sugestoes = [];
        const lojaNomeParaSugestao = lojas[lojaIndex]?.nome || 'esta loja';
        modelos.forEach((modelo, index) => {
            if (modelo && index != modeloIndex) { // Verifica se modelo existe e não é o atual
                if (podeDesfilar(index, lojaIndex, hora, idEmEdicaoNumerico) === null) {
                    sugestoes.push(modelo.nome);
                }
            }
        });
         if (sugestoes.length > 0) {
             msgDiv.innerHTML += `💡 Modelos talvez disponíveis para ${lojaNomeParaSugestao} às ${hora}: <strong>${sugestoes.join(', ')}</strong>`;
         } else {
              if (erro.includes("atingiu o limite de 6 desfiles no total")) {
                  msgDiv.innerHTML += `😔 A loja ${lojaNomeParaSugestao} está com a agenda cheia.`;
              } else if (erro.includes("já ocupado por")) {
                  msgDiv.innerHTML += `😔 Horário ${hora} ocupado. Nenhuma outra modelo pode desfilar neste exato momento.`;
              }
              else {
                  msgDiv.innerHTML += `😔 Nenhuma outra modelo disponível para ${lojaNomeParaSugestao} neste horário que atenda a todas as restrições.`;
              }
         }

    } else {
        const nomeModelo = modelos[modeloIndex]?.nome || 'Modelo';
        const nomeLoja = lojas[lojaIndex]?.nome || 'Loja';

        if (idEmEdicaoNumerico !== null) {
            const desfileIndex = desfiles.findIndex(d => d && d.id === idEmEdicaoNumerico);
            if (desfileIndex > -1) {
                desfiles[desfileIndex].modelo = modeloIndex;
                desfiles[desfileIndex].loja = lojaIndex;
                desfiles[desfileIndex].hora = hora;
                msgDiv.textContent = `✅ Desfile de ${nomeModelo} por ${nomeLoja} às ${hora} ATUALIZADO!`;
                msgDiv.style.color = 'green';
                salvar(); // Salva antes de cancelar/mostrar
                mostrarHistorico();
                cancelarEdicao();
            } else {
                 console.error("Erro ao atualizar: Desfile não encontrado com ID:", idEmEdicaoNumerico);
                 msgDiv.textContent = '❌ Erro ao atualizar: Desfile não encontrado.';
                 msgDiv.style.color = 'red';
                 salvar(); // Salva mesmo se deu erro na UI (pode ter mudado algo antes)
                 mostrarHistorico();
                 cancelarEdicao();
                 return;
            }
        } else {
            const novoDesfile = {
                id: Date.now(),
                modelo: modeloIndex,
                loja: lojaIndex,
                hora: hora
            };
            desfiles.push(novoDesfile);
            msgDiv.textContent = `✅ Desfile de ${nomeModelo} por ${nomeLoja} às ${hora} REGISTRADO!`;
            msgDiv.style.color = 'green';
            salvar(); // Salva antes de limpar/mostrar
            mostrarHistorico();
            horaInput.value = '';
            modeloSelect.value = '';
            lojaSelect.value = '';
        }
    }
};


condForm.onsubmit = (e) => {
  e.preventDefault();
  const modeloIndex = condModelSelect.value;
  const lojaIndex = condLojaSelect.value;
  if (modeloIndex === "" || lojaIndex === "") { alert('Selecione a modelo e a loja.'); return; }

  // Verifica se os índices são válidos antes de criar
  if (!modelos[modeloIndex] || !lojas[lojaIndex]) {
       alert("Erro: Modelo ou Loja selecionado inválido.");
       return;
  }

  const jaExiste = bloqueios.some(b => b && b.modelo == modeloIndex && b.loja == lojaIndex);
  if (!jaExiste) {
      bloqueios.push({ modelo: modeloIndex, loja: lojaIndex });
      salvar();
      mostrarCondicoes();
      alert(`Restrição adicionada: ${modelos[modeloIndex].nome} não pode desfilar por ${lojas[lojaIndex].nome}.`);
      condModelSelect.value = '';
      condLojaSelect.value = '';
  } else {
    alert('Esta restrição já existe.');
  }
};


histDiv.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const idString = target.dataset.id;
    if (!idString) return;

    const idNumerico = Number(idString);
    if (isNaN(idNumerico)) {
        console.error("ID inválido no botão:", idString);
        return;
    }

    if (target.classList.contains('delete-desfile-btn')) {
        apagarDesfile(idNumerico);
    } else if (target.classList.contains('edit-desfile-btn')) {
        if (!target.disabled) { // Verifica se o botão não está desabilitado
             editarDesfile(idNumerico);
        }
    }
});

desfileCancelBtn.addEventListener('click', cancelarEdicao);


// --- Funções de Limpeza ---
function limparDados() {
    if (confirm('Tem certeza que deseja apagar TODOS os dados (lojas, modelos, desfiles, restrições)? Esta ação não pode ser desfeita.')) {
      localStorage.clear();
      lojas = []; modelos = []; desfiles = []; bloqueios = [];
      cancelarEdicao();
      // Força a atualização da UI imediatamente
      atualizarSelects();
      mostrarCondicoes();
      mostrarHistorico();
      alert("Todos os dados foram apagados.");
      // location.reload(); // Recarregar pode ser desnecessário agora
    }
  }

function limparHistorico() {
    if (desfiles.length === 0) {
        alert("O histórico de desfiles já está vazio.");
        return;
    }
    if (confirm('Tem certeza que deseja apagar APENAS o histórico de desfiles? Lojas, modelos e restrições serão mantidos.')) {
      desfiles = [];
      salvar();
      mostrarHistorico();
      if(desfileEditIdInput.value) {
          cancelarEdicao();
      }
      alert('Histórico de desfiles limpo com sucesso.');
    }
  }

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Carrega dados e inicializa UI
    // Adiciona tratamento de erro básico para JSON.parse
    try {
        lojas = JSON.parse(localStorage.getItem('lojas')) || [];
        modelos = JSON.parse(localStorage.getItem('modelos')) || [];
        desfiles = JSON.parse(localStorage.getItem('desfiles')) || [];
        bloqueios = JSON.parse(localStorage.getItem('bloqueios')) || [];

        // Validação básica dos dados carregados
        if (!Array.isArray(lojas)) lojas = [];
        if (!Array.isArray(modelos)) modelos = [];
        if (!Array.isArray(desfiles)) desfiles = [];
        if (!Array.isArray(bloqueios)) bloqueios = [];

         // Limpa desfiles inválidos (sem id, etc.) que podem ter vindo do localStorage antigo
         const desfilesOriginaisCount = desfiles.length;
         desfiles = desfiles.filter(d => d && typeof d === 'object' && d.id !== undefined && d.id !== null && d.modelo !== undefined && d.loja !== undefined && d.hora !== undefined);
         if (desfiles.length !== desfilesOriginaisCount) {
             console.warn("Desfiles inválidos foram removidos do localStorage durante o carregamento.");
             salvar(); // Salva a lista limpa
         }


    } catch (e) {
        console.error("Erro ao carregar dados do localStorage:", e);
        alert("Erro ao carregar dados salvos. Os dados podem ter sido corrompidos. Iniciando com dados vazios.");
        lojas = []; modelos = []; desfiles = []; bloqueios = [];
        localStorage.clear(); // Limpa o localStorage corrompido
    }

    atualizarSelects();
    mostrarCondicoes();
    mostrarHistorico();
    cancelarEdicao(); // Garante estado inicial limpo
});