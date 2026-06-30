import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration. The dev server binds to 0.0.0.0 so it is reachable
// from outside the Docker container, and the port matches the one exposed
// in the frontend Dockerfile and docker-compose.yml.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
