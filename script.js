// ==========================================================================
// Configurações Globais da API Brapi & Controle de Rede (Etapa 01)
// ==========================================================================
const BRAPI_TOKEN = 'jAAAf7c6oULD1Ni3hHpFUD';
let currentAbortController = null;

// ==========================================================================
// Estado e Cliente Supabase (Etapa 02 - Sprint 7)
// ==========================================================================
let supabaseClient = null;
let cachedFavorites = [];
let currentFiiData = null;

// ==========================================================================
// Captura de referências do DOM
// ==========================================================================
const elements = {
    // Busca e Estados (Etapa 01)
    tickerInput: document.getElementById('ticker-input'),
    searchBtn: document.getElementById('search-btn'),
    errorState: document.getElementById('error-state'),
    loadingState: document.getElementById('loading-state'),
    resultCard: document.getElementById('result-card'),
    fiiLogo: document.getElementById('fii-logo'),
    fiiName: document.getElementById('fii-name'),
    fiiTicker: document.getElementById('fii-ticker'),
    fiiPrice: document.getElementById('fii-price'),
    fiiVariation: document.getElementById('fii-variation'),
    fiiMin: document.getElementById('fii-min'),
    fiiMax: document.getElementById('fii-max'),
    fiiVolume: document.getElementById('fii-volume'),
    fiiMarketCap: document.getElementById('fii-market-cap'),

    // CRUD e Favoritos (Etapa 02 - Sprint 7)
    saveFavoriteBtn: document.getElementById('save-favorite-btn'),
    favoriteFeedback: document.getElementById('favorite-feedback'),
    favoritesCount: document.getElementById('favorites-count'),
    favoritesLoading: document.getElementById('favorites-loading'),
    favoritesEmpty: document.getElementById('favorites-empty'),
    favoritesList: document.getElementById('favorites-list')
};

// ==========================================================================
// Utilitários de Formatação & Segurança
// ==========================================================================
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Utilitário para formatar moeda (BRL)
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Utilitário para compactar grandes números (M, B)
function formatCompactNumber(value) {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e9) {
        return `R$ ${(value / 1e9).toFixed(1).replace('.', ',')} B`;
    }
    if (value >= 1e6) {
        return `R$ ${(value / 1e6).toFixed(1).replace('.', ',')} M`;
    }
    return formatCurrency(value);
}

// Utilitário para formatar variação com sinal
function formatVariation(value, element) {
    if (value === null || value === undefined) return '0,00%';
    
    element.classList.remove('text-positive', 'text-negative');
    
    if (value > 0) {
        element.classList.add('text-positive');
        return `+${value.toFixed(2).replace('.', ',')}%`;
    } else if (value < 0) {
        element.classList.add('text-negative');
        return `${value.toFixed(2).replace('.', ',')}%`;
    }
    
    return `0,00%`;
}

// ==========================================================================
// Máquina de Estados da Interface Principal (Etapa 01)
// ==========================================================================
function setUIState(state, errorMessage = "Mínimo de 6 Caracteres.") {
    // Reseta a visibilidade de todos os contêineres dinâmicos de busca
    elements.errorState.classList.add('hidden');
    elements.loadingState.classList.add('hidden');
    elements.resultCard.classList.add('hidden');

    switch (state) {
        case 'idle':
            break;
        case 'loading':
            elements.loadingState.classList.remove('hidden');
            break;
        case 'error':
            elements.errorState.textContent = errorMessage;
            elements.errorState.classList.remove('hidden');
            break;
        case 'success':
            elements.resultCard.classList.remove('hidden');
            break;
    }
}

// ==========================================================================
// Instanciação Defensiva do Cliente Supabase (Sprint 7)
// ==========================================================================
function initSupabase() {
    try {
        if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            const isPlaceholder = SUPABASE_URL.includes("SEU-PROJETO") || SUPABASE_ANON_KEY.includes("COLE_AQUI");
            if (!isPlaceholder && SUPABASE_URL.startsWith("http")) {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                return true;
            }
        }
    } catch (err) {
        console.error("Falha ao inicializar o cliente Supabase:", err);
    }
    console.warn("Supabase não configurado ou credenciais pendentes em config.js.");
    return false;
}

// ==========================================================================
// Gerenciamento Visual do Botão e Feedback de Favoritos (Sprint 7)
// ==========================================================================
function setFavoriteFeedback(message, type = 'info') {
    if (!elements.favoriteFeedback) return;
    
    if (!message) {
        elements.favoriteFeedback.className = 'favorite-feedback hidden';
        elements.favoriteFeedback.textContent = '';
        return;
    }

    elements.favoriteFeedback.className = 'favorite-feedback';
    if (type === 'error') {
        elements.favoriteFeedback.classList.add('feedback-error');
    } else if (type === 'success') {
        elements.favoriteFeedback.classList.add('feedback-success');
    }
    elements.favoriteFeedback.textContent = message;
    elements.favoriteFeedback.classList.remove('hidden');
}

function updateSaveButtonState(ticker) {
    if (!elements.saveFavoriteBtn) return;

    const isAlreadySaved = cachedFavorites.some(
        f => f.ticker && f.ticker.toUpperCase() === ticker.toUpperCase()
    );

    if (isAlreadySaved) {
        elements.saveFavoriteBtn.classList.add('is-saved');
        elements.saveFavoriteBtn.disabled = true;
        elements.saveFavoriteBtn.innerHTML = '<span class="btn-icon">✓</span><span class="btn-text">Salvo nos favoritos</span>';
    } else {
        elements.saveFavoriteBtn.classList.remove('is-saved');
        elements.saveFavoriteBtn.disabled = false;
        elements.saveFavoriteBtn.innerHTML = '<span class="btn-icon">⭐</span><span class="btn-text">Salvar nos favoritos</span>';
    }
}

// ==========================================================================
// Lógica de Busca Assíncrona com API Brapi & Race Conditions (Etapa 01)
// ==========================================================================
async function handleSearch() {
    const rawValue = elements.tickerInput.value;
    const sanitizedValue = rawValue.trim().toUpperCase();

    // Guard-clause local
    if (sanitizedValue.length < 6) {
        setUIState('error', 'Mínimo de 6 Caracteres.');
        return;
    }

    // Tratamento de Concorrência (Race Conditions via AbortController)
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    // Transição para estado de carregamento
    setUIState('loading');
    setFavoriteFeedback('');
    
    try {
        const response = await fetch(`https://brapi.dev/api/quote/${sanitizedValue}?token=${BRAPI_TOKEN}`, {
            signal: currentAbortController.signal
        });
        
        // 1. Verificação !response.ok (falhas HTTP)
        if (!response.ok) {
            if (response.status === 429) throw new Error('Limite atingido');
            if (response.status === 404) throw new Error('FIIs Inválido');
            throw new Error('Falha de conexão');
        }

        const data = await response.json();

        // 2. Verificação de falha lógica
        if (data.error) throw new Error('FIIs Inválido');

        // 3. Verificação de array nulo
        if (!data.results || data.results.length === 0) throw new Error('FIIs Inválido');

        const fii = data.results[0];

        // Injeção dinâmica no DOM (Etapa 01)
        elements.fiiLogo.style.display = 'block';
        elements.fiiLogo.src = fii.logourl || '';
        elements.fiiName.textContent = fii.longName || fii.shortName || 'Fundo Imobiliário';
        elements.fiiTicker.textContent = fii.symbol;
        
        elements.fiiPrice.textContent = formatCurrency(fii.regularMarketPrice);
        elements.fiiVariation.textContent = formatVariation(fii.regularMarketChangePercent, elements.fiiVariation);
        
        elements.fiiMin.textContent = formatCurrency(fii.fiftyTwoWeekLow);
        elements.fiiMax.textContent = formatCurrency(fii.fiftyTwoWeekHigh);
        elements.fiiVolume.textContent = formatCompactNumber(fii.regularMarketVolume);
        elements.fiiMarketCap.textContent = formatCompactNumber(fii.marketCap);

        // Armazena os dados normalizados do FII atual para operações do Supabase
        currentFiiData = {
            ticker: fii.symbol,
            nome: fii.longName || fii.shortName || 'Fundo Imobiliário',
            preco: Number(fii.regularMarketPrice) || 0.00,
            dividend_yield: (typeof fii.dividendYield === 'number') ? Number(fii.dividendYield) : null
        };

        // Sincroniza o estado do botão com a carteira em memória
        updateSaveButtonState(currentFiiData.ticker);

        setUIState('success');
        
    } catch (error) {
        // Ignora erros de cancelamento (AbortError)
        if (error.name === 'AbortError') return;
        
        console.error(error);
        
        let message = 'Falha de conexão. Tente mais tarde.';
        if (error.message === 'Limite atingido') {
            message = 'Limite de consultas atingido. Tente novamente em instantes.';
        } else if (error.message === 'FIIs Inválido') {
            message = 'Digite um código FIIs Válido';
        }

        setUIState('error', message);
    }
}

// ==========================================================================
// Operações de CRUD com Supabase (Sprint 7)
// ==========================================================================

// Create: Insere o FII atual na tabela favoritos_fiis
async function handleAddFavorite() {
    if (!currentFiiData) return;

    if (!supabaseClient) {
        setFavoriteFeedback('Configure as credenciais do Supabase no arquivo config.js', 'error');
        return;
    }

    elements.saveFavoriteBtn.disabled = true;
    elements.saveFavoriteBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Salvando...</span>';
    setFavoriteFeedback('');

    try {
        const { data, error } = await supabaseClient
            .from('favoritos_fiis')
            .insert([{
                ticker: currentFiiData.ticker,
                nome: currentFiiData.nome,
                preco: currentFiiData.preco,
                dividend_yield: currentFiiData.dividend_yield
            }])
            .select();

        if (error) {
            // Tratamento da violação de constraint de unicidade (PostgreSQL 23505)
            if (error.code === '23505') {
                setFavoriteFeedback('Este FII já está salvo na sua lista de favoritos.', 'error');
                updateSaveButtonState(currentFiiData.ticker);
                return;
            }
            throw error;
        }

        setFavoriteFeedback('FII adicionado aos favoritos!', 'success');
        setTimeout(() => {
            setFavoriteFeedback('');
        }, 3500);

        // Recarrega os registros e atualiza o estado do botão
        await loadFavorites();
        updateSaveButtonState(currentFiiData.ticker);

    } catch (err) {
        console.error('Erro ao adicionar aos favoritos:', err);
        setFavoriteFeedback('Falha ao salvar no banco. Tente novamente.', 'error');
        elements.saveFavoriteBtn.disabled = false;
        elements.saveFavoriteBtn.innerHTML = '<span class="btn-icon">⭐</span><span class="btn-text">Salvar nos favoritos</span>';
    }
}

// Read: Consulta todos os favoritos ordenados por criado_em DESC
async function loadFavorites() {
    if (!elements.favoritesList) return;

    if (!supabaseClient) {
        elements.favoritesLoading.classList.add('hidden');
        elements.favoritesEmpty.classList.remove('hidden');
        elements.favoritesCount.textContent = '0';
        return;
    }

    elements.favoritesLoading.classList.remove('hidden');
    elements.favoritesEmpty.classList.add('hidden');

    try {
        const { data, error } = await supabaseClient
            .from('favoritos_fiis')
            .select('id, criado_em, ticker, nome, preco, dividend_yield')
            .order('criado_em', { ascending: false });

        if (error) throw error;

        cachedFavorites = data || [];
        renderFavoritesList(cachedFavorites);

    } catch (err) {
        console.error('Erro ao buscar favoritos no Supabase:', err);
        elements.favoritesList.innerHTML = '';
        elements.favoritesEmpty.classList.remove('hidden');
    } finally {
        elements.favoritesLoading.classList.add('hidden');
    }
}

// Renderização dinâmica dos itens na lista
function renderFavoritesList(favorites) {
    elements.favoritesCount.textContent = favorites.length;

    if (favorites.length === 0) {
        elements.favoritesList.innerHTML = '';
        elements.favoritesEmpty.classList.remove('hidden');
        return;
    }

    elements.favoritesEmpty.classList.add('hidden');

    elements.favoritesList.innerHTML = favorites.map(item => {
        const dyFormatted = (item.dividend_yield !== null && item.dividend_yield !== undefined)
            ? `<span class="fav-dy">DY: ${Number(item.dividend_yield).toFixed(2).replace('.', ',')}%</span>`
            : '';

        return `
            <li class="favorite-card" id="fav-item-${item.id}">
                <div class="fav-info">
                    <div class="fav-top">
                        <span class="fav-ticker">${escapeHtml(item.ticker)}</span>
                        <span class="fav-name" title="${escapeHtml(item.nome)}">${escapeHtml(item.nome)}</span>
                    </div>
                    <div class="fav-metrics">
                        <span class="fav-price">${formatCurrency(item.preco)}</span>
                        ${dyFormatted}
                    </div>
                </div>
                <button class="btn-delete-favorite" type="button" data-id="${item.id}" data-ticker="${escapeHtml(item.ticker)}" aria-label="Remover ${escapeHtml(item.ticker)} dos favoritos" title="Remover dos favoritos">
                    ×
                </button>
            </li>
        `;
    }).join('');

    // Sincroniza o botão do card de resultados caso haja um ativo aberto
    if (currentFiiData) {
        updateSaveButtonState(currentFiiData.ticker);
    }
}

// Delete: Remove o FII pelo identificador primário 'id' com remoção reativa no DOM
async function handleDeleteFavorite(id, ticker, cardElement) {
    if (!supabaseClient) return;

    // Feedback visual imediato com animação fade-out
    if (cardElement) {
        cardElement.classList.add('fade-out');
    }

    try {
        const { error } = await supabaseClient
            .from('favoritos_fiis')
            .delete()
            .eq('id', id);

        if (error) {
            if (cardElement) cardElement.classList.remove('fade-out');
            throw error;
        }

        // Remove o elemento do DOM após a conclusão da animação (250ms)
        setTimeout(() => {
            if (cardElement && cardElement.parentNode) {
                cardElement.remove();
            }
        }, 250);

        // Atualiza a lista em memória e contadores
        cachedFavorites = cachedFavorites.filter(item => String(item.id) !== String(id));
        elements.favoritesCount.textContent = cachedFavorites.length;

        if (cachedFavorites.length === 0) {
            elements.favoritesEmpty.classList.remove('hidden');
        }

        // Se o ativo excluído estiver aberto no card de consulta, restaura o botão
        if (currentFiiData && currentFiiData.ticker.toUpperCase() === ticker.toUpperCase()) {
            updateSaveButtonState(currentFiiData.ticker);
        }

    } catch (err) {
        console.error('Erro ao excluir favorito no Supabase:', err);
        alert('Falha ao remover dos favoritos. Tente novamente.');
    }
}

// ==========================================================================
// Event Listeners
// ==========================================================================

// Busca na API Brapi (Etapa 01)
elements.searchBtn.addEventListener('click', handleSearch);

elements.tickerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
});

// Limpa erro e volta ao estado idle ao digitar
elements.tickerInput.addEventListener('input', () => {
    setUIState('idle');
});

// Fallback caso logo não exista ou falhe
elements.fiiLogo.addEventListener('error', () => {
    elements.fiiLogo.style.display = 'none';
});

// Botão de Favoritar (Sprint 7)
elements.saveFavoriteBtn.addEventListener('click', handleAddFavorite);

// Delegação de eventos para exclusão de favoritos (Sprint 7)
elements.favoritesList.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('.btn-delete-favorite');
    if (!deleteBtn) return;

    const id = deleteBtn.getAttribute('data-id');
    const ticker = deleteBtn.getAttribute('data-ticker');
    const cardElement = deleteBtn.closest('.favorite-card');

    if (id && ticker) {
        handleDeleteFavorite(id, ticker, cardElement);
    }
});

// ==========================================================================
// Inicialização da Aplicação
// ==========================================================================
function startApp() {
    initSupabase();
    loadFavorites();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
