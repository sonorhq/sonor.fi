import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4180' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] }
      }
    }
  ],
  webServer: { command: 'node server.mjs', url: 'http://localhost:4180/sender.html', reuseExistingServer: true }
})
