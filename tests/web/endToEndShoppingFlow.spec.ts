/**
 * Test Case: End-to-end customer shopping flow
 *
 * Tags: @master @sanity @regression @end-to-end
 *
 * Steps:
 * 1) Open the storefront
 * 2) Register a new customer
 * 3) Verify registration
 * 4) Log out
 * 5) Log in again
 * 6) Verify authentication
 * 7) Search for MacBook
 * 8) Open product details
 * 9) Add the product to the cart
 * 10) Open the cart
 * 11) Verify the product
 * 12) Verify the quantity
 * 13) Verify the product price
 * 14) Verify the cart total
 * 15) Verify the journey completes successfully
 */
import { test, expect } from '../../fixtures/pageFixtures';
import { RandomDataUtil } from '../../utils/dataGenerator';
import { Helper } from '../../utils/helper';

test.describe.configure({ timeout: 60_000 });

test('End-to-end shopping flow @master @sanity @regression @web @end-to-end', async ({
  homePage,
  registerPage,
  loginPage,
  accountPage,
  productPage,
  cartPage,
}) => {
  const firstName = RandomDataUtil.getFirstName();
  const lastName = RandomDataUtil.getLastName();
  const generatedEmail = RandomDataUtil.getEmail();
  const email = generatedEmail.replace('@', `.${Date.now()}@`);
  const password = RandomDataUtil.getPassword();
  const telephone = RandomDataUtil.getPhoneNumber();
  const { productName, productQuantity, totalPrice } = Helper.getProductDetails();

  await test.step('1) Open the storefront', async () => {
    expect(await homePage.isHomePageDisplayed()).toBeTruthy();
  });

  await test.step('2) Register a new customer with unique data', async () => {
    await homePage.openRegistrationPage();
    await registerPage.register(firstName, lastName, email, password, telephone);
  });

  await test.step('3) Verify successful registration', async () => {
    expect(await registerPage.isRegistrationSuccessful()).toBeTruthy();
    await registerPage.continueToAccount();
    expect(await accountPage.isMyAccountPageDisplayed()).toBeTruthy();
  });

  await test.step('4) Log out', async () => {
    await homePage.logout();
    expect(await homePage.isLoggedOut()).toBeTruthy();
  });

  await test.step('5) Log in again with the new customer credentials', async () => {
    await homePage.openLoginPage();
    await loginPage.login(email, password);
  });

  await test.step('6) Verify successful authentication', async () => {
    expect(await accountPage.isMyAccountPageDisplayed()).toBeTruthy();
  });

  await test.step('7) Search for the known product', async () => {
    await homePage.searchProduct(productName);
  });

  await test.step('8) Open the product details page', async () => {
    await productPage.openProductDetails(productName);
    expect(await productPage.isProductDetailsDisplayed(productName)).toBeTruthy();
  });

  await test.step('9) Add the product to the cart', async () => {
    expect(await productPage.getProductPrice()).toBe(totalPrice);
    expect(await productPage.getQuantity()).toBe(productQuantity);
    await productPage.addToCart();
  });

  await test.step('10) Open the shopping cart', async () => {
    await productPage.openShoppingCart();
    expect(await cartPage.isCartPageDisplayed()).toBeTruthy();
  });

  await test.step('11) Verify the correct product is in the cart', async () => {
    expect(await cartPage.isProductDisplayed(productName)).toBeTruthy();
  });

  await test.step('12) Verify the product quantity', async () => {
    expect(await cartPage.getProductQuantity(productName)).toBe(productQuantity);
  });

  await test.step('13) Verify the product price', async () => {
    expect(await cartPage.getProductUnitPrice(productName)).toBe(totalPrice);
    expect(await cartPage.getProductLineTotal(productName)).toBe(totalPrice);
  });

  await test.step('14) Verify the applicable cart total', async () => {
    expect(await cartPage.getCartTotal()).toBe(totalPrice);
  });

  await test.step('15) Confirm the shopping journey completed without errors', async () => {
    expect(await cartPage.isCartPageDisplayed()).toBeTruthy();
    console.log('✅ End-to-end shopping journey completed successfully!');
  });
});
