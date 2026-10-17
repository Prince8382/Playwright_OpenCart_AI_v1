/**
 * Test Cases: OpenCart customer account flows
 *
 * Tags: @master @sanity @regression @web
 *
 * Covers registration, valid and invalid login, and logout.
 */
import { test, expect } from '../../fixtures/pageFixtures';
import { RandomDataUtil } from '../../utils/dataGenerator';

test('Customer registration flow @master @sanity @regression @web', async ({
  homePage,
  registerPage,
  accountPage,
}) => {
  const firstName = RandomDataUtil.getFirstName();
  const lastName = RandomDataUtil.getLastName();
  const email = RandomDataUtil.getEmail().replace('@', `.${Date.now()}@`);
  const password = RandomDataUtil.getPassword();
  const telephone = RandomDataUtil.getPhoneNumber();

  await test.step('1) Open the customer registration page', async () => {
    await homePage.openRegistrationPage();
    expect(await registerPage.isRegistrationPageDisplayed()).toBeTruthy();
  });

  await test.step('2) Register a customer with unique data', async () => {
    await registerPage.register(firstName, lastName, email, password, telephone);
  });

  await test.step('3) Verify registration and authenticated account navigation', async () => {
    expect(await registerPage.isRegistrationSuccessful()).toBeTruthy();
    await registerPage.continueToAccount();
    expect(await accountPage.isMyAccountPageDisplayed()).toBeTruthy();
    expect(await homePage.isLoggedIn()).toBeTruthy();
  });

  console.log('✅ Customer registration completed successfully!');
});

test('Valid customer login flow @master @sanity @regression @web', async ({
  homePage,
  registerPage,
  loginPage,
  logoutPage,
  accountPage,
}) => {
  const firstName = RandomDataUtil.getFirstName();
  const lastName = RandomDataUtil.getLastName();
  const email = RandomDataUtil.getEmail().replace('@', `.${Date.now()}@`);
  const password = RandomDataUtil.getPassword();
  const telephone = RandomDataUtil.getPhoneNumber();

  await test.step('1) Create an independent customer account for login', async () => {
    await homePage.openRegistrationPage();
    await registerPage.register(firstName, lastName, email, password, telephone);
    await registerPage.continueToAccount();
    expect(await accountPage.isMyAccountPageDisplayed()).toBeTruthy();
    await homePage.logout();
    expect(await logoutPage.isLogoutPageDisplayed()).toBeTruthy();
    await logoutPage.continueToHomePage();
  });

  await test.step('2) Open the customer login page', async () => {
    await homePage.openLoginPage();
    expect(await loginPage.isLoginPageDisplayed()).toBeTruthy();
  });

  await test.step('3) Log in with the registered customer credentials', async () => {
    await loginPage.login(email, password);
  });

  await test.step('4) Verify the authenticated account area', async () => {
    expect(await accountPage.isMyAccountPageDisplayed()).toBeTruthy();
    expect(await homePage.isLoggedIn()).toBeTruthy();
  });

  console.log('✅ Customer login completed successfully!');
});

test('Invalid customer login flow @master @sanity @regression @web', async ({
  homePage,
  loginPage,
  accountPage,
}) => {
  const email = RandomDataUtil.getEmail();
  const password = RandomDataUtil.getPassword();

  await test.step('1) Open the customer login page', async () => {
    await homePage.openLoginPage();
    expect(await loginPage.isLoginPageDisplayed()).toBeTruthy();
  });

  await test.step('2) Submit invalid customer credentials', async () => {
    await loginPage.submitLogin(email, password);
  });

  await test.step('3) Verify authentication is rejected with the expected warning', async () => {
    expect(await loginPage.getLoginWarning()).toMatch(
      /^Warning: (No match for E-Mail Address and\/or Password\.|Your account has exceeded allowed number of login attempts\.)/,
    );
    expect(await loginPage.isLoginPageDisplayed()).toBeTruthy();
    expect(await accountPage.isMyAccountPageVisible()).toBeFalsy();
    expect(await homePage.isLoggedOut()).toBeTruthy();
  });

  console.log('✅ Invalid customer login was rejected as expected!');
});

test('Customer logout flow @master @sanity @regression @web', async ({
  homePage,
  registerPage,
  accountPage,
  logoutPage,
}) => {
  const firstName = RandomDataUtil.getFirstName();
  const lastName = RandomDataUtil.getLastName();
  const email = RandomDataUtil.getEmail().replace('@', `.${Date.now()}@`);
  const password = RandomDataUtil.getPassword();
  const telephone = RandomDataUtil.getPhoneNumber();

  await test.step('1) Create a customer account and verify authentication', async () => {
    await homePage.openRegistrationPage();
    await registerPage.register(firstName, lastName, email, password, telephone);
    await registerPage.continueToAccount();
    expect(await accountPage.isMyAccountPageDisplayed()).toBeTruthy();
    expect(await homePage.isLoggedIn()).toBeTruthy();
  });

  await test.step('2) Log out and verify the confirmation page', async () => {
    await homePage.logout();
    expect(await logoutPage.isLogoutPageDisplayed()).toBeTruthy();
  });

  await test.step('3) Continue to the storefront and verify the customer is logged out', async () => {
    await logoutPage.continueToHomePage();
    expect(await homePage.isHomePageDisplayed()).toBeTruthy();
    expect(await homePage.isLoggedOut()).toBeTruthy();
  });

  console.log('✅ Customer logout completed successfully!');
});
