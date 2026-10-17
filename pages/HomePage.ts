import { Locator, Page } from '@playwright/test';

export class HomePage {
  private readonly page: Page;

  // Locators
  private readonly accountNavigation: Locator;
  private readonly accountButton: Locator;
  private readonly registerLink: Locator;
  private readonly loginLink: Locator;
  private readonly logoutLink: Locator;
  private readonly searchInput: Locator;
  private readonly featuredHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.accountNavigation = page.getByRole('navigation').first();
    this.accountButton = this.accountNavigation
      .getByRole('button', { name: /My Account/ })
      .or(this.accountNavigation.getByRole('link', { name: /My Account/ }))
      .first();
    this.registerLink = this.accountNavigation.getByRole('link', { name: 'Register', exact: true });
    this.loginLink = this.accountNavigation.getByRole('link', { name: 'Login', exact: true });
    this.logoutLink = this.accountNavigation.getByRole('link', { name: 'Logout', exact: true });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.featuredHeading = page.getByRole('heading', { name: 'Featured', exact: true });
  }

  /**
   * Checks whether the storefront home page is displayed.
   * @returns Promise<boolean> - true when the Featured section is visible
   */
  async isHomePageDisplayed(): Promise<boolean> {
    return this.featuredHeading.isVisible();
  }

  /**
   * Opens the customer registration page.
   */
  async openRegistrationPage(): Promise<void> {
    try {
      await this.accountButton.click();
      await this.registerLink.click();
    } catch (error) {
      console.log(`Error opening the registration page: ${error}`);
      throw error;
    }
  }

  /**
   * Opens the customer login page.
   */
  async openLoginPage(): Promise<void> {
    try {
      await this.accountButton.click();
      await this.loginLink.click();
    } catch (error) {
      console.log(`Error opening the login page: ${error}`);
      throw error;
    }
  }

  /**
   * Logs out the currently authenticated customer.
   */
  async logout(): Promise<void> {
    try {
      await this.accountButton.click();
      await this.logoutLink.click();
    } catch (error) {
      console.log(`Error logging out: ${error}`);
      throw error;
    }
  }

  /**
   * Checks whether the storefront shows an unauthenticated account menu.
   * @returns Promise<boolean> - true when Login is available and Logout is not
   */
  async isLoggedOut(): Promise<boolean> {
    await this.accountButton.click();
    const loginIsVisible = await this.loginLink.isVisible();
    const logoutIsVisible = await this.logoutLink.isVisible();
    await this.accountButton.click();
    return loginIsVisible && !logoutIsVisible;
  }

  /**
   * Checks whether the authenticated account menu is displayed.
   * @returns Promise<boolean> - true when Logout is available and Login is not
   */
  async isLoggedIn(): Promise<boolean> {
    await this.accountButton.click();
    const loginIsVisible = await this.loginLink.isVisible();
    const logoutIsVisible = await this.logoutLink.isVisible();
    await this.accountButton.click();
    return logoutIsVisible && !loginIsVisible;
  }

  /**
   * Searches the catalog for a product.
   * @param productName - Product name to search for
   */
  async searchProduct(productName: string): Promise<void> {
    try {
      await this.searchInput.fill(productName);
      await this.searchInput.press('Enter');
      await this.page.waitForURL((url) => url.searchParams.get('route') === 'product/search');
      await this.page
        .getByRole('heading', { name: productName, exact: true })
        .waitFor({ state: 'visible' });
    } catch (error) {
      console.log(`Error searching for ${productName}: ${error}`);
      throw error;
    }
  }

  /**
   * Checks whether a matching product is shown in the search results.
   * @param productName - Product name expected in the search results
   * @returns Promise<boolean> - true when the product heading is visible
   */
  async isProductSearchResultDisplayed(productName: string): Promise<boolean> {
    return this.page.getByRole('heading', { name: productName, exact: true }).isVisible();
  }
}
