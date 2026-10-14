"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MAPS = [
  {
    label: "Campus Carlos Crespi",
    src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3980!2d-79.00649746935194!3d-2.890576190306007!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91cd199217c41347%3A0x45d6ec59a2beec86!2sUnidad%20Educativa%20T%C3%A9cnico%20Salesiano%20-%20Campus%20Carlos%20Crespi!5e0!3m2!1ses!2sec!4v1780678109926!5m2!1ses!2sec",
  },
  {
    label: "Campus María Auxiliadora",
    src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3980!2d-79.00609740393985!3d-2.8919010227969015!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91cd199645d42d79%3A0xa07c641345f081e6!2sUnidad%20Educativa%20T%C3%A9cnico%20Salesiano%20-%20Campus%20Mar%C3%ADa%20Auxiliadora!5e0!3m2!1ses!2sec!4v1780678220852!5m2!1ses!2sec",
  },
  {
    label: "Campus Yanuncay",
    src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3980!2d-79.01642203237041!3d-2.9156254561750115!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91cd187974d0ee41%3A0x5ee9dceea7b23bcd!2sUnidad%20Educativa%20T%C3%A9cnico%20Salesiano!5e0!3m2!1ses!2sec!4v1780678241925!5m2!1ses!2sec",
  },
];

/** Carrusel de mapas de los campus (footer de la landing). */
export function MapCarousel() {
  const [currentMap, setCurrentMap] = useState(0);

  return (
    <>
      {/* Cabecera: nombre + flechas */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-white text-xs font-medium">{MAPS[currentMap].label}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMap((i) => (i - 1 + MAPS.length) % MAPS.length)}
            aria-label="Mapa anterior"
            className="w-6 h-6 rounded-full bg-slate-800 hover:bg-amber-400 hover:text-slate-900 text-slate-400 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMap((i) => (i + 1) % MAPS.length)}
            aria-label="Mapa siguiente"
            className="w-6 h-6 rounded-full bg-slate-800 hover:bg-amber-400 hover:text-slate-900 text-slate-400 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      {/* Iframe */}
      <div className="rounded-xl overflow-hidden" style={{ height: 180 }}>
        <iframe
          key={currentMap}
          src={MAPS[currentMap].src}
          width="100%"
          height="180"
          style={{ border: 0, display: "block" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={MAPS[currentMap].label}
        />
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-3">
        {MAPS.map((map, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentMap(i)}
            aria-label={`Ver mapa ${map.label}`}
            aria-current={i === currentMap}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === currentMap ? 20 : 8,
              backgroundColor: i === currentMap ? "#f59e0b" : "#475569",
            }}
          />
        ))}
      </div>
    </>
  );
}
