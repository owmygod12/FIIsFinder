// Configurações Globais da API
const BRAPI_TOKEN = 'jAAAf7c6oULD1Ni3hHpFUD';
let currentAbortController = null;

// Captura de referências do DOM
const elements = {
    tickerInput: document.getElementById('ticker-input'),
    searchBtn: document.getElementById('search-btn'),
    errorState: document.getElementById('error-state'),
    loadingState: document.getElementById('loading-state'),
    resultCard: document.getElementById('result-card')
};

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
        
        // TODO: Parsing e Tratamento de Exceções (Sprint 5)
        console.log(`Dados brutos recebidos da API para: ${sanitizedValue}`);
        
    } catch (error) {
        // Ignora erros de cancelamento de requisição (AbortError) silenciosamente
        if (error.name === 'AbortError') return;
        
        // Em caso de falha de rede geral, atualiza o estado para erro
        console.error(error);
        setUIState('error', 'Falha de conexão. Tente mais tarde.');
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
