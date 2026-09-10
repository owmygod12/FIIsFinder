// Configurações Globais da API
const BRAPI_TOKEN = 'jAAAf7c6oULD1Ni3hHpFUD';
let currentAbortController = null;

// Captura de referências do DOM
const elements = {
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
    fiiMarketCap: document.getElementById('fii-market-cap')
};

// Utilitário para formatar moeda
function formatCurrency(value) {
    if (value === null || value === undefined) return 'N/A';
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

// Máquina de Estados da Interface
function setUIState(state, errorMessage = "Mínimo de 6 Caracteres.") {
    // Reseta a visibilidade de todos os contêineres dinâmicos
    elements.errorState.classList.add('hidden');
    elements.loadingState.classList.add('hidden');
    elements.resultCard.classList.add('hidden');

    switch (state) {
        case 'idle':
            // Estado neutro: aguardando ação (nenhum painel visível)
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

// Lógica principal de busca assíncrona com API Brapi
async function handleSearch() {
    const rawValue = elements.tickerInput.value;
    const sanitizedValue = rawValue.trim().toUpperCase();

    // Guard-clause local
    if (sanitizedValue.length < 6) {
        setUIState('error', 'Mínimo de 6 Caracteres.');
        return;
    }

    // Tratamento de Concorrência (Race Conditions)
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    // Transição para estado de carregamento
    setUIState('loading');
    
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

        // Injeção dinâmica no DOM
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

// Event Listeners
elements.searchBtn.addEventListener('click', handleSearch);

elements.tickerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
});

// Escuta a digitação para limpar erros e voltar ao estado idle
elements.tickerInput.addEventListener('input', () => {
    setUIState('idle');
});

// Listener de fallback da imagem (onerror)
elements.fiiLogo.addEventListener('error', () => {
    elements.fiiLogo.style.display = 'none';
});
