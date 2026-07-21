// TEMPORANEO — intro "demo" all'apertura dell'app, versione WEB.
// I browser bloccano l'autoplay con audio: il video parte da solo MUTO e mostra
// un pulsante per attivare l'audio. C'è anche "Salta ›". Si chiude a fine video.
// Da rimuovere quando non serve più: togliere il render in src/app/_layout.tsx e
// cancellare questo file, intro-video.tsx e assets/videos/intro.mp4.

import { useEffect, useRef, useState } from 'react';

// Il video sta nella cartella public/ del progetto: Expo la copia così com'è
// nell'export web. Servito dal backend sotto /app, il file è a /app/intro.mp4.
const SOURCE = '/app/intro.mp4';

export function IntroVideo({ onFinish }: { onFinish: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    // Alcuni browser vogliono la chiamata esplicita a play().
    videoRef.current?.play?.().catch(() => {});
    // Sicurezza: se il video non parte/carica, dopo 12s mostra comunque l'app.
    const t = setTimeout(onFinish, 12000);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
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
        onEnded={onFinish}
        onError={onFinish}
        // Il video non supera mai lo schermo in nessuna direzione e mantiene
        // le proporzioni: si vede sempre tutto, senza tagli né zoom.
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
        onClick={onFinish}
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
