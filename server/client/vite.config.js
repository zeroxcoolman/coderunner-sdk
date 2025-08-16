import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  define: {
    // Ensure env vars are available at build time
    'import.meta.env.VITE_DISCORD_CLIENT_ID': JSON.stringify(process.env.VITE_DISCORD_CLIENT_ID)
  }
});
