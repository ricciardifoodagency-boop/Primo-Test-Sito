# Portale cliente — Revolucion Mexico Torino

App Expo (React Native) del portale cliente. Mostra i KPI Meta Ads del cliente
leggendoli dal backend (`../backend`), che a sua volta li prende dalla Marketing
API di Meta. Il token Meta resta SEMPRE solo sul backend, mai nell'app.

Collegata all'account Meta Ads reale **Revolucion Mexico Torino**
(`act_1547011439647720`) tramite `clientId: "revolucion-mexico"`.

## Struttura

- `src/app/index.tsx` — **Dashboard**: spesa, risultati, impression (da `fetchKpi()`), con pull-to-refresh e gestione errori
- `src/app/approvazioni.tsx` — **Approvazioni**: creatività da approvare (dati statici, poi collegabili a un endpoint)
- `src/app/calendario.tsx` — **Calendario**: contenuti programmati (dati statici)
- `src/lib/api.ts` — client HTTP verso il backend (`fetchKpi`)
- `app.config.js` — config per-cliente: `clientId`, `backendUrl`, `apiKey`, `brandColor`

## Avvio in sviluppo

1. Avvia il backend in un altro terminale:
   ```bash
   cd ../backend && npm run dev
   ```
2. Configura le variabili per l'app. `app.config.js` legge:
   - `BACKEND_URL` (default `http://localhost:3000`) — su device fisico usa l'IP del tuo PC, non `localhost`
   - `PORTAL_API_KEY` — deve combaciare con quella nel `.env` del backend
   ```bash
   BACKEND_URL="http://192.168.x.x:3000" PORTAL_API_KEY="la-tua-chiave" npx expo start
   ```
3. Apri con Expo Go (QR code) oppure premi `w` per il web.

> Nota: la Dashboard mostra i numeri reali solo quando nel backend è impostato un
> token Meta valido (`ads_read`) per il cliente. Senza token il backend risponde
> "Token mancante" e l'app mostra il riquadro d'errore con "Riprova".

## Build reale (APK/AAB)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Iniettando `PORTAL_API_KEY` come EAS secret (non lasciarla in chiaro nel repo).

## Nuovo cliente

Duplica la cartella del progetto, cambia i valori in `app.config.js`
(`name`, `slug`, `clientId`, `brandColor`, package Android/iOS) e lancia una nuova
build: il resto del codice resta identico.
