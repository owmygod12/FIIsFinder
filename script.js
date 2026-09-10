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

// Lógica principal de busca (interatividade básica)
function handleSearch() {
    const rawValue = elements.tickerInput.value;
    const sanitizedValue = rawValue.trim().toUpperCase();

    // Guard-clause local
    if (sanitizedValue.length < 6) {
        setUIState('error', 'Mínimo de 6 Caracteres.');
        return;
    }

    // Transição para estado de carregamento
    setUIState('loading');
    
    // Console log de apoio para confirmar a ação na Sprint 3
    console.log(`Iniciando busca simulada para o ticker: ${sanitizedValue}`);
    
    // TODO: Integração com API (Sprint 4)
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
