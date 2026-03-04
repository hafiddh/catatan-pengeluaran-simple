// @ts-nocheck
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "url";

import react from "@astrojs/react";

const isLocalHttpsEnabled = process.env.LOCAL_HTTPS === "true";
const certPath = "./certs/dev-cert.pem";
const keyPath = "./certs/dev-key.pem";

const httpsOptions =
  isLocalHttpsEnabled && existsSync(certPath) && existsSync(keyPath)
    ? {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
      }
    : isLocalHttpsEnabled
      ? true
      : false;

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      https: httpsOptions,
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@components": fileURLToPath(
          new URL("./src/components", import.meta.url),
        ),
      },
    },
  },

  integrations: [react()],
});