import { test as base } from '@playwright/test';
import dotenv from 'dotenv';
import { AccountPage } from '../pages/AccountPage';
import { CartPage } from '../pages/CartPage';
import { AdminCustomerPage } from '../pages/AdminCustomerPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { LogoutPage } from '../pages/LogoutPage';
import { ProductPage } from '../pages/ProductPage';
import { RegisterPage } from '../pages/RegisterPage';

dotenv.config();

const appUrl = process.env.WEB_APP_URL?.trim() || 'http://localhost/opencart/upload/';

type PageFixtures = {
  adminCustomerPage: AdminCustomerPage;
  homePage: HomePage;
  registerPage: RegisterPage;
  loginPage: LoginPage;
  logoutPage: LogoutPage;
  accountPage: AccountPage;
  productPage: ProductPage;
  cartPage: CartPage;
};

export const test = base.extend<PageFixtures>({
  adminCustomerPage: async ({ page }, use) => {
    await use(new AdminCustomerPage(page));
  },
  homePage: async ({ page, baseURL }, use) => {
    const url = baseURL ?? appUrl;
    await page.goto(url);
    await use(new HomePage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  logoutPage: async ({ page }, use) => {
    await use(new LogoutPage(page));
  },
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
});

test.afterEach(async ({ page, context }) => {
  if (!page.isClosed()) {
    await page.close();
  }
  await context.close();
});

export { expect } from '@playwright/test';
