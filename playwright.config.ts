import { config } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Carrega credenciais E2E de .env.e2e.local (não commitado)
config({ path: '.env.e2e.local' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Com 4 workers, auth/redirect e /avaliar ficam instáveis; localmente 2, CI 1
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: process.env.PLAYWRIGHT_SCREENSHOT_MODE === 'on' ? 'on' : 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    /** Cold start + deps; evita ERR_CONNECTION_REFUSED se o Vite demorar a subir */
    timeout: 180_000,
    env: {
      ...process.env,
      // E2E deve ser determinístico e não depender de integrações externas (ex.: Google Maps).
      // Se você quiser testar com Maps real, rode localmente com VITE_GOOGLE_MAPS_API_KEY no ambiente
      // e remova/ajuste esta linha.
      VITE_GOOGLE_MAPS_API_KEY: '',
    },
  },
});
