import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const buildTimestamp = Date.now();
try {
  const publicDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(publicDir, 'version.json'),
    JSON.stringify({
      version: buildTimestamp,
      buildDate: new Date().toISOString()
    })
  );
} catch (e) {
  console.warn('Warning generating version.json:', e.message);
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTimestamp)
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
  server: {
    port: 3000,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('@supabase') || id.includes('socket.io-client')) return 'realtime-vendor';
          if (id.includes('framer-motion') || id.includes('ogl') || id.includes('canvas-confetti')) return 'motion-vendor';
          if (id.includes('emoji-picker-react')) return 'emoji-vendor';
          return 'vendor';
        }
      }
    }
  }
});

