import type { NextConfig } from "next";
import path from "node:path";
import fs from "node:fs";

// Carga manual de .env.local porque next.config.ts se evalúa antes de que Next.js
// inyecte las variables de entorno — sin esto, CLOUDFLARE_TUNNEL_HOST llega vacío.
function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = val;
  }
  return result;
}

const env = loadEnvLocal();

// Hosts adicionales permitidos para acceder al servidor de desarrollo.
// Actualiza CLOUDFLARE_TUNNEL_HOST en .env.local cuando cambie el túnel.
const extraDevOrigins: string[] = [
  env.DEV_LAN_IP            ?? "",
  env.CLOUDFLARE_TUNNEL_HOST ?? "",
].filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: extraDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // Suprime el warning de múltiples lockfiles — el proyecto está en una subcarpeta
  turbopack: {
    root: path.resolve(__dirname),
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;