import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    host: true, // listen on all interfaces for reverse proxy
    port: 20910,
    allowedHosts: [
      "competitor-tracker14.dev.portnumber53.com",
      "competitor-tracker164.dev.portnumber53.com"
    ],
  },
  preview: {
    host: true,
    port: 20910,
  },
})