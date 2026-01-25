import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Preload und Prefetch Optimierungen
    warmup: {
      clientFiles: [
        './src/features/home/HomePage.tsx',
        './src/features/projects/ProjectsPage.tsx',
        './src/features/profile/ProfilePage.tsx'
      ]
    }
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2022",
    minify: !process.env.TAURI_DEBUG,
    sourcemap: !!process.env.TAURI_DEBUG,
    // Performance optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'tauri': ['@tauri-apps/api/event', '@tauri-apps/api/core', '@tauri-apps/plugin-opener']
        },
        // Preload wichtige Chunks
        experimentalMinChunkSize: 10000
      }
    },
    // Increase chunk size warning limit for large vendor bundles
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Module preload polyfill
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps) => {
        // Preload kritische Dependencies
        return deps;
      }
    }
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // Force pre-bundling für besseres Caching
    force: false
  }
}));
