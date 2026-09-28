import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    channel: 'msedge',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node backend/test/start-e2e.cjs',
      url: 'http://127.0.0.1:3100/health',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev -w frontend -- --port 5174',
      url: 'http://localhost:5174',
      env: { VITE_API_URL: 'http://127.0.0.1:3100' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
