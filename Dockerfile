# Utiliza a imagem oficial ultraleve do Nginx baseada em Alpine Linux
FROM nginx:alpine

# Metadados da imagem
LABEL maintainer="Henrique Lopes Borges de Souza"
LABEL description="FIIsFinder - Consulta e monitoramento de FIIs da B3 com persistencia no Supabase"
LABEL repository="henriquelopescaze/fiisfinder"

# Instruções de execução:
# Build: docker build -t henriquelopescaze/fiisfinder:latest .
# Run:   docker run -d -p 8080:80 --name fiisfinder henriquelopescaze/fiisfinder:latest

# Remove os arquivos estáticos padrao de boas-vindas do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia todos os arquivos estáticos necessários da SPA (index.html, style.css, script.js, config.js e eventuais assets)
COPY . /usr/share/nginx/html/

# Expõe a porta 80 padrao HTTP
EXPOSE 80

# Define o comando padrao para manter o Nginx rodando em primeiro plano (daemon off;)
CMD ["nginx", "-g", "daemon off;"]
