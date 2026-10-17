import { Locator, Page } from '@playwright/test';

export class ProductPage {
  private readonly page: Page;

  // Locators
  private readonly productPrice: Locator;
  private readonly quantityInput: Locator;
  private readonly addToCartButton: Locator;
  private readonly shoppingCartLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.productPrice = page.getByRole('heading', { name: /^\$[\d,]+\.\d{2}$/ });
    this.quantityInput = page.locator('#input-quantity');
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart', exact: true });
    this.shoppingCartLink = page.locator('a[href*="route=checkout/cart"]').first();
  }

  /**
   * Opens the exact product from the search results.
   * @param productName - Product name to open
   */
  async openProductDetails(productName: string): Promise<void> {
    try {
      await this.page
        .getByRole('heading', { name: productName, exact: true })
        .getByRole('link', { name: productName, exact: true })
        .click();
      await this.page
        .getByRole('heading', { name: productName, exact: true })
        .first()
        .waitFor({ state: 'visible' });
      await this.page.waitForLoadState('load');
    } catch (error) {
      console.log(`Error opening product details for ${productName}: ${error}`);
      throw error;
    }
  }

  /**
   * Checks whether the requested product detail page is displayed.
   * @param productName - Product name expected in the page heading
   * @returns Promise<boolean> - true when the product heading is visible
   */
  async isProductDetailsDisplayed(productName: string): Promise<boolean> {
    return this.page.getByRole('heading', { name: productName, exact: true }).isVisible();
  }

  /**
   * Reads the displayed product price.
   * @returns Promise<string> - Product price text
   */
  async getProductPrice(): Promise<string> {
    return this.productPrice.innerText();
  }

  /**
   * Reads the selected product quantity.
   * @returns Promise<string> - Quantity shown on the product page
   */
  async getQuantity(): Promise<string> {
    return this.quantityInput.inputValue();
  }

  /**
   * Adds the product to the shopping cart.
   */
  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
    await this.page
      .locator('.alert-success')
      .filter({ hasText: /you have added .* to your shopping cart/i })
      .waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Checks whether the product-added confirmation is displayed.
   * @returns Promise<boolean> - true when the storefront confirms the product was added
   */
  async isAddToCartConfirmationDisplayed(): Promise<boolean> {
    return this.page
      .locator('.alert-success')
      .filter({ hasText: /you have added .* to your shopping cart/i })
      .isVisible();
  }

  /**
   * Opens the shopping cart.
   */
  async openShoppingCart(): Promise<void> {
    await this.shoppingCartLink.click();
    await this.page.waitForURL((url) => url.searchParams.get('route') === 'checkout/cart');
  }
}
