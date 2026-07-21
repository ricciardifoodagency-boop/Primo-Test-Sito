// TEMPORANEO — intro "demo" all'apertura dell'app, versione WEB.
// I browser bloccano l'autoplay con audio: il video parte da solo MUTO e mostra
// un pulsante per attivare l'audio. C'è anche "Salta ›". Si chiude a fine video.
// Da rimuovere quando non serve più: togliere il render in src/app/_layout.tsx e
// cancellare questo file, intro-video.tsx e assets/videos/intro.mp4.

import { useEffect, useRef, useState } from 'react';

// Il video sta nella cartella public/ del progetto: Expo la copia così com'è
// nell'export web. Servito dal backend sotto /app, il file è a /app/intro.mp4.
const SOURCE = '/app/intro.mp4';

// Velocità di riproduzione dell'intro (1 = normale). A 1.5x un video di 25s
// dura ~17s. Le clip NON vengono tagliate: scorre solo più veloce.
const PLAYBACK_RATE = 1.5;

export function IntroVideo({ onFinish }: { onFinish: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [muted, setMuted] = useState(true);

  const clearTimers = () => {
    if (startupRef.current) clearTimeout(startupRef.current);
    if (endRef.current) clearTimeout(endRef.current);
    startupRef.current = null;
    endRef.current = null;
  };

  // Chiude l'intro una volta sola e libera i timer.
  const finish = () => {
    clearTimers();
    onFinish();
  };

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = PLAYBACK_RATE;
      // Alcuni browser vogliono la chiamata esplicita a play().
      v.play?.().catch(() => {});
    }
    // Sicurezza: SOLO se il video non parte proprio (asset non caricato) dopo
    // 8s mostro comunque l'app. Il timer viene annullato appena parte.
    startupRef.current = setTimeout(onFinish, 8000);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando conosco la durata: imposto la velocità, annullo il timer di avvio e
  // programmo la chiusura sulla durata REALE (l'evento onEnded non è affidabile
  // su tutti i browser, quindi non mi affido solo a quello).
  const handleLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = PLAYBACK_RATE;
    if (startupRef.current) {
      clearTimeout(startupRef.current);
      startupRef.current = null;
    }
    const secs = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 25;
    if (endRef.current) clearTimeout(endRef.current);
    endRef.current = setTimeout(finish, (secs / PLAYBACK_RATE) * 1000 + 500);
  };

  // Ridondanza: se la riproduzione supera la durata, chiudo comunque.
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.currentTime >= v.duration - 0.2) {
      finish();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        // svh = altezza VISIBILE (tiene conto della barra del browser su mobile),
        // così il video non finisce mai sotto il bordo dello schermo.
        width: '100vw',
        height: '100svh',
        background: '#000',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        boxSizing: 'border-box',
      }}>
      <video
        ref={videoRef}
        src={SOURCE}
        autoPlay
        muted={muted}
        playsInline
        onLoadedMetadata={handleLoadedMeta}
        onPlaying={handleLoadedMeta}
        onTimeUpdate={handleTimeUpdate}
        onEnded={finish}
        onError={finish}
        // Il video non supera mai lo schermo visibile in nessuna direzione e
        // mantiene le proporzioni: si vede sempre tutto, senza tagli né zoom.
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {/* Attiva/disattiva audio */}
      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Attiva audio' : 'Disattiva audio'}
        style={{
          position: 'absolute',
          left: 16,
          bottom: 20,
          border: 'none',
          borderRadius: 999,
          padding: '9px 16px',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          background: 'rgba(0,0,0,0.55)',
          cursor: 'pointer',
        }}>
        {muted ? '🔇 Attiva audio' : '🔊 Audio'}
      </button>

      {/* Salta intro */}
      <button
        onClick={finish}
        aria-label="Salta l'intro"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 20,
          border: 'none',
          borderRadius: 999,
          padding: '9px 16px',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          background: 'rgba(0,0,0,0.55)',
          cursor: 'pointer',
        }}>
        Salta ›
      </button>
    </div>
  );
}
