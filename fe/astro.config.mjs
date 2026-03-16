// @ts-nocheck
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "url";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],

    server: {
      host: true,
      allowedHosts: [".joeichiro.my.id"],
    },

    preview: {
      host: true,
      allowedHosts: [".joeichiro.my.id"],
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
