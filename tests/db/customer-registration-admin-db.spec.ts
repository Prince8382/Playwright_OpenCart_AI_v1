import { test, expect } from '../../fixtures/pageFixtures';
import dotenv from 'dotenv';
import { RandomDataUtil } from '../../utils/dataGenerator';
import { executeQuery } from '../../utils/dbClient';
import type { RowDataPacket } from 'mysql2';

dotenv.config();

interface CustomerRow extends RowDataPacket {
  firstname: string;
  lastname: string;
  email: string;
  status: number;
  date_added: Date | string | null;
}

function requireEnvironmentVariable(name: string, allowEmpty = false): string {
  const value = process.env[name];

  if (value === undefined || (!allowEmpty && value.trim() === '')) {
    throw new Error(`Required environment variable ${name} is not configured.`);
  }

  return value;
}

test('New customer is verified in Admin and MySQL @db @end-to-end', async ({
  homePage,
  registerPage,
  adminCustomerPage,
}) => {
  test.setTimeout(90_000);

  const adminUrl = requireEnvironmentVariable('ADMIN_URL');
  const adminUsername = requireEnvironmentVariable('ADMIN_USERNAME');
  const adminPassword = requireEnvironmentVariable('ADMIN_PASSWORD');
  requireEnvironmentVariable('DB_HOST');
  requireEnvironmentVariable('DB_USER');
  requireEnvironmentVariable('DB_PASSWORD', true);
  requireEnvironmentVariable('DB_NAME');

  const firstName = RandomDataUtil.getFirstName();
  const lastName = RandomDataUtil.getLastName();
  const email = RandomDataUtil.getEmail().toLowerCase().replace('@', `.${Date.now()}@`);
  const password = RandomDataUtil.getPassword();
  let customerRegistered = false;

  try {
    await test.step('Register a unique customer through the storefront', async () => {
      await homePage.openRegistrationPage();
      expect(await registerPage.isRegistrationPageDisplayed()).toBeTruthy();

      await registerPage.register(firstName, lastName, email, password);
      customerRegistered = true;
      expect(await registerPage.isRegistrationSuccessful()).toBeTruthy();
    });

    await test.step('Find and validate the customer in Admin', async () => {
      await adminCustomerPage.openLoginPage(adminUrl);
      await adminCustomerPage.login(adminUsername, adminPassword);
      expect(await adminCustomerPage.isAuthenticated()).toBeTruthy();

      await adminCustomerPage.openCustomersList();
      await adminCustomerPage.searchByEmail(email);
      expect(await adminCustomerPage.getCustomerResultCount(email)).toBe(1);

      await adminCustomerPage.openCustomerDetails(email);
      const customer = await adminCustomerPage.getCustomerDetails();
      expect(customer.firstName, 'Admin customer first name should match registration').toBe(firstName);
      expect(customer.lastName, 'Admin customer last name should match registration').toBe(lastName);
      expect(customer.email, 'Admin customer email should match registration').toBe(email);
      expect(customer.isEnabled, 'New customer should be enabled in Admin').toBe(true);
    });

    await test.step('Validate the registered customer in MySQL', async () => {
      const customers = await executeQuery(
        `SELECT customer_id, firstname, lastname, email, status, date_added
         FROM oc_customer
         WHERE email = ?`,
        [email],
      ) as CustomerRow[];

      expect(customers, 'Exactly one matching customer should exist in oc_customer').toHaveLength(1);
      const customer = customers[0];
      expect(customer.firstname, 'Database first name should match registration').toBe(firstName);
      expect(customer.lastname, 'Database last name should match registration').toBe(lastName);
      expect(customer.email, 'Database email should match registration').toBe(email);
      expect(customer.status, 'New customer status should be enabled in the database').toBe(1);
      expect(customer.date_added, 'Database date_added should be populated').toBeTruthy();
    });
  } finally {
    if (customerRegistered) {
      await executeQuery('DELETE FROM oc_customer WHERE email = ?', [email]);
    }
  }
});
