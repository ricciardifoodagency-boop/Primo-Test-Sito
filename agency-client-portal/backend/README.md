# Backend Portale Clienti — punto di partenza

Espone i KPI Meta Ads di ciascun cliente all'app mobile, senza mai esporre i token di accesso ai dispositivi.

## Setup locale (in Claude Code)

```bash
cd backend
npm install
cp .env.example .env
# poi apri .env e compila PORTAL_API_KEY e i token Meta reali per cliente
npm run dev
```

Test rapido:
```bash
curl -H "x-api-key: LA_TUA_CHIAVE" http://localhost:3000/kpi/acme-fashion
```

## Deploy sul vostro server

Questo è un'app Node/Express standard: funziona con qualsiasi hosting che supporti Node.js (PM2, Docker, o direttamente `npm start` dietro un reverse proxy come nginx).

Passi tipici:
1. Copia la cartella `backend/` sul server
2. `npm install --production`
3. Configura le variabili d'ambiente reali (mai il file `.env` in chiaro nel repo — usa i secret del vostro sistema di deploy)
4. Avvia con un process manager (es. `pm2 start src/server.js --name client-portal-backend`)
5. Metti un reverse proxy HTTPS davanti (nginx/Caddy) — l'app mobile deve chiamare sempre e solo https

## Prossimi passi da fare in Claude Code

- [ ] Aggiungere i clienti reali in `src/clients.json` con i loro Ad Account ID Meta reali
- [ ] Ottenere i token di accesso Meta Ads per ciascun account cliente (permesso `ads_read`) e metterli nelle variabili d'ambiente
- [ ] Valutare se servono più KPI oltre a spesa/impression/risultati (es. CPA, ROAS — basta aggiungere campi a `fields` nella query insights)
- [ ] Aggiungere logging/monitoring se il traffico cresce
- [ ] Sostituire l'autenticazione a chiave singola con JWT per-cliente quando il numero di app cresce oltre una decina

## Note di sicurezza
- I token Meta Ads restano SEMPRE solo su questo server, mai nell'app mobile
- La cache di 15 minuti riduce le chiamate all'API di Meta e rispetta i rate limit
- `x-api-key` è un livello minimo di protezione: sufficiente per iniziare, da rinforzare quando si scala
