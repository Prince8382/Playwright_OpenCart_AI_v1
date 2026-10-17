/**
 * Test Cases: OpenCart product search and cart flows
 *
 * Tags: @master @sanity @regression @web
 *
 * Covers product search and adding a product to the shopping cart.
 */
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';

test('Product search flow @master @sanity @regression @web', async ({ homePage }) => {
  const { productName } = Helper.getProductDetails();

  await test.step('1) Search for a known product', async () => {
    await homePage.searchProduct(productName);
  });

  await test.step('2) Verify the matching product appears in the results', async () => {
    expect(await homePage.isProductSearchResultDisplayed(productName)).toBeTruthy();
  });

  console.log('✅ Product search completed successfully!');
});

test('Add product to cart flow @master @sanity @regression @web', async ({
  homePage,
  productPage,
  cartPage,
}) => {
  const { productName, productQuantity } = Helper.getProductDetails();

  await test.step('1) Search for the product and open its details', async () => {
    await homePage.searchProduct(productName);
    await productPage.openProductDetails(productName);
    expect(await productPage.isProductDetailsDisplayed(productName)).toBeTruthy();
  });

  await test.step('2) Add the product to the cart', async () => {
    expect(await productPage.getQuantity()).toBe(productQuantity);
    await productPage.addToCart();
    expect(await productPage.isAddToCartConfirmationDisplayed()).toBeTruthy();
  });

  await test.step('3) Verify the product and quantity in the shopping cart', async () => {
    await productPage.openShoppingCart();
    expect(await cartPage.isCartPageDisplayed()).toBeTruthy();
    expect(await cartPage.isProductDisplayed(productName)).toBeTruthy();
    expect(await cartPage.getProductQuantity(productName)).toBe(productQuantity);
  });

  console.log('✅ Product was added to the cart with the expected quantity!');
});
