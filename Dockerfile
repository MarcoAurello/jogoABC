# ABC da Tia ANA na VPS (Dokploy): nginx servindo os arquivos do jogo em /abc/
# No Dokploy: Build Type = Dockerfile, domínio com path /abc e "Strip Path" DESLIGADO, porta 80.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/abc
