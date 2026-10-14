import { ROUTES } from "@/constants/routes";
// Componente de servidor: solo los carruseles son de cliente.
import { HeroCarousel } from "./HeroCarousel";
import { MapCarousel } from "./MapCarousel";

const PASOS = [
  {
    numero: "01",
    titulo: "Ingresa al sistema",
    descripcion: "Accede con tu correo institucional y contraseña asignada.",
  },
  {
    numero: "02",
    titulo: "Completa tu PUM",
    descripcion: "Llena la planificación unificada de módulo de cada materia asignada.",
  },
  {
    numero: "03",
    titulo: "Coordinador revisa",
    descripcion: "El coordinador de área revisa y envía retroalimentación campo a campo.",
  },
  {
    numero: "04",
    titulo: "Aprobación y exportación",
    descripcion: "El PUM aprobado se exporta en PDF o DOCX para entrega oficial.",
    acento: true,
  },
];

const INFO_ITEMS = [
  {
    titulo: "Cuenta institucional",
    descripcion: "Necesitas un correo @uets.edu.ec activo registrado en el sistema.",
  },
  {
    titulo: "Credenciales iniciales",
    descripcion: "El administrador te entrega una contraseña temporal válida por 7 días. Cámbiala en el primer ingreso.",
  },
  {
    titulo: "Materia asignada",
    descripcion: "Debes tener al menos una materia asignada en el año académico activo.",
  },
];

const SERVICIOS = [
  {
    icono: "📄",
    titulo: "Docentes",
    descripcion: "Completa y actualiza los PUMs de tus materias asignadas en cada período.",
  },
  {
    icono: "🔍",
    titulo: "Coordinadores de Área",
    descripcion: "Revisa, comenta y aprueba los PUMs del área académica bajo tu supervisión.",
  },
  {
    icono: "⚙️",
    titulo: "Administradores",
    descripcion: "Gestiona docentes, asignaciones, plazos de entrega y exportaciones masivas.",
  },
  {
    icono: "🛡️",
    titulo: "Superadmin",
    descripcion: "Controla usuarios, roles, auditoría y configuración global del sistema.",
  },
];

const SEDES = [
  { nombre: "Campus Carlos Crespi",     direccion: "Calle Tarqui y Pío Bravo, Cuenca",        telefono: "072-844-207" },
  { nombre: "Campus María Auxiliadora", direccion: "Calle Vega Muñoz y Padre Aguirre, Cuenca", telefono: "072-850-642" },
  { nombre: "Campus Yanuncay",          direccion: "Av. Don Bosco y Felipe II, Cuenca",         telefono: "072-814-274 / 072-882-606" },
];

// ── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <img src="/img/logo-uets.png" alt="UETS" className="w-14 h-14 object-contain" />
        <span className="font-semibold text-slate-900 text-lg tracking-tight">PUM Web</span>
      </div>
      <a
        href={ROUTES.LOGIN}
        className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-slate-700 active:scale-95 transition-all"
      >
        Ingresar al sistema
      </a>
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-900 py-14 md:py-20">
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1);    opacity: 0.4; }
          50%       { transform: scale(1.25); opacity: 0.75; }
        }
        .blob-1 { animation: breathe 5s ease-in-out infinite; }
        .blob-2 { animation: breathe 7s ease-in-out infinite 1.5s; }
        .blob-3 { animation: breathe 6s ease-in-out infinite 3s; }
      `}</style>

      {/* Blobs animados de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob-1 absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="blob-2 absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="blob-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-600/25 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center gap-8 md:gap-10">
        {/* Tarjeta glass izquierda */}
        <div className="flex-[1.4] bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl space-y-6 text-center md:text-left">
          <span className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 text-sm font-semibold px-4 py-1.5 rounded-full">
            ● Sistema Institucional
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Plataforma Unificada de{" "}
            <span className="text-amber-400">Módulos</span>
          </h1>

          <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-md mx-auto md:mx-0">
            Gestiona, revisa y aprueba planificaciones académicas desde un único lugar, pensado para docentes y coordinadores.
          </p>

          <a
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 px-7 py-3 rounded-full font-semibold hover:bg-amber-300 active:scale-95 transition-all text-base shadow-lg"
          >
            Comenzar →
          </a>
        </div>

        {/* Carrusel derecho */}
        <div className="flex-1 w-full">
          <HeroCarousel />
        </div>
      </div>
    </section>
  );
}

// ── Cómo funciona ────────────────────────────────────────────────────────────

function ComoFunciona() {
  return (
    <section className="bg-white px-4 md:px-8 py-14 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            ¿Cómo funciona el proceso?
          </h2>
          <div className="w-16 h-1 bg-amber-400 mx-auto rounded-full" />
          <p className="text-slate-500 mt-4 max-w-xl mx-auto text-sm md:text-base">
            Cuatro pasos que guían la planificación desde la creación hasta la aprobación final.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
          {PASOS.map((paso, i) => (
            <div key={i} className="flex md:flex-col items-center gap-4 w-full md:flex-1">
              <div
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center gap-3 flex-1 w-full hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${
                    paso.acento
                      ? "bg-amber-400 text-slate-900"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {paso.numero}
                </div>
                <p className="font-semibold text-slate-900 text-sm">{paso.titulo}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{paso.descripcion}</p>
              </div>
              {i < PASOS.length - 1 && (
                <span className="text-slate-300 text-2xl shrink-0 rotate-90 md:rotate-0 my-1">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Servicios ────────────────────────────────────────────────────────────────

function Servicios() {
  return (
    <section className="bg-slate-50 px-4 md:px-8 py-14 md:py-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Panel oscuro izquierdo */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 w-full md:w-72 shrink-0 space-y-6">
          <h3 className="font-bold text-lg text-amber-400">✓ Información Importante</h3>
          <div className="space-y-5">
            {INFO_ITEMS.map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-amber-400 shrink-0 mt-0.5 font-bold">✓</span>
                <div>
                  <p className="font-semibold text-sm text-white">{item.titulo}</p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">{item.descripcion}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-slate-400 text-xs">
              ¿Problemas para ingresar? Contacta al departamento de sistemas.
            </p>
          </div>
        </div>

        {/* Grid de tarjetas derecha */}
        <div className="flex-1">
          <h3 className="font-bold text-xl text-slate-900 mb-2">Módulos del sistema</h3>
          <p className="text-slate-500 text-sm mb-6">
            El acceso a cada módulo depende del rol asignado a tu cuenta.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICIOS.map((s, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-xl p-5 flex gap-4 items-start hover:shadow-md transition-shadow cursor-default"
              >
                <div className="bg-slate-100 rounded-lg p-2.5 shrink-0 text-xl leading-none">
                  {s.icono}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{s.titulo}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{s.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

const SOCIAL_LINKS = [
  { label: "Facebook",  href: "https://www.facebook.com/uetscuenca",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> },
  { label: "Instagram", href: "https://www.instagram.com/uetscuenca",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
  { label: "TikTok",    href: "https://www.tiktok.com/@uetscuenca",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.84a8.18 8.18 0 0 0 4.78 1.52V6.9a4.85 4.85 0 0 1-1.01-.21z"/></svg> },
  { label: "YouTube",   href: "https://www.youtube.com/c/UET%C3%A9cnicoSalesiano",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg> },
  { label: "X",         href: "https://x.com/uetscue",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { label: "Spotify",   href: "https://open.spotify.com/intl-es/artist/5gLwRDP95HalLhHv7P6eeC",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.36c-.2.32-.62.42-.94.22-2.56-1.56-5.78-1.92-9.58-1.05-.36.08-.72-.14-.8-.5-.08-.36.14-.72.5-.8 4.16-.95 7.73-.54 10.6 1.19.32.2.42.62.22.94zm1.24-2.77c-.24.38-.76.5-1.14.26-2.93-1.8-7.4-2.32-10.87-1.27-.42.12-.86-.12-.98-.54-.12-.42.12-.86.54-.98 3.96-1.2 8.89-.62 12.23 1.45.38.24.5.76.22 1.08zm.11-2.89c-3.52-2.09-9.32-2.28-12.68-1.26-.5.15-1.02-.13-1.17-.62-.15-.5.13-1.02.62-1.17 3.86-1.17 10.28-.95 14.33 1.46.46.27.61.86.34 1.32-.27.46-.86.61-1.44.27z"/></svg> },
];

function Footer() {
  return (
    <footer className="bg-slate-900 text-white px-4 md:px-8 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">

          {/* Col 1 — Identidad + Logos */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎓</span>
              <span className="font-semibold text-white text-base">
                Unidad Educativa Técnico Salesiano
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              ¡Cómo no te voy a querer! #SomosElTécnicoDelFuturo
            </p>
            <img
              src="/img/logo-main.png"
              alt="Logo UETS"
              className="h-48 w-auto object-contain"
            />
          </div>

          {/* Col 2 — Campus */}
          <div className="space-y-5">
            <h4 className="font-semibold text-amber-400 text-sm uppercase tracking-wider">
              Nuestros Campus
            </h4>
            {SEDES.map((sede) => (
              <div key={sede.nombre} className="space-y-1">
                <p className="text-white text-sm font-semibold">{sede.nombre}</p>
                <p className="text-slate-400 text-xs flex items-start gap-1.5">
                  <span className="shrink-0">📍</span> {sede.direccion}
                </p>
                <p className="text-slate-400 text-xs flex items-center gap-1.5">
                  <span>📞</span> {sede.telefono}
                </p>
              </div>
            ))}
          </div>

          {/* Col 3 — Redes + Carrusel de mapas */}
          <div className="space-y-4">
            <h4 className="font-semibold text-amber-400 text-sm uppercase tracking-wider">
              Síguenos
            </h4>
            <div className="flex flex-wrap gap-3">
              {SOCIAL_LINKS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-amber-400 hover:text-slate-900 transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>

            {/* Carrusel de mapas */}
            <div className="pt-2">
              <h4 className="font-semibold text-amber-400 text-sm uppercase tracking-wider mb-3">
                Ubícanos
              </h4>
              <MapCarousel />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-slate-500 text-xs">
          <span>© {new Date().getFullYear()} Unidad Educativa Técnico Salesiano — Todos los derechos reservados.</span>
          <span>Sistema PUM v1.0 — Departamento de Sistemas</span>
        </div>
      </div>
    </footer>
  );
}

// ── Página completa ──────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen font-sans">
      <Navbar />
      <Hero />
      <ComoFunciona />
      <Servicios />
      <Footer />
    </div>
  );
}
