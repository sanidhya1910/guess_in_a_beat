import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Auth (/auth/*), provider proxies (/api/*), Socket.IO, and SQLite all live
// in server/index.js now — that's the single process for both dev and
// production (see server/index.js's Vite-middleware-mode / static-serve
// branch). This config is only consulted for `vite build` and for the
// dev-mode `createViteServer({ middlewareMode: true })` call server/index.js
// makes; it intentionally has no server-side logic of its own anymore.
export default defineConfig({
  plugins: [react()],
})
