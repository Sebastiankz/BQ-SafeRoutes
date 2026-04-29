import { defineConfig } from 'vite';

// Configuración de Vite para desarrollo y build de producción.
// En "npm run dev" Vite levanta su propio servidor (puerto 5173 por defecto).
// En Docker, nginx sirve el resultado de "vite build".
export default defineConfig({
  server: {
    // Proxy en modo desarrollo: replica lo que hace nginx.conf en producción.
    // El frontend llama a "/api/..." con rutas relativas y Vite lo reenvía
    // al backend FastAPI. Así el mismo código funciona en dev y en Docker
    // sin cambiar URLs ni lidiar con CORS.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Quita el prefijo /api antes de reenviar, igual que nginx con proxy_pass.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
