import { Locator, Page } from '@playwright/test';

export class LogoutPage {
  private readonly page: Page;

  // Locators
  private readonly logoutHeading: Locator;
  private readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.logoutHeading = page.getByRole('heading', { name: 'Account Logout', exact: true });
    this.continueLink = page.getByRole('link', { name: 'Continue', exact: true });
  }

  /**
   * Checks whether the logout confirmation page is displayed.
   * @returns Promise<boolean> - true when the Account Logout heading is visible
   */
  async isLogoutPageDisplayed(): Promise<boolean> {
    return this.logoutHeading.isVisible();
  }

  /**
   * Continues from the logout confirmation page to the storefront home page.
   */
  async continueToHomePage(): Promise<void> {
    await this.continueLink.click();
    await this.page.waitForURL((url) => url.searchParams.get('route') === 'common/home');
  }
}
