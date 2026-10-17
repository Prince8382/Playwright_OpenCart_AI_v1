import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const storefrontUrl = (name: string, defaultUrl: string): string => {
  const value = process.env[name]?.trim() || defaultUrl;

  if (!value) {
    throw new Error(`Required environment variable ${name} is not configured.`);
  }

  return value;
};

export default defineConfig({
  timeout: 30 * 1000,   //30000 ms(30 secs)
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],                           // Detailed console output
    //['line'],                         // One-line progress output
    //['dot'],                          // Minimal console output
    ['html', { open: 'never', outputFolder: 'reports' }],        // HTML Report
    //['json', { outputFile: 'reports/results.json' }], // JSON Report
    ['junit', { outputFile: 'reports/results.xml' }],  // JUnit XML Report
    ['./utils/CustomReporter.ts'], // Custom reporter
    ['allure-playwright', { outputFolder: 'allure-results' }],  // Allure Report
   
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 }, // Set default viewport size for consistency
    ignoreHTTPSErrors: true, // Ignore SSL errors if necessary
    permissions: ['geolocation'], // Set necessary permissions for geolocation-based tests
  },
  //grep: /@master/,
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/web/endToEndShoppingFlow.spec.ts',
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: storefrontUrl('WEB_APP_URL', 'http://localhost/opencart/upload/'),
      },
    },
    {
      name: 'opencart-local',
      testMatch: '**/web/endToEndShoppingFlow.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: storefrontUrl('WEB_APP_URL', 'http://localhost/opencart/upload/'),
      },
    },
    {
      name: 'tutorialsninja',
      testMatch: '**/web/endToEndShoppingFlow.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: storefrontUrl('WEB_APP_URL_TUTORIALSNINJA', 'https://tutorialsninja.com/demo/'),
      },
    },
    {
      name: 'awesomeqa',
      testMatch: '**/web/endToEndShoppingFlow.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: storefrontUrl('WEB_APP_URL_AWESOMEQA', 'https://awesomeqa.com/ui/'),
      },
    },
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
    */
  ],
});