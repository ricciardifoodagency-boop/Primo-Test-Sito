// TEMPORANEO — intro "demo" all'apertura dell'app.
// Su NATIVO (Android/iOS) l'intro è disattivata: viene mostrata solo sul web
// (vedi intro-video.web.tsx). Qui è un no-op così le build native non
// richiedono expo-video. Da rimuovere insieme alla versione .web.tsx.

export function IntroVideo(_: { onFinish: () => void }) {
  return null;
}
