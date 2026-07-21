# Backend portale clienti — immagine di produzione
FROM node:22-alpine

WORKDIR /app

# Installa solo le dipendenze di produzione (sfrutta la cache di layer)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Codice sorgente (il .dockerignore esclude .env, test, node_modules)
COPY src ./src
# Versione web statica dell'app (servita sotto /app)
COPY public ./public

ENV NODE_ENV=production
# La porta effettiva la decide la piattaforma via variabile PORT; 3000 di default.
EXPOSE 3000

CMD ["node", "src/server.js"]
