import { Locator, Page } from '@playwright/test';

export class RegisterPage {
  private readonly page: Page;

  // Locators
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly telephoneInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly privacyPolicyCheckbox: Locator;
  private readonly continueButton: Locator;
  private readonly successHeading: Locator;
  private readonly successContinueLink: Locator;
  private readonly registrationWarning: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.firstNameInput = page.getByPlaceholder('First Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.emailInput = page.getByPlaceholder('E-Mail');
    this.telephoneInput = page.getByPlaceholder('Telephone', { exact: true });
    this.passwordInput = page.getByPlaceholder('Password', { exact: true });
    this.confirmPasswordInput = page.getByPlaceholder('Password Confirm', { exact: true });
    this.privacyPolicyCheckbox = page.locator('input[name="agree"]');
    this.continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.successHeading = page.getByRole('heading', {
      name: 'Your Account Has Been Created!',
      exact: true,
    });
    this.successContinueLink = page.getByRole('link', { name: 'Continue', exact: true });
    this.registrationWarning = page.locator('.alert-danger');
  }

  /**
   * Checks whether the customer registration form is displayed.
   * @returns Promise<boolean> - true when the first-name field is visible
   */
  async isRegistrationPageDisplayed(): Promise<boolean> {
    return this.firstNameInput.isVisible();
  }

  /**
   * Submits the customer registration form.
   * @param firstName - Customer first name
   * @param lastName - Customer last name
   * @param email - Unique customer email
   * @param password - Customer password
   * @param telephone - Customer telephone number when requested by the form
   */
  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    telephone = '',
  ): Promise<void> {
    try {
      await this.firstNameInput.fill(firstName);
      await this.lastNameInput.fill(lastName);
      await this.emailInput.fill(email);
      if (await this.telephoneInput.isVisible()) {
        if (!telephone) {
          throw new Error('A telephone number is required by this registration form.');
        }
        await this.telephoneInput.fill(telephone);
      }
      await this.passwordInput.fill(password);
      if (await this.confirmPasswordInput.isVisible()) {
        await this.confirmPasswordInput.fill(password);
      }
      await this.privacyPolicyCheckbox.check();
      await this.continueButton.click();
      await this.successHeading.or(this.registrationWarning).first().waitFor({ state: 'visible' });
      if (await this.registrationWarning.isVisible()) {
        throw new Error((await this.registrationWarning.innerText()).trim());
      }
    } catch (error) {
      console.log(`Error registering customer ${email}: ${error}`);
      throw error;
    }
  }

  /**
   * Checks whether the registration success page is displayed.
   * @returns Promise<boolean> - true when the success heading is visible
   */
  async isRegistrationSuccessful(): Promise<boolean> {
    return this.successHeading.isVisible();
  }

  /**
   * Reads the registration warning shown after an unsuccessful submission.
   * @returns Promise<string> - The visible registration warning
   */
  async getRegistrationWarning(): Promise<string> {
    return (await this.registrationWarning.innerText()).trim();
  }

  /**
   * Continues from the registration success page to the customer account.
   */
  async continueToAccount(): Promise<void> {
    await this.successContinueLink.click();
  }
}
