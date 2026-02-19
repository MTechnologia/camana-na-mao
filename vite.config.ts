import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Allow exposing both VITE_* (default) and CAMARA_* env vars to the client bundle.
  // This enables the migration from VITE_SUPABASE_* → CAMARA_* without breaking local/dev setups.
  envPrefix: ["VITE_", "CAMARA_"],
  server: {
    host: "::",
    port: 5173,
    hmr: process.env.VITE_HMR_CLIENT_PORT
      ? {
          // Em Docker: host expõe 8080→5173, cliente deve conectar na 8080
          clientPort: parseInt(process.env.VITE_HMR_CLIENT_PORT, 10),
          protocol: "ws",
        }
      : true, // Localmente: usa a mesma porta do servidor (5173)
    watch: {
      // Evitar problemas com volumes montados no Docker
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-motion': ['framer-motion'],
          
          // UI library chunks
          'ui-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'ui-icons': ['lucide-react'],
          
          // Feature chunks
          'charts': ['recharts'],
          'maps': ['mapbox-gl'],
          'markdown': ['react-markdown', 'remark-gfm', 'mermaid'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
}));
