# Template app cliente (Expo) — punto di partenza

## Come proseguire in Claude Code

1. Crea il progetto Expo vero e proprio:
   ```bash
   npx create-expo-app client-portal-acme-fashion
   cd client-portal-acme-fashion
   npx expo install expo-constants expo-notifications @react-native-community/datetimepicker
   ```

2. Copia dentro il nuovo progetto:
   - `app.config.example.js` → rinominalo `app.config.js` e compila i valori per il cliente specifico
   - `lib/api.example.js` → rinominalo `lib/api.js`

3. Chiedi a Claude Code di costruire le schermate usando `fetchKpi()` come base dati:
   - `app/(tabs)/dashboard.tsx` — mostra spend/impressions/results dal backend
   - `app/(tabs)/approvazioni.tsx` — lista creatività da approvare (per ora dati statici, poi collegabile a un endpoint simile)
   - `app/(tabs)/calendario.tsx` — contenuti programmati

4. Per ogni NUOVO cliente dopo Acme Fashion: duplica la cartella progetto (o usa gli EAS build profiles con variabili diverse), cambia `app.config.js`, lancia una nuova build — il resto del codice resta identico.

## Build reale (quando pronti)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Questo produce un vero `.apk`/`.aab` che puoi installare e testare, esattamente come il "Dimenticometro" che ci hai mostrato come riferimento.
