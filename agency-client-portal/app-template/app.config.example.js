// Copia questo file come app.config.js dentro il progetto Expo che creerai in Claude Code.
// Ogni cliente ha la SUA copia di questi valori: stesso codice, branding diverso.

export default {
  expo: {
    name: "Acme Fashion Portal",
    slug: "acme-fashion-portal",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    android: {
      package: "com.tuagenzia.acmefashion.portal",
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#E6F4FE",
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tuagenzia.acmefashion.portal",
    },
    extra: {
      // Letti a runtime dall'app per sapere a chi appartiene e dove chiamare
      clientId: "acme-fashion",
      backendUrl: "https://api.tuagenzia.it",
      // La chiave API va idealmente iniettata a build-time (EAS secrets),
      // non lasciata in chiaro qui per un progetto reale.
      brandColor: "#D85A30",
    },
  },
};
