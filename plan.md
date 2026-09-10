# FIIsFinder - Plano de Implementação Técnico (Etapa 01)

Este documento detalha o planejamento arquitetural e as etapas de desenvolvimento do FIIsFinder, incorporando todas as validações, regras de negócios e refinamentos de UX deliberados.

## 1. Visão Geral
- **Objetivo:** Desenvolver uma aplicação web estática ("Single Page") para consultar cotações de Fundos Imobiliários.
- **Stack:** HTML5 Semântico, Vanilla CSS (Variáveis Nativas) e Vanilla JS (ES6+). Zero frameworks ou bibliotecas externas.
- **Estrutura:** `index.html`, `style.css` e `script.js` na raiz do projeto (deploy direto via GitHub Pages).
- **API:** [Brapi](https://brapi.dev/) - Endpoint autenticado (`https://brapi.dev/api/quote/{ticker}?token=SEU_TOKEN`).

## 2. Padrões de Design e UI/UX
- **Tema:** Dark Theme, FinTech Minimalista.
- **Paleta de Cores:**
  - Background Geral: `#0F1012`
  - Superfícies (Cards, Inputs): `#1A1B1E`
  - Bordas/Divisões: `#2C2E33`
  - Accent/Destaque: `#D4C5B9` (Bege)
  - Textos (Principal/Secundário): `#F8F9FA` / `#909296`
  - Cores Semânticas: Sucesso/Alta (`#4ADE80`), Erro/Baixa (`#F87171`), BG Erro (`rgba(239, 68, 68, 0.12)`)
- **Tipografia:** System Fonts (`system-ui, -apple-system...`). Sem Google Fonts.
- **Responsividade:** Contêiner principal com `width: 100%`, `max-width: 580px` e `padding` lateral de no mínimo `1rem` para evitar que o conteúdo encoste nas bordas da tela em smartphones. Área de toque mínima de `48px` em dispositivos móveis (`max-width: 640px`).

## 3. Estrutura do DOM (`index.html`)
O DOM será dividido em três camadas semânticas básicas dentro de um `<main>`:
1. **Header:** `<h1>FIIsFinder</h1>`
2. **Search Section (`#search-section`):** 
   - Label visual ("Digite o nome...").
   - Input de texto (`#ticker-input`) com limites estritos (`maxlength="6"`, desativar autocomplete/spellcheck).
   - Botão de Submit (`#search-btn`).
   - Caixa de erro pré-renderizada e discreta (`#error-state`).
3. **Dynamic States Container (`#states-container`):**
   - **Loading State:** `<div id="loading-state" class="hidden">` (com spinner CSS e texto "Consultando B3...").
   - **Success Card:** `<article id="result-card" class="hidden">` 
     - Contendo Header do Fundo (Logo, Nome, Ticker), Bloco Hero (Preço atual e Variação), e o Grid 2x2 com as métricas secundárias (Mínima, Máxima, Volume e Valor de Mercado).

## 4. Etapas de Desenvolvimento Modulares

**Regra de Versionamento Contínuo:** O repositório já está inicializado. Para garantir os 20% da nota referentes ao uso do Git/GitHub, é obrigatório realizar commits atômicos. Ao final da execução de CADA FASE, devem ser executados os comandos `git add .`, `git commit -m 'mensagem descritiva'` e `git push origin main`. Commits massivos com todo o código de uma vez resultarão em perda de nota. O histórico final deve refletir a evolução com no mínimo 5 commits.

### Fase 1: Fundação HTML e CSS (Reset & Tokens)
- Criar a estrutura base do `index.html` com marcações semânticas, incluindo obrigatoriamente a tag `<meta name="viewport" content="width=device-width, initial-scale=1.0">` no `<head>` para habilitar a escala responsiva nos navegadores móveis.
- Configurar variáveis do `:root` no `style.css` refletindo a paleta aprovada.
- Aplicar o CSS Reset básico (margin/padding zero, box-sizing border-box).
- Construir o Layout responsivo e tipografia base.

### Fase 2: Componentização Visual (CSS)
- Estilizar o input de busca, botão com estados `:hover` e `:active`.
- Criar as classes utilitárias para a Máquina de Estados (ex: `.hidden { display: none; }`).
- Criar a estrutura do `result-card` no CSS utilizando `CSS Grid` para as métricas 2x2 e `Flexbox` para alinhamentos em geral.
- Construir as classes visuais de erro (`#error-state`) e de valores financeiros (positivo/negativo).

### Fase 3: Máquina de Estados e Interatividade Básica (JS)
- Configurar as capturas de elementos do DOM (inputs, containers, botões).
- Criar a função central `setUIState(state)` para alternar entre `'idle'`, `'loading'`, `'error'` e `'success'`.
- Vincular os "Event Listeners":
  - `click` no `#search-btn`.
  - `keydown` (Enter) no `#ticker-input`.
  - `input` no `#ticker-input` para limpar o erro e reverter a UI para `'idle'`.
- Aplicar sanitização (`.trim().toUpperCase()`) e guard-clauses locais (exibir erro "Mínimo de 6 Caracteres." sem enviar API se menor que 6).

### Fase 4: Integração com Brapi API e Race Conditions
- Declarar a constante `BRAPI_TOKEN` no escopo global (topo do arquivo script.js) e anexá-la como query parameter na URL da requisição fetch.
- Construir a função de requisição (async/await) para `https://brapi.dev/api/quote/{ticker}`.
- **Race Condition Guard:** Implementar `AbortController` global que cancele requisições em andamento caso o usuário dispare uma nova.
- Capturar erros de requisição silenciosamente (`if error.name === 'AbortError' return`).

### Fase 5: Parsing, Formatação e Tratamento de Exceções
- Executar validação tripla de retorno antes da extração de dados:
  1. Verificar `!response.ok` (Tratar falhas HTTP).
  2. Verificar se a chave `data.error` existe no JSON parseado (Tratar Falso Positivo com status HTTP 200).
  3. Verificar a ausência do array (`!data.results` ou `data.results.length === 0`).
- Mapeamento e Formatação dos Dados do array `results[0]`:
  - **Moeda:** Utilizar `Intl.NumberFormat('pt-BR', ...)` para BRL.
  - **Variação:** Prefixar `+` ou `-` e adicionar classes `.text-positive` ou `.text-negative`.
  - **Números Grandes (Volume/Market Cap):** Desenvolver uma função auxiliar de formatação compacta (ex: R$ 1,5 M, R$ 2,0 B).
- Implementar as mensagens customizadas para o Catch de erros:
  - `429`: "Limite de consultas atingido. Tente novamente em instantes."
  - Rede/Offline/`500`: "Falha de conexão. Tente mais tarde."
  - Não encontrado/Lógica falha: "Digite um código FIIs Válido".
- **Fallback de Imagem:** Adicionar tratativa (`onerror`) para esconder a imagem se a Brapi enviar logo quebrado.
