# FIIsFinder — Etapa 02 (Bootcamp II)

Aplicação web moderna para consulta de cotações em tempo real de Fundos de Investimento Imobiliário (FIIs) listados na B3, expandida na **Etapa 02** com persistência relacional em nuvem via **Supabase (BaaS)**, operações completas de **CRUD para carteira de favoritos**, arquitetura conteinerizada com **Docker e Nginx**, e cumprimento integral das **Sidequests Oficiais (SQ1 a SQ4)**.

---

## Autor
**Henrique Lopes Borges de Souza** — Matrícula: `22612443`

---

## Descrição do Projeto

O **FIIsFinder** evoluiu de uma Single Page Application estática simples para uma aplicação com persistência de dados e infraestrutura conteinerizada. A plataforma consome a API da [Brapi](https://brapi.dev/) para obter cotações e dividend yield dos FIIs em tempo real, integrando-se nativamente ao [Supabase](https://supabase.com/) (PostgreSQL gerenciado) para salvar, listar, atualizar e excluir os fundos favoritos do usuário com políticas de segurança de dados (RLS). A aplicação é encapsulada e servida por um contêiner Docker com servidor web Nginx otimizado.

---

## Tecnologias Utilizadas

- **Frontend:** HTML5 Semântico, Vanilla CSS (Dark Theme FinTech com CSS Custom Properties) e Vanilla JavaScript (ES6+ modular, sem frameworks pesados).
- **Persistência de Dados (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL em nuvem, `@supabase/supabase-js` e Row Level Security - RLS).
- **Conteinerização & Servidor Web:** Docker e Nginx (`nginx:alpine`).
- **API Externa de Cotações:** [Brapi API](https://brapi.dev/) (`https://brapi.dev/api/quote/{ticker}`).

---

## Funcionalidades Principais

- **Consulta de FIIs em Tempo Real:** Busca por ticker com sanitização de caracteres e validação mínima de 6 caracteres.
- **Máquina de Estados Visual:** Estados bem definidos de `idle`, `loading`, `success` e `error`.
- **Prevenção de Race Conditions:** Controle de concorrência com `AbortController` para cancelar requisições anteriores em caso de nova digitação rápida.
- **CRUD Completo de Favoritos com Supabase:**
  - **Create:** Favoritar FII diretamente pelo card de resultado.
  - **Read:** Listagem de favoritos recuperada da tabela `favoritos_fiis` no Supabase.
  - **Update:** Atualização de cotação e métricas do fundo salvo.
  - **Delete:** Remoção de ativo dos favoritos com exclusão persistida no banco.
- **Formatação Monetária Dinâmica:** Padrão BRL via `Intl.NumberFormat` e destaque visual para variações positivas e negativas.

---

## Tabela do Banco de Dados (`favoritos_fiis`)

A persistência dos ativos é gerenciada na tabela `favoritos_fiis` no Supabase PostgreSQL, seguindo rigorosamente o esquema estrito da disciplina.

### DDL de Criação da Tabela
```sql
CREATE TABLE public.favoritos_fiis (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ticker TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    dividend_yield NUMERIC(5, 2)
);
```

### Configuração de Row Level Security (RLS)
```sql
-- Habilita Row Level Security na tabela
ALTER TABLE public.favoritos_fiis ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para a chave anônima (anon key)
CREATE POLICY "Permitir leitura publica" 
ON public.favoritos_fiis FOR SELECT 
USING (true);

CREATE POLICY "Permitir insercao publica" 
ON public.favoritos_fiis FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualizacao publica" 
ON public.favoritos_fiis FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusao publica" 
ON public.favoritos_fiis FOR DELETE 
USING (true);
```

### Dicionário de Dados
| Coluna | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY`, `IDENTITY` | Identificador único numérico gerado automaticamente pelo banco. |
| `criado_em` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Data e hora exata da inclusão do FII nos favoritos. |
| `ticker` | `TEXT` | `NOT NULL`, `UNIQUE` | Código do ativo na B3 (ex: `MXRF11`, `HGLG11`). Impede duplicidades. |
| `nome` | `TEXT` | `NOT NULL` | Razão social ou nome de divulgação do fundo imobiliário. |
| `preco` | `NUMERIC(10, 2)` | `NOT NULL` | Valor da cota em reais (BRL). |
| `dividend_yield` | `NUMERIC(5, 2)` | `NULLABLE` | Indicador de Dividend Yield anualizado (%) do ativo. |

---

## Sidequests Oficiais da Etapa 02

Abaixo estão detalhadas as quatro Sidequests obrigatórias previstas no edital oficial da disciplina:

### SQ1 — Otimização do Contexto de Build (`.dockerignore`)

Foi criado o arquivo `.dockerignore` na raiz do projeto com o objetivo de excluir do empacotamento:
- Diretório de versionamento: `.git`
- Arquivos de documentação: `README.md`, `plan.md`
- Arquivos temporários, de sistema operacional e de logs.

#### Justificativa Técnica:
1. **Redução do Build Context:** Ao executar `docker build`, o cliente Docker compacta recursivamente todos os arquivos do diretório atual e os envia via socket para o Docker Daemon (*build context*). Ignorar a pasta `.git` (que contém todo o histórico de commits e blobs binários) e arquivos de documentação reduz drasticamente a quantidade de bytes trafegados, acelerando sensivelmente o tempo de início do build.
2. **Diminuição do Tamanho Final da Imagem:** Garante que comandos genéricos como `COPY . /usr/share/nginx/html` não incluam artefatos que não façam parte do runtime web, mantendo a imagem final baseada em `nginx:alpine` extremamente compacta (tipicamente inferior a 25 MB).
3. **Segurança e Higiene:** Evita que metadados internos do Git, chaves temporárias ou anotações internas fiquem expostos publicamente dentro do contêiner em produção.

---

### SQ2 — Versionamento de Imagens no Docker Hub

A imagem oficial do **FIIsFinder** foi compilada, tagueada e publicada no repositório público do Docker Hub (`henriquelopescaze/fiisfinder`) com as três tags requeridas:

- **`1.0`**: Versão inicial estável da aplicação conteinerizada servida via Nginx.
- **`1.1`**: Versão incremental com refinamentos de layout, headers de cache e integração Supabase.
- **`latest`**: Apontador para a versão de produção mais atual e recomendada.

#### Comandos de Publicação:
```bash
# Tagging das versões
docker tag fiisfinder:latest henriquelopescaze/fiisfinder:1.0
docker tag fiisfinder:latest henriquelopescaze/fiisfinder:1.1
docker tag fiisfinder:latest henriquelopescaze/fiisfinder:latest

# Envio para o Docker Hub
docker push henriquelopescaze/fiisfinder:1.0
docker push henriquelopescaze/fiisfinder:1.1
docker push henriquelopescaze/fiisfinder:latest
```

---

### SQ3 — Documentação e Overview no Docker Hub

A página oficial do repositório no Docker Hub foi configurada com o Overview técnico contendo:
1. **Descrição da Aplicação:** Apresentação clara do FIIsFinder como ferramenta de monitoramento de Fundos Imobiliários da B3 com persistência no Supabase.
2. **Comando de Execução Rápida:** Instrução pronta para cópia e execução em qualquer ambiente com Docker:
   ```bash
   docker run -d -p 8080:80 --name fiisfinder henriquelopescaze/fiisfinder:latest
   ```
3. **Link do Repositório GitHub:** [https://github.com/owmygod12/FIIsFinder](https://github.com/owmygod12/FIIsFinder)

---

### SQ4 — Orquestração Local e Gestão de Escala com Kubernetes

#### 1. Execução Prática de Contêineres Simultâneos
Foram instanciados dois contêineres idênticos em paralelo, mapeados em portas distintas no host:

```bash
# Inicialização do Contêiner 1 na porta 8080
docker run -d -p 8080:80 --name fiisfinder-app-1 henriquelopescaze/fiisfinder:latest

# Inicialização do Contêiner 2 na porta 8081
docker run -d -p 8081:80 --name fiisfinder-app-2 henriquelopescaze/fiisfinder:latest
```

Ambos os contêineres executam de forma isolada e simultânea, acessíveis em `http://localhost:8080` e `http://localhost:8081`. 

> **Evidência do comando `docker ps`:** O print comprobatório demonstrando ambos os contêineres em status *Up* encontra-se registrado no repositório: [`docker-ps.png`](file:///c:/Users/USUARIO/Documents/Projetos_pessoais/BOOTCAMP2/FIIsFinder/docker-ps.png).

#### 2. Análise Teórica: Gestão e Escala de 100 Contêineres via Kubernetes

Operar 2 contêineres manualmente via CLI do Docker é viável, porém administrar **100 contêineres** em escala de produção torna a abordagem manual insustentável devido a:
- Falta de balanceamento de carga automático entre múltiplos servidores físicos.
- Impossibilidade de auto-recuperação imediata (*self-healing*) caso uma máquina falhe.
- Dificuldade no gerenciamento de portas e concorrência de recursos de CPU/Memória.

Nesse cenário, adota-se o **Kubernetes (K8s)** como orquestrador, estruturado nos três conceitos fundamentais:

1. **Cluster:**
   - O Cluster é o conjunto unificado de máquinas (físicas ou instâncias de nuvem) agregadas sob uma mesma camada de controle.
   - É dividido entre o **Control Plane** (responsável pelo agendamento, estado do sistema, API server e etcd) e os **Worker Nodes** (máquinas que efetivamente executam as cargas de trabalho).
   - Para gerenciar 100 contêineres, o scheduler do cluster analisa a demanda de CPU e memória e distribui a execução dos contêineres de forma balanceada entre os múltiplos nós de trabalho, abstraindo totalmente a infraestrutura subjacente.

2. **Pod:**
   - O Pod é a **menor unidade atômica e executável** no Kubernetes. Diferente do Docker standalone onde interagimos diretamente com o contêiner, no Kubernetes nunca executamos contêineres soltos; eles são sempre encapsulados dentro de um Pod.
   - Um Pod compartilha o mesmo namespace de rede (possuindo um IP único no cluster), o mesmo loopback e volumes de armazenamento com os contêineres que o compõem.
   - Na aplicação FIIsFinder, cada Pod contém uma instância do Nginx servindo os arquivos estáticos, permitindo que o Kubernetes trate cada réplica como uma entidade autônoma e descartável.

3. **Réplicas (Deployments / ReplicaSets):**
   - O conceito de réplicas é implementado através de recursos declarativos como o `Deployment` e o `ReplicaSet`. Em vez de executar 100 comandos `docker run`, o engenheiro define um arquivo de manifesto YAML especificando `spec.replicas: 100`.
   - O Kubernetes opera em um ciclo contínuo de reconciliação (*reconciliation loop*), comparando o **estado atual** com o **estado desejado**:
     - **Self-Healing (Auto-recuperação):** Se 5 pods quebrarem ou se um nó físico for desligado, o ReplicaSet detecta que há apenas 95 réplicas ativas e programa imediatamente 5 novos pods em nós saudáveis, restabelecendo as 100 réplicas sem qualquer intervenção humana.
     - **Service & Load Balancing:** Um recurso `Service` (ex: `type: LoadBalancer`) expõe um IP/DNS único para os usuários finais e distribui o tráfego de rede uniformemente entre as 100 réplicas em execução via round-robin ou algoritmos avançados.
     - **Horizontal Pod Autoscaler (HPA):** Permite inclusive que a quantidade de réplicas escale dinamicamente (ex: de 20 para 100 réplicas) com base no consumo de CPU ou volume de requisições de cotações na B3.

---

## Como Executar Localmente

### Opção 1: Execução com Docker

Certifique-se de ter o Docker instalado e execute:

```bash
# 1. Clonar o repositório
git clone https://github.com/owmygod12/FIIsFinder.git
cd FIIsFinder

# 2. Construir a imagem Docker local
docker build -t henriquelopescaze/fiisfinder:latest .

# 3. Executar o contêiner mapeando a porta 8080
docker run -d -p 8080:80 --name fiisfinder-app henriquelopescaze/fiisfinder:latest

# Dica: Você também pode executar diretamente a imagem publicada no Docker Hub:
# docker run -d -p 8080:80 --name fiisfinder-app henriquelopescaze/fiisfinder:latest
```

Acesse no navegador: `http://localhost:8080`

Para parar e remover o contêiner:
```bash
docker stop fiisfinder-app && docker rm fiisfinder-app
```

---

### Opção 2: Execução Direta no Navegador

1. Clone o repositório:
   ```bash
   git clone https://github.com/owmygod12/FIIsFinder.git
   cd FIIsFinder
   ```
2. Configure as credenciais do seu projeto Supabase no arquivo `config.js`:
   ```javascript
   const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
   const SUPABASE_ANON_KEY = "SUA_CHAVE_ANONIMA_AQUI";
   ```
3. Abra o arquivo `index.html` em seu navegador ou utilize a extensão **Live Server** no VS Code.

---

## Links de Infraestrutura

- **Aplicação no ar (GitHub Pages):** [https://owmygod12.github.io/FIIsFinder/](https://owmygod12.github.io/FIIsFinder/)
- **Repositório do Projeto (GitHub):** [https://github.com/owmygod12/FIIsFinder](https://github.com/owmygod12/FIIsFinder)
- **Repositório no Docker Hub:** [https://hub.docker.com/r/henriquelopescaze/fiisfinder](https://hub.docker.com/r/henriquelopescaze/fiisfinder)
- **Painel do Supabase:** [https://supabase.com/](https://supabase.com/)
- **Documentação da Brapi API:** [https://brapi.dev/](https://brapi.dev/)
