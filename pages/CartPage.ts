import { Locator, Page } from '@playwright/test';

export class CartPage {
  private readonly page: Page;

  // Locators
  private readonly cartHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.cartHeading = page.getByRole('heading', { name: /^Shopping Cart/ });
  }

  /**
   * Checks whether the shopping cart page is displayed.
   * @returns Promise<boolean> - true when the cart heading is visible
   */
  async isCartPageDisplayed(): Promise<boolean> {
    return this.cartHeading.isVisible();
  }

  /**
   * Checks whether a product is present in the cart.
   * @param productName - Product name expected in the cart
   * @returns Promise<boolean> - true when the product row is visible
   */
  async isProductDisplayed(productName: string): Promise<boolean> {
    return this.getProductRow(productName).isVisible();
  }

  /**
   * Reads the quantity of a product in the cart.
   * @param productName - Product name in the cart
   * @returns Promise<string> - Quantity entered in the cart row
   */
  async getProductQuantity(productName: string): Promise<string> {
    return this.getProductRow(productName).locator('input[name^="quantity"]').inputValue();
  }

  /**
   * Reads a product's unit price in the cart.
   * @param productName - Product name in the cart
   * @returns Promise<string> - Unit price displayed for the product
   */
  async getProductUnitPrice(productName: string): Promise<string> {
    return this.getProductColumnValue(productName, 'Unit Price');
  }

  /**
   * Reads the line total for a product in the cart.
   * @param productName - Product name in the cart
   * @returns Promise<string> - Product line total
   */
  async getProductLineTotal(productName: string): Promise<string> {
    return this.getProductColumnValue(productName, 'Total');
  }

  /**
   * Reads the overall total displayed in the cart summary.
   * @returns Promise<string> - Cart total
   */
  async getCartTotal(): Promise<string> {
    const rows = this.page.locator('#content table tr');
    const rowCount = await rows.count();

    for (let index = 0; index < rowCount; index += 1) {
      const cells = rows.nth(index).locator('th, td');
      if ((await cells.first().innerText()).trim().replace(/:$/, '') === 'Total') {
        return (await cells.last().innerText()).trim();
      }
    }

    throw new Error('Could not find the cart total row.');
  }

  private getProductRow(productName: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('link', { name: productName, exact: false }),
    });
  }

  private async getProductColumnValue(productName: string, columnName: string): Promise<string> {
    const headerTexts = await this.page
      .locator('#content table')
      .first()
      .locator('tr')
      .first()
      .locator('th, td')
      .allInnerTexts();
    const columnIndex = headerTexts.findIndex((text) => text.trim().toLowerCase() === columnName.toLowerCase());

    if (columnIndex < 0) {
      throw new Error(`Could not find the "${columnName}" column in the shopping cart.`);
    }

    return this.getProductRow(productName).getByRole('cell').nth(columnIndex).innerText();
  }
}
