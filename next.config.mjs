import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // El repo raíz tiene otro package-lock.json (el sitio estático actual);
  // fijamos la raíz de Turbopack a esta app para evitar la inferencia ambigua.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
