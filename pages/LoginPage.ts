import { Locator, Page } from '@playwright/test';

export class LoginPage {
  private readonly page: Page;

  // Locators
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly accountHeading: Locator;
  private readonly loginHeading: Locator;
  private readonly loginWarning: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.emailInput = page.getByRole('textbox', { name: 'E-Mail Address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    this.accountHeading = page
      .locator('#content')
      .getByRole('heading', { name: 'My Account', exact: true })
      .first();
    this.loginHeading = page.getByRole('heading', { name: 'Returning Customer', exact: true });
    this.loginWarning = page.locator('.alert-danger');
  }

  /**
   * Authenticates the customer with the supplied credentials.
   * @param email - Customer email address
   * @param password - Customer password
   */
  async login(email: string, password: string): Promise<void> {
    try {
      await this.submitLogin(email, password);
      await this.accountHeading.waitFor({ state: 'visible', timeout: 10_000 });
    } catch (error) {
      console.log(`Error logging in customer ${email}: ${error}`);
      throw error;
    }
  }

  /**
   * Submits the supplied credentials without assuming the authentication result.
   * @param email - Customer email address
   * @param password - Customer password
   */
  async submitLogin(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Waits for either the authenticated account heading or a login warning.
   * @returns Promise<'success' | 'failure'> - The observed login outcome
   */
  async waitForLoginResult(): Promise<'success' | 'failure'> {
    await this.accountHeading
      .or(this.loginWarning)
      .first()
      .waitFor({ state: 'visible' });
    return (await this.accountHeading.isVisible()) ? 'success' : 'failure';
  }

  /**
   * Checks whether the customer login form is displayed.
   * @returns Promise<boolean> - true when the login form heading is visible
   */
  async isLoginPageDisplayed(): Promise<boolean> {
    return this.loginHeading.isVisible();
  }

  /**
   * Reads the login warning shown after an unsuccessful submission.
   * @returns Promise<string> - The visible login warning
   */
  async getLoginWarning(): Promise<string> {
    return (await this.loginWarning.innerText()).trim();
  }
}
