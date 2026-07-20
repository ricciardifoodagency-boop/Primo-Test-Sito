# Deploy & Build — guida operativa

Stato attuale: backend completo e testato, collegato all'account Meta reale
**Stefano Ricciardi Food Agency**; app Expo pronta. Restano deploy del backend e
build dell'app.

---

## 1. Deploy del backend (HTTPS)

L'app mobile deve chiamare un URL `https://…`. Il backend è un'app Node/Express
standard (Dockerfile incluso).

### Opzione A — Render (con `render.yaml`)
1. Render → **New + → Blueprint**, seleziona il repo.
2. Imposta **Root Directory** = `agency-client-portal/backend`.
3. Nella dashboard, alla voce Environment, inserisci i secret:
   - `PORTAL_API_KEY` = la chiave lunga (la stessa che userà l'app)
   - `META_TOKEN_RICCIARDI_FOOD_AGENCY` = token Meta `ads_read`
4. Deploy. L'health check è su `/health`.

### Opzione B — Railway / Fly.io / VPS
- Build dell'immagine: `docker build -t client-portal-backend agency-client-portal/backend`
- Avvio: passa `PORT`, `PORTAL_API_KEY`, `META_TOKEN_RICCIARDI_FOOD_AGENCY` come env/secret.
- Su VPS senza Docker: `npm ci --omit=dev && pm2 start src/server.js` dietro nginx/Caddy in HTTPS.

### Verifica dopo il deploy
```bash
curl -H "x-api-key: <PORTAL_API_KEY>" https://IL-TUO-BACKEND/kpi/ricciardi-food-agency
```
Deve tornare il JSON con `spend`, `impressions`, `results`.

---

## 2. Build dell'app (APK/AAB) con EAS

`eas.json` ha già i profili `development`, `preview`, `production`.

```bash
cd agency-client-portal/client-portal-revolucion-mexico
npm install -g eas-cli
eas login

# 1) imposta l'URL del backend nei profili preview/production dentro eas.json
#    (sostituisci "https://SOSTITUISCI-con-il-tuo-backend.esempio.it")

# 2) la chiave API come SECRET (non in chiaro nel repo):
eas secret:create --scope project --name PORTAL_API_KEY --value "<PORTAL_API_KEY>"

# 3) build Android installabile (.apk):
eas build:configure
eas build --platform android --profile preview
```
A fine build EAS fornisce un link per scaricare l'`.apk` da installare sul telefono.

> `app.config.js` legge `BACKEND_URL` e `PORTAL_API_KEY` da `process.env` a
> build-time: EAS li inietta dai profili di `eas.json` e dai secret.

---

## 3. Aggiungere un nuovo cliente

Backend (una riga):
```bash
cd agency-client-portal/backend
npm run add-client -- <slug> "<Nome cliente>" <adAccountId>
# es: npm run add-client -- pizzeria-bella "Pizzeria Bella" 123456789012345
```
Poi:
1. aggiungi il token stampato dallo script in `.env` (e nei secret del deploy);
2. duplica la cartella dell'app, cambia in `app.config.js`: `name`, `slug`,
   `clientId` (= lo slug), `brandColor`, package Android/iOS;
3. `eas build` per il nuovo cliente. Il resto del codice resta identico.

---

## Promemoria sicurezza
- Il token Meta resta SOLO sul backend, mai nell'app.
- `.env` non va mai in git (è gitignorato): in produzione usa i secret della piattaforma.
- Il token del Graph API Explorer scade in poche ore: per la produzione usa un
  token **System User** a lunga durata (Business Manager → Utenti di sistema, `ads_read`).
