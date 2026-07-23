// TEMPORANEO — intro "slideshow" all'apertura dell'app, versione WEB.
// Mostra 5 immagini a rotazione, 3 secondi ciascuna (15s totali), poi apre
// l'app da sola. C'è anche "Salta ›". Da rimuovere quando non serve più:
// togliere il render in src/app/_layout.tsx, cancellare questo file,
// intro-video.tsx e la cartella public/intro/.

import { useEffect, useRef, useState } from 'react';

// Le immagini stanno nella cartella public/ del progetto: Expo la copia così
// com'è nell'export web. Servite dal backend sotto /app -> /app/intro/N.png
const IMAGES = [1, 2, 3, 4, 5].map((n) => `/app/intro/${n}.png`);
const SECONDS_PER_IMAGE = 3; // 5 immagini x 3s = 15s totali

export function IntroVideo({ onFinish }: { onFinish: () => void }) {
  const [idx, setIdx] = useState(0);
  const doneRef = useRef(false);

  // Chiude l'intro una sola volta.
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onFinish();
  };

  useEffect(() => {
    // Precarico le immagini per transizioni fluide (solo browser).
    IMAGES.forEach((src) => {
      const im = new window.Image();
      im.src = src;
    });
    // Avanza di un'immagine ogni 3s; dopo l'ultima, apre l'app.
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= IMAGES.length) {
        clearInterval(id);
        finish();
      } else {
        setIdx(i);
      }
    }, SECONDS_PER_IMAGE * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        // svh = altezza VISIBILE (tiene conto della barra del browser su mobile),
        // così l'immagine non finisce mai sotto il bordo dello schermo.
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
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {IMAGES.map((src, i) => (
          // Immagini sovrapposte, dissolvenza incrociata sull'immagine attiva.
          // objectFit contain: si vede sempre tutta, senza tagli né zoom.
          <img
            key={src}
            src={src}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: i === idx ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          />
        ))}
      </div>

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
