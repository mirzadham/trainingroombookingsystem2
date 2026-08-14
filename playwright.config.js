import { defineConfig, devices } from '@playwright/test';

/**
 * E2E test configuration for the Training Room Booking System.
 *
 * The app is served by Laragon at trainingroombookingsystem2.test; if that
 * server is not running, Playwright falls back to `php artisan serve` on
 * port 8000 (see webServer below).
 */
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // tests share one dev database — serialize runs
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ],
    timeout: 60_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: process.env.BASE_URL || 'http://trainingroombookingsystem2.test',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        // The SPA/api must answer JSON errors (422) instead of redirecting
        // validation failures to the SPA shell.
        extraHTTPHeaders: { Accept: 'application/json' },
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8000',
        url: 'http://127.0.0.1:8000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
