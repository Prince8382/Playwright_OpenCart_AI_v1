/**
 * Test Case: Data-driven customer login
 *
 * Tags: @master @sanity @regression @web @datadriven
 *
 * Creates one independent login test for each row in the external JSON dataset.
 */
import { join } from 'node:path';
import { test, expect } from '../../fixtures/pageFixtures';
import { DataProvider } from '../../utils/DataReader';
import { RandomDataUtil } from '../../utils/dataGenerator';

type LoginTestCase = {
  testName: string;
  email: string;
  password: string;
  expected: 'success' | 'failure';
};

const loginCases = DataProvider.readJson(
  join(process.cwd(), 'testdata', 'opencart_logindata.json'),
) as LoginTestCase[];

test.describe('Data-driven customer login', () => {
  test.describe.configure({ mode: 'default', timeout: 60_000 });

  for (const [index, loginCase] of loginCases.entries()) {
    test(`${loginCase.testName} (data row ${index + 1}) @master @sanity @regression @web @datadriven`, async ({
      homePage,
      loginPage,
      accountPage,
      registerPage,
      logoutPage,
    }) => {
    const email = loginCase.email.trim();
    const password = loginCase.password.trim();
    const firstName = RandomDataUtil.getFirstName();
    const lastName = RandomDataUtil.getLastName();
    const telephone = RandomDataUtil.getPhoneNumber();

    await test.step('1) Provision the success-row account if it is missing', async () => {
      if (loginCase.expected === 'success') {
        await homePage.openRegistrationPage();
        let accountCreated = false;

        try {
          await registerPage.register(firstName, lastName, email, password, telephone);
          accountCreated = true;
        } catch (error) {
          const warning = await registerPage.getRegistrationWarning();
          if (!/e-mail address is already registered/i.test(warning)) {
            throw error;
          }
        }

        if (accountCreated) {
          await registerPage.continueToAccount();
          expect(await accountPage.isMyAccountPageDisplayed()).toBeTruthy();
          await homePage.logout();
          expect(await logoutPage.isLogoutPageDisplayed()).toBeTruthy();
          await logoutPage.continueToHomePage();
        }
      }

      await homePage.openLoginPage();
      expect(await loginPage.isLoginPageDisplayed()).toBeTruthy();
    });

    await test.step('2) Submit the credentials from this data row', async () => {
      await loginPage.submitLogin(email, password);
    });

    await test.step('3) Verify the result matches the expected outcome', async () => {
      if (loginCase.expected === 'success') {
        const loginResult = await loginPage.waitForLoginResult();
        if (loginResult === 'failure') {
          throw new Error(`The provisioned success-row credentials were rejected: ${await loginPage.getLoginWarning()}`);
        }

        expect(await accountPage.isMyAccountPageVisible()).toBeTruthy();
        expect(await homePage.isLoggedIn()).toBeTruthy();
      } else {
        expect(await loginPage.isLoginPageDisplayed()).toBeTruthy();
        expect(await loginPage.getLoginWarning()).toMatch(
          /^Warning: (No match for E-Mail Address and\/or Password\.|Your account has exceeded allowed number of login attempts\.)/,
        );
        expect(await accountPage.isMyAccountPageVisible()).toBeFalsy();
        expect(await homePage.isLoggedOut()).toBeTruthy();
      }
    });

        console.log(`✅ Data-driven login case "${loginCase.testName}" matched its expected result!`);
      });
    }
  });
