# FIIsFinder

## Autor
Henrique Lopes Borges de Souza — Matrícula 22612443

## Descrição
Uma Single Page Application (SPA) estática desenvolvida em HTML5, CSS3 e JavaScript Vanilla para consulta em tempo real de Fundos Imobiliários utilizando a API Brapi, projetada com controle de concorrência e máquina de estados.

## API utilizada
- [Brapi API](https://brapi.dev/)
- Endpoint consumido: `https://brapi.dev/api/v2/quote/`

## Funcionalidades
- Pesquisa de Fundos Imobiliários com sanitização e validação de input (mínimo de 6 caracteres).
- Máquina de estados visual (`idle`, `loading`, `result`, `error`).
- Controle de concorrência de rede via `AbortController` para prevenção de *race conditions*.
- Formatação monetária com `Intl.NumberFormat` e cores dinâmicas para variação de preços.

## Como executar localmente
1. Clone: `git clone https://github.com/owmygod12/FIIsFinder.git`
2. Abra o arquivo `index.html` no navegador.

## Links
- **Aplicação no ar (GitHub Pages):** https://owmygod12.github.io/FIIsFinder/
- **Repositório:** https://github.com/owmygod12/FIIsFinder
