import { Locator, Page } from '@playwright/test';

export class AccountPage {
  private readonly page: Page;

  // Locators
  private readonly accountHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.accountHeading = page
      .locator('#content')
      .getByRole('heading', { name: 'My Account', exact: true })
      .first();
  }

  /**
   * Checks whether the authenticated customer account page is displayed.
   * @returns Promise<boolean> - true when the My Account heading is visible
   */
  async isMyAccountPageDisplayed(): Promise<boolean> {
    await this.accountHeading.waitFor({ state: 'visible' });
    return true;
  }

  /**
   * Checks whether the customer account page is currently visible without waiting.
   * @returns Promise<boolean> - true when the My Account heading is visible
   */
  async isMyAccountPageVisible(): Promise<boolean> {
    return this.accountHeading.isVisible();
  }
}
