import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Build timestamp for cache busting
const BUILD_TIMESTAMP = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // AGGRESSIVE NO-CACHE HEADERS FOR DEVELOPMENT
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Plugin to replace build timestamp
    {
      name: 'build-timestamp',
      transformIndexHtml(html: string) {
        return html.replace('__BUILD_TIMESTAMP__', BUILD_TIMESTAMP);
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Expose build timestamp to the app
    '__BUILD_TIMESTAMP__': JSON.stringify(BUILD_TIMESTAMP),
  },
  build: {
    rollupOptions: {
      output: {
        // Force unique chunk names with timestamp
        entryFileNames: `assets/[name]-${BUILD_TIMESTAMP}-[hash].js`,
        chunkFileNames: `assets/[name]-${BUILD_TIMESTAMP}-[hash].js`,
        assetFileNames: `assets/[name]-${BUILD_TIMESTAMP}-[hash].[ext]`,
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
