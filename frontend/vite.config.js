import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'livekit-vendor': ['livekit-client', '@livekit/components-react', '@livekit/components-styles'],
          'ui-vendor': ['recharts', 'lucide-react']
        }
      }
    }
  }
})
