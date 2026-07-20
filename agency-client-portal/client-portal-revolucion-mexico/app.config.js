// Config dinamica Expo: parte da app.json e vi aggiunge i valori specifici del
// cliente. Ogni cliente ha la SUA copia di questi valori: stesso codice, branding
// diverso. Per un nuovo cliente: duplica il progetto e cambia solo questo file.

export default ({ config }) => ({
  ...config,
  name: "Ricciardi Food Agency Portal",
  slug: "client-portal-revolucion-mexico",
  extra: {
    ...(config.extra ?? {}),
    // Letti a runtime dall'app (vedi src/lib/api.ts) per sapere a chi appartiene
    // e dove chiamare.
    clientId: "ricciardi-food-agency",
    // URL del backend. In sviluppo punta al server locale; in produzione al
    // vostro dominio HTTPS. Sovrascrivibile con la variabile d'ambiente BACKEND_URL.
    backendUrl: process.env.BACKEND_URL || "http://localhost:3000",
    // La chiave API NON va lasciata in chiaro nel repo: va iniettata a build-time
    // (EAS secrets o variabile d'ambiente PORTAL_API_KEY). Deve combaciare con la
    // PORTAL_API_KEY del backend.
    apiKey: process.env.PORTAL_API_KEY || "",
    brandColor: "#C1121F",
  },
});
