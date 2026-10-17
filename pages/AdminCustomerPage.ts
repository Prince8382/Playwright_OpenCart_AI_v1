import { Locator, Page } from '@playwright/test';

export interface AdminCustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  isEnabled: boolean;
}

export class AdminCustomerPage {
  private readonly page: Page;

  // Locators
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly sidebarNavigation: Locator;
  private readonly customersMenu: Locator;
  private readonly customerListLink: Locator;
  private readonly emailFilter: Locator;
  private readonly filterButton: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly customerEmailInput: Locator;
  private readonly customerStatusCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators from the verified Admin interface
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    this.sidebarNavigation = page.getByRole('navigation').first();
    this.customersMenu = this.sidebarNavigation.getByRole('link', { name: /^Customers/ }).first();
    this.customerListLink = this.sidebarNavigation.getByRole('link', { name: /Customers/ }).nth(1);
    this.emailFilter = page.getByRole('textbox', { name: 'E-Mail' });
    this.filterButton = page.getByRole('button', { name: 'Filter', exact: true });
    this.firstNameInput = page.locator('#input-firstname');
    this.lastNameInput = page.locator('#input-lastname');
    this.customerEmailInput = page.locator('#input-email');
    this.customerStatusCheckbox = page.locator('#input-status');
  }

  /**
   * Opens the configured Admin login page.
   * @param url - Admin login URL
   */
  async openLoginPage(url: string): Promise<void> {
    await this.page.goto(url);
    await this.usernameInput.waitFor({ state: 'visible' });
  }

  /**
   * Authenticates to the Admin Portal.
   * @param username - Configured Admin username
   * @param password - Configured Admin password
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.customersMenu.waitFor({ state: 'visible' });
  }

  /**
   * Checks whether the Admin navigation is displayed after authentication.
   * @returns Promise<boolean> - true when the Customers navigation is visible
   */
  async isAuthenticated(): Promise<boolean> {
    return this.customersMenu.isVisible();
  }

  /**
   * Opens the Customers list from the Admin navigation.
   */
  async openCustomersList(): Promise<void> {
    if (!(await this.customerListLink.isVisible())) {
      await this.customersMenu.click();
    }
    await this.customerListLink.click();
    await this.emailFilter.waitFor({ state: 'visible' });
  }

  /**
   * Filters the Admin customer list by email address.
   * @param email - Unique registered customer email
   */
  async searchByEmail(email: string): Promise<void> {
    await this.emailFilter.fill(email);
    await this.filterButton.click();
    await this.customerRow(email).waitFor({ state: 'visible' });
  }

  /**
   * Returns the number of Admin customer rows matching the email.
   * @param email - Customer email address
   * @returns Promise<number> - number of matching rows
   */
  async getCustomerResultCount(email: string): Promise<number> {
    return this.customerRow(email).count();
  }

  /**
   * Opens the matching customer's Admin details.
   * @param email - Customer email address
   */
  async openCustomerDetails(email: string): Promise<void> {
    await this.customerRow(email).getByRole('link', { name: 'Edit', exact: true }).click();
    await this.firstNameInput.waitFor({ state: 'visible' });
  }

  /**
   * Reads the customer identity and enabled status from the Admin record.
   * @returns Promise<AdminCustomerDetails> - customer details shown by Admin
   */
  async getCustomerDetails(): Promise<AdminCustomerDetails> {
    return {
      firstName: await this.firstNameInput.inputValue(),
      lastName: await this.lastNameInput.inputValue(),
      email: await this.customerEmailInput.inputValue(),
      isEnabled: await this.customerStatusCheckbox.isChecked(),
    };
  }

  private customerRow(email: string): Locator {
    return this.page.getByRole('row').filter({ hasText: email });
  }
}
