"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/img/slide1.png", label: "Planificación de módulos centralizada" },
  { src: "/img/slide2.png", label: "Revisión y retroalimentación por coordinadores" },
  { src: "/img/slide3.png", label: "Exportación oficial en PDF y DOCX" },
  { src: "/img/slide4.png", label: "Comunidad educativa salesiana" },
];

/** Carrusel de imágenes del hero: rota cada 3 s y se pausa con el mouse encima. */
export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % SLIDES.length), 3000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 bg-slate-800"
      style={{ aspectRatio: "16/9" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, i) => (
        imgErrors[i] ? (
          <div
            key={i}
            className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
            aria-hidden={i !== current}
          >
            <span className="text-5xl mb-3" aria-hidden="true">🎓</span>
            <p className="text-slate-300 text-sm text-center px-4">{slide.label}</p>
          </div>
        ) : (
          <img
            key={i}
            src={slide.src}
            alt={slide.label}
            onError={() => setImgErrors((e) => ({ ...e, [i]: true }))}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
            aria-hidden={i !== current}
          />
        )
      ))}

      {/* Overlay con label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3">
        <p className="text-white text-xs font-medium">{SLIDES[current].label}</p>
      </div>

      {/* Indicadores */}
      <div className="absolute bottom-3 right-4 flex gap-1.5 items-center">
        {SLIDES.map((slide, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Ver diapositiva: ${slide.label}`}
            aria-current={i === current}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 20 : 8,
              height: 8,
              backgroundColor: i === current ? "#fbbf24" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
