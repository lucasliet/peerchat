import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'assets',
  // IMPORTANTE: Substitua 'NOME_DO_REPOSITORIO' pelo nome do seu projeto no GitHub
  // Ex: se a URL é https://usuario.github.io/meu-chat/, a base deve ser '/meu-chat/'
  base: '/peerchat/',
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});