import { test, expect, type APIResponse } from '@playwright/test';
import Ajv from 'ajv';
import dotenv from 'dotenv';
import { Routes } from '../../api/endpoints/routes';
import { DataProvider } from '../../utils/DataReader';
import { RandomDataUtil } from '../../utils/dataGenerator';

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || Routes.BASE_URL;
const API_USERNAME = process.env.API_USERNAME || process.env.USERNAME;
const API_PASSWORD = process.env.API_PASSWORD || process.env.PASSWORD;
const PRODUCT_ID = Number(process.env.PRODUCT_ID ?? '1');
const USER_ID = Number(process.env.USER_ID ?? '1');
const CART_ID = Number(process.env.CART_ID ?? '1');
const LIMIT = Number(process.env.LIMIT ?? '3');
const START_DATE = process.env.START_DATE ?? '2019-12-10';
const END_DATE = process.env.END_DATE ?? '2020-10-10';
const API_TEST_USER_PASSWORD = 'playwright-api-test-password';

const PRODUCT_PAYLOAD = {
  title: 'Playwright API Test Product',
  price: 49.99,
  description: 'Deterministic product data for FakeStore API tests.',
  image: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png',
  category: 'electronics',
};

const UPDATED_PRODUCT_PAYLOAD = {
  ...PRODUCT_PAYLOAD,
  title: 'Updated Playwright API Test Product',
  price: 59.99,
};

const USER_FIELDS_PAYLOAD = {
  email: 'playwright.api.user@example.com',
  username: 'playwright_api_user',
  name: {
    firstname: 'Playwright',
    lastname: 'Tester',
  },
  address: {
    city: 'Test City',
    street: 'Test Street',
    number: 123,
    zipcode: '12345',
    geolocation: {
      lat: '0.0000',
      long: '0.0000',
    },
  },
  phone: '1234567890',
};

const USER_PAYLOAD = {
  ...USER_FIELDS_PAYLOAD,
  password: API_TEST_USER_PASSWORD,
};

const UPDATED_USER_FIELDS_PAYLOAD = {
  ...USER_FIELDS_PAYLOAD,
  username: 'updated-playwright_api_user',
  name: {
    firstname: 'Updated',
    lastname: 'Tester',
  },
};

const UPDATED_USER_PAYLOAD = {
  ...UPDATED_USER_FIELDS_PAYLOAD,
  password: API_TEST_USER_PASSWORD,
};

const CART_PAYLOAD = {
  userId: USER_ID,
  date: '2020-03-02',
  products: [
    {
      productId: PRODUCT_ID,
      quantity: 2,
    },
  ],
};

const UPDATED_CART_PAYLOAD = {
  ...CART_PAYLOAD,
  products: [
    {
      productId: PRODUCT_ID,
      quantity: 3,
    },
  ],
};

type ProductResponse = typeof PRODUCT_PAYLOAD & {
  id: number;
  rating?: {
    rate: number;
    count: number;
  };
};

type UserResponse = typeof USER_PAYLOAD & {
  id: number;
  __v: number;
};

type CartResponse = typeof CART_PAYLOAD & {
  id: number;
  __v?: number;
};

const productSchema = DataProvider.readJson('./api/schemas/product_api_schema.json');
const userSchema = DataProvider.readJson('./api/schemas/user_api_schema.json');
const cartSchema = DataProvider.readJson('./api/schemas/cart_api_schema.json');
const ajv = new Ajv({ allErrors: true });

function routeWithId(route: string, id: number): string {
  return route.replace('{id}', String(id));
}

async function expectDeleteResponse(
  response: APIResponse,
  id: number,
  resource: string,
): Promise<void> {
  const responseText = await response.text();
  if (!responseText || responseText === 'null') {
    return;
  }

  const deleted = JSON.parse(responseText) as { id?: number };
  expect(deleted.id, `The deletion response should identify the deleted ${resource}`).toBe(id);
}

function expectProductFields(product: ProductResponse, context: string): void {
  expect(product.id, `${context}: product id should be a positive integer`).toBeGreaterThan(0);
  expect(product.title, `${context}: product title should be a string`).toEqual(expect.any(String));
  expect(product.price, `${context}: product price should be a number`).toEqual(expect.any(Number));
  expect(product.category, `${context}: product category should be a string`).toEqual(expect.any(String));
  expect(product.image, `${context}: product image should be a string`).toEqual(expect.any(String));
}

function expectSortedIds(ids: number[], order: 'asc' | 'desc', context: string): void {
  const sortedIds = [...ids].sort((first, second) =>
    order === 'asc' ? first - second : second - first,
  );
  expect(ids, `${context}: IDs should be sorted ${order}`).toEqual(sortedIds);
}

test.describe('FakeStore API Tests', () => {
  // ---------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------

  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  test('POST - Successful login @master @sanity @api', async ({ request }) => {
    test.skip(
      !API_USERNAME || !API_PASSWORD,
      'Configure API_USERNAME and API_PASSWORD to run the FakeStore authentication test.',
    );

    const response = await request.post(`${BASE_URL}${Routes.AUTH_LOGIN}`, {
      data: { username: API_USERNAME, password: API_PASSWORD },
    });

    expect(response.status(), 'Valid credentials should be accepted').toBe(201);

    const loginResult = await response.json();
    expect(loginResult, 'The login response should contain a token field').toHaveProperty('token');
    expect(typeof loginResult.token, 'The token should be a string').toBe('string');
    expect(loginResult.token.length, 'The token should not be empty').toBeGreaterThan(0);
  });

  test('POST - Invalid login @master @regression @api', async ({ request }) => {
    const payload = RandomDataUtil.generateInvalidLoginPayload();
    const response = await request.post(`${BASE_URL}${Routes.AUTH_LOGIN}`, { data: payload });

    expect(response.status(), 'Invalid credentials should be rejected').toBe(401);

    const errorMessage = await response.text();
    expect(errorMessage, 'The API should explain that the credentials are incorrect')
      .toBe('username or password is incorrect');
  });

  // ---------------------------------------------------------
  // Products - GET
  // ---------------------------------------------------------

  test('GET - All products @master @sanity @api', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_PRODUCTS}`);
    expect(response.status(), 'The product list request should succeed').toBe(200);

    const products = (await response.json()) as ProductResponse[];
    expect(Array.isArray(products), 'The product response should be an array').toBeTruthy();
    expect(products.length, 'The product list should not be empty').toBeGreaterThan(0);
    products.forEach((product, index) => expectProductFields(product, `Product ${index + 1}`));
  });

  test('GET - Product by ID @master @sanity @api', async ({ request }) => {
    const route = routeWithId(Routes.GET_PRODUCT_BY_ID, PRODUCT_ID);
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The product lookup should succeed').toBe(200);

    const product = (await response.json()) as ProductResponse;
    expect(product.id, 'The returned product ID should match the requested ID').toBe(PRODUCT_ID);
    expectProductFields(product, 'Product by ID');
  });

  test('GET - Products with limit @master @regression @api', async ({ request }) => {
    const route = Routes.GET_PRODUCTS_WITH_LIMIT.replace('{limit}', String(LIMIT));
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The limited product request should succeed').toBe(200);

    const products = (await response.json()) as ProductResponse[];
    expect(Array.isArray(products), 'The limited product response should be an array').toBeTruthy();
    expect(products.length, 'The API should return the requested number of products').toBe(LIMIT);
  });

  test('GET - Products sorted ascending @master @regression @api', async ({ request }) => {
    const route = Routes.GET_PRODUCTS_SORTED.replace('{order}', 'asc');
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The ascending product request should succeed').toBe(200);

    const products = (await response.json()) as ProductResponse[];
    expect(Array.isArray(products), 'The product response should be an array').toBeTruthy();
    expectSortedIds(products.map(({ id }) => id), 'asc', 'Products');
  });

  test('GET - Products sorted descending @master @regression @api', async ({ request }) => {
    const route = Routes.GET_PRODUCTS_SORTED.replace('{order}', 'desc');
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The descending product request should succeed').toBe(200);

    const products = (await response.json()) as ProductResponse[];
    expect(Array.isArray(products), 'The product response should be an array').toBeTruthy();
    expectSortedIds(products.map(({ id }) => id), 'desc', 'Products');
  });

  test('GET - All product categories @master @sanity @api', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_CATEGORIES}`);
    expect(response.status(), 'The category request should succeed').toBe(200);

    const categories = (await response.json()) as string[];
    expect(Array.isArray(categories), 'The category response should be an array').toBeTruthy();
    expect(categories.length, 'The category list should not be empty').toBeGreaterThan(0);
    expect(categories.every((category) => typeof category === 'string' && category.length > 0),
      'Every category should be a non-empty string').toBeTruthy();
  });

  test('GET - Products by category @master @regression @api', async ({ request }) => {
    const category = 'electronics';
    const route = Routes.GET_PRODUCTS_BY_CATEGORY.replace('{category}', encodeURIComponent(category));
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The category product request should succeed').toBe(200);

    const products = (await response.json()) as ProductResponse[];
    expect(Array.isArray(products), 'The category product response should be an array').toBeTruthy();
    expect(products.length, 'The selected category should contain products').toBeGreaterThan(0);
    expect(products.every((product) => product.category === category),
      'Every returned product should belong to the requested category').toBeTruthy();
  });

  // ---------------------------------------------------------
  // Products - CRUD
  // ---------------------------------------------------------

  test('POST - Create product @master @regression @api', async ({ request }) => {
    const payload = PRODUCT_PAYLOAD;
    const response = await request.post(`${BASE_URL}${Routes.CREATE_PRODUCT}`, { data: payload });
    expect(response.status(), 'The product creation request should succeed').toBe(201);

    const created = (await response.json()) as ProductResponse;
    expect(created.id, 'The API should return a generated product ID').toEqual(expect.any(Number));
    expect(created.id).toBeGreaterThan(0);
    expect(created, 'The response should contain the submitted product information').toMatchObject(payload);
  });

  test('PUT - Update product @master @regression @api', async ({ request }) => {
    const payload = UPDATED_PRODUCT_PAYLOAD;
    const route = routeWithId(Routes.UPDATE_PRODUCT, PRODUCT_ID);
    const response = await request.put(`${BASE_URL}${route}`, { data: payload });
    expect(response.status(), 'The product update request should succeed').toBe(200);

    const updated = (await response.json()) as ProductResponse;
    expect(updated.id, 'The updated product ID should match the requested ID').toBe(PRODUCT_ID);
    expect(updated, 'The response should contain the updated product information').toMatchObject(payload);
  });

  test('DELETE - Product @master @regression @api', async ({ request }) => {
    const route = routeWithId(Routes.DELETE_PRODUCT, PRODUCT_ID);
    const response = await request.delete(`${BASE_URL}${route}`);
    expect(response.status(), 'The product deletion request should succeed').toBe(200);

    await expectDeleteResponse(response, PRODUCT_ID, 'product');
  });

  // ---------------------------------------------------------
  // Users - GET
  // ---------------------------------------------------------

  test('GET - All users @master @sanity @api', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_USERS}`);
    expect(response.status(), 'The user list request should succeed').toBe(200);

    const users = (await response.json()) as UserResponse[];
    expect(Array.isArray(users), 'The user response should be an array').toBeTruthy();
    expect(users.length, 'The user list should not be empty').toBeGreaterThan(0);
  });

  test('GET - User by ID @master @sanity @api', async ({ request }) => {
    const route = routeWithId(Routes.GET_USER_BY_ID, USER_ID);
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The user lookup should succeed').toBe(200);

    const user = (await response.json()) as UserResponse;
    expect(user.id, 'The returned user ID should match the requested ID').toBe(USER_ID);
  });

  test('GET - Users with limit @master @regression @api', async ({ request }) => {
    const route = Routes.GET_USERS_WITH_LIMIT.replace('{limit}', String(LIMIT));
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The limited user request should succeed').toBe(200);

    const users = (await response.json()) as UserResponse[];
    expect(Array.isArray(users), 'The limited user response should be an array').toBeTruthy();
    expect(users.length, 'The API should return the requested number of users').toBe(LIMIT);
  });

  test('GET - Users sorted ascending @master @regression @api', async ({ request }) => {
    const route = Routes.GET_USERS_SORTED.replace('{order}', 'asc');
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The ascending user request should succeed').toBe(200);

    const users = (await response.json()) as UserResponse[];
    expect(Array.isArray(users), 'The user response should be an array').toBeTruthy();
    expectSortedIds(users.map(({ id }) => id), 'asc', 'Users');
  });

  test('GET - Users sorted descending @master @regression @api', async ({ request }) => {
    const route = Routes.GET_USERS_SORTED.replace('{order}', 'desc');
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The descending user request should succeed').toBe(200);

    const users = (await response.json()) as UserResponse[];
    expect(Array.isArray(users), 'The user response should be an array').toBeTruthy();
    expectSortedIds(users.map(({ id }) => id), 'desc', 'Users');
  });

  // ---------------------------------------------------------
  // Users - CRUD
  // ---------------------------------------------------------

  test('POST - Create user @master @regression @api', async ({ request }) => {
    const payload = USER_PAYLOAD;
    const response = await request.post(`${BASE_URL}${Routes.CREATE_USER}`, { data: payload });
    expect(response.status(), 'The user creation request should succeed').toBe(201);

    const created = (await response.json()) as { id: number };
    expect(created.id, 'The API should return a generated user ID').toEqual(expect.any(Number));
    expect(created.id).toBeGreaterThan(0);
  });

  test('PUT - Update user @master @regression @api', async ({ request }) => {
    const payload = UPDATED_USER_PAYLOAD;
    const route = routeWithId(Routes.UPDATE_USER, USER_ID);
    const response = await request.put(`${BASE_URL}${route}`, { data: payload });
    expect(response.status(), 'The user update request should succeed').toBe(200);

    const updated = (await response.json()) as typeof UPDATED_USER_PAYLOAD;
    expect(updated, 'The response should contain the updated user information')
      .toMatchObject(UPDATED_USER_FIELDS_PAYLOAD);
  });

  test('DELETE - User @master @regression @api', async ({ request }) => {
    const route = routeWithId(Routes.DELETE_USER, USER_ID);
    const response = await request.delete(`${BASE_URL}${route}`);
    expect(response.status(), 'The user deletion request should succeed').toBe(200);

    await expectDeleteResponse(response, USER_ID, 'user');
  });

  // ---------------------------------------------------------
  // Carts - GET
  // ---------------------------------------------------------

  test('GET - All carts @master @sanity @api', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_CARTS}`);
    expect(response.status(), 'The cart list request should succeed').toBe(200);

    const carts = (await response.json()) as CartResponse[];
    expect(Array.isArray(carts), 'The cart response should be an array').toBeTruthy();
    expect(carts.length, 'The cart list should not be empty').toBeGreaterThan(0);
  });

  test('GET - Cart by ID @master @sanity @api', async ({ request }) => {
    const route = routeWithId(Routes.GET_CART_BY_ID, CART_ID);
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The cart lookup should succeed').toBe(200);

    const cart = (await response.json()) as CartResponse;
    expect(cart.id, 'The returned cart ID should match the requested ID').toBe(CART_ID);
  });

  test('GET - Carts by date range @master @regression @api', async ({ request }) => {
    const route = Routes.GET_CARTS_BY_DATE_RANGE
      .replace('{startdate}', encodeURIComponent(START_DATE))
      .replace('{enddate}', encodeURIComponent(END_DATE));
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The date-range cart request should succeed').toBe(200);

    const carts = (await response.json()) as CartResponse[];
    expect(Array.isArray(carts), 'The date-range response should be an array').toBeTruthy();
    expect(carts.length, 'The requested date range should return matching carts').toBeGreaterThan(0);
    for (const cart of carts) {
      const cartDate = new Date(cart.date).getTime();
      expect(cartDate, `Cart ${cart.id} should not be before the start date`)
        .toBeGreaterThanOrEqual(new Date(START_DATE).getTime());
      expect(cartDate, `Cart ${cart.id} should not be after the end date`)
        .toBeLessThanOrEqual(new Date(`${END_DATE}T23:59:59.999Z`).getTime());
    }
  });

  test('GET - Carts for user @master @regression @api', async ({ request }) => {
    const route = Routes.GET_USER_CART.replace('{userId}', String(USER_ID));
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The user cart request should succeed').toBe(200);

    const carts = (await response.json()) as CartResponse[];
    expect(Array.isArray(carts), 'The user cart response should be an array').toBeTruthy();
    expect(carts.every((cart) => cart.userId === USER_ID),
      'Every returned cart should belong to the requested user').toBeTruthy();
  });

  test('GET - Carts with limit @master @regression @api', async ({ request }) => {
    const route = Routes.GET_CARTS_WITH_LIMIT.replace('{limit}', String(LIMIT));
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The limited cart request should succeed').toBe(200);

    const carts = (await response.json()) as CartResponse[];
    expect(Array.isArray(carts), 'The limited cart response should be an array').toBeTruthy();
    expect(carts.length, 'The API should return the requested number of carts').toBe(LIMIT);
  });

  test('GET - Carts sorted ascending @master @regression @api', async ({ request }) => {
    const route = Routes.GET_CARTS_SORTED.replace('{order}', 'asc');
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The ascending cart request should succeed').toBe(200);

    const carts = (await response.json()) as CartResponse[];
    expect(Array.isArray(carts), 'The cart response should be an array').toBeTruthy();
    expectSortedIds(carts.map(({ id }) => id), 'asc', 'Carts');
  });

  test('GET - Carts sorted descending @master @regression @api', async ({ request }) => {
    const route = Routes.GET_CARTS_SORTED.replace('{order}', 'desc');
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The descending cart request should succeed').toBe(200);

    const carts = (await response.json()) as CartResponse[];
    expect(Array.isArray(carts), 'The cart response should be an array').toBeTruthy();
    expectSortedIds(carts.map(({ id }) => id), 'desc', 'Carts');
  });

  // ---------------------------------------------------------
  // Carts - CRUD
  // ---------------------------------------------------------

  test('POST - Create cart @master @regression @api', async ({ request }) => {
    const payload = CART_PAYLOAD;
    const response = await request.post(`${BASE_URL}${Routes.CREATE_CART}`, { data: payload });
    expect(response.status(), 'The cart creation request should succeed').toBe(201);

    const created = (await response.json()) as CartResponse;
    expect(created.id, 'The API should return a generated cart ID').toEqual(expect.any(Number));
    expect(created.id).toBeGreaterThan(0);
    expect(created.userId, 'The created cart should retain the submitted user ID').toBe(USER_ID);
    expect(created.products, 'The created cart should retain the submitted products').toEqual(payload.products);
  });

  test('PUT - Update cart @master @regression @api', async ({ request }) => {
    const payload = UPDATED_CART_PAYLOAD;
    const route = routeWithId(Routes.UPDATE_CART, CART_ID);
    const response = await request.put(`${BASE_URL}${route}`, { data: payload });
    expect(response.status(), 'The cart update request should succeed').toBe(200);

    const updated = (await response.json()) as CartResponse;
    expect(updated.id, 'The updated cart ID should match the requested ID').toBe(CART_ID);
    expect(updated.userId, 'The updated cart should retain the submitted user ID').toBe(USER_ID);
    expect(updated.products, 'The response should contain the updated products').toEqual(payload.products);
  });

  test('DELETE - Cart @master @regression @api', async ({ request }) => {
    const route = routeWithId(Routes.DELETE_CART, CART_ID);
    const response = await request.delete(`${BASE_URL}${route}`);
    expect(response.status(), 'The cart deletion request should succeed').toBe(200);

    await expectDeleteResponse(response, CART_ID, 'cart');
  });

  // ---------------------------------------------------------
  // JSON Schema Validation
  // ---------------------------------------------------------

  test('GET - Validate product response schema @master @regression @api', async ({ request }) => {
    const route = routeWithId(Routes.GET_PRODUCT_BY_ID, PRODUCT_ID);
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The product schema request should succeed').toBe(200);

    const product = await response.json();
    const validateProduct = ajv.compile(productSchema);
    const isValid = validateProduct(product);
    expect(isValid, `Product response schema validation failed: ${ajv.errorsText(validateProduct.errors)}`)
      .toBeTruthy();
  });

  test('GET - Validate user response schema @master @regression @api', async ({ request }) => {
    const route = routeWithId(Routes.GET_USER_BY_ID, USER_ID);
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The user schema request should succeed').toBe(200);

    const user = await response.json();
    const validateUser = ajv.compile(userSchema);
    const isValid = validateUser(user);
    expect(isValid, `User response schema validation failed: ${ajv.errorsText(validateUser.errors)}`)
      .toBeTruthy();
  });

  test('GET - Validate cart response schema @master @regression @api', async ({ request }) => {
    const route = routeWithId(Routes.GET_CART_BY_ID, CART_ID);
    const response = await request.get(`${BASE_URL}${route}`);
    expect(response.status(), 'The cart schema request should succeed').toBe(200);

    const cart = await response.json();
    const validateCart = ajv.compile(cartSchema);
    const isValid = validateCart(cart);
    expect(isValid, `Cart response schema validation failed: ${ajv.errorsText(validateCart.errors)}`)
      .toBeTruthy();
  });
});

test.describe.serial('FakeStore CRUD API Workflows', () => {
  // ---------------------------------------------------------
  // Product create -> update -> delete
  // ---------------------------------------------------------

  test('POST/PUT/DELETE - Product CRUD workflow @master @regression @api', async ({ request }) => {
    const createPayload = PRODUCT_PAYLOAD;
    const createResponse = await request.post(`${BASE_URL}${Routes.CREATE_PRODUCT}`, {
      data: createPayload,
    });
    expect(createResponse.status(), 'Workflow product creation should return 201').toBe(201);

    const created = (await createResponse.json()) as ProductResponse;
    expect(created.id, 'The workflow should capture the created product ID').toEqual(expect.any(Number));
    expect(created, 'The created product should match the request payload').toMatchObject(createPayload);

    const updatePayload = UPDATED_PRODUCT_PAYLOAD;
    const updateRoute = routeWithId(Routes.UPDATE_PRODUCT, created.id);
    const updateResponse = await request.put(`${BASE_URL}${updateRoute}`, { data: updatePayload });
    expect(updateResponse.status(), 'Workflow product update should return 200').toBe(200);

    const updated = (await updateResponse.json()) as ProductResponse;
    expect(updated.id, 'The workflow should update the created product').toBe(created.id);
    expect(updated, 'The product response should contain the updated fields').toMatchObject(updatePayload);

    const deleteRoute = routeWithId(Routes.DELETE_PRODUCT, created.id);
    const deleteResponse = await request.delete(`${BASE_URL}${deleteRoute}`);
    expect(deleteResponse.status(), 'Workflow product deletion should return 200').toBe(200);

    await expectDeleteResponse(deleteResponse, created.id, 'created product');
  });

  // ---------------------------------------------------------
  // User create -> update -> delete
  // ---------------------------------------------------------

  test('POST/PUT/DELETE - User CRUD workflow @master @regression @api', async ({ request }) => {
    const createPayload = USER_PAYLOAD;
    const createResponse = await request.post(`${BASE_URL}${Routes.CREATE_USER}`, {
      data: createPayload,
    });
    expect(createResponse.status(), 'Workflow user creation should return 201').toBe(201);

    const created = (await createResponse.json()) as { id: number };
    expect(created.id, 'The workflow should capture the created user ID').toEqual(expect.any(Number));

    const updatePayload = UPDATED_USER_PAYLOAD;
    const updateRoute = routeWithId(Routes.UPDATE_USER, created.id);
    const updateResponse = await request.put(`${BASE_URL}${updateRoute}`, { data: updatePayload });
    expect(updateResponse.status(), 'Workflow user update should return 200').toBe(200);

    const updated = (await updateResponse.json()) as typeof UPDATED_USER_PAYLOAD;
    expect(updated, 'The user response should contain the updated fields')
      .toMatchObject(UPDATED_USER_FIELDS_PAYLOAD);

    const deleteRoute = routeWithId(Routes.DELETE_USER, created.id);
    const deleteResponse = await request.delete(`${BASE_URL}${deleteRoute}`);
    expect(deleteResponse.status(), 'Workflow user deletion should return 200').toBe(200);

    await expectDeleteResponse(deleteResponse, created.id, 'created user');
  });

  // ---------------------------------------------------------
  // Cart create -> update -> delete
  // ---------------------------------------------------------

  test('POST/PUT/DELETE - Cart CRUD workflow @master @regression @api', async ({ request }) => {
    const createPayload = CART_PAYLOAD;
    const createResponse = await request.post(`${BASE_URL}${Routes.CREATE_CART}`, {
      data: createPayload,
    });
    expect(createResponse.status(), 'Workflow cart creation should return 201').toBe(201);

    const created = (await createResponse.json()) as CartResponse;
    expect(created.id, 'The workflow should capture the created cart ID').toEqual(expect.any(Number));
    expect(created.userId, 'The created cart should contain the requested user ID').toBe(createPayload.userId);
    expect(created.products, 'The created cart should contain the submitted products').toEqual(createPayload.products);

    const updatePayload = {
      ...UPDATED_CART_PAYLOAD,
      userId: created.userId,
    };
    const updateRoute = routeWithId(Routes.UPDATE_CART, created.id);
    const updateResponse = await request.put(`${BASE_URL}${updateRoute}`, { data: updatePayload });
    expect(updateResponse.status(), 'Workflow cart update should return 200').toBe(200);

    const updated = (await updateResponse.json()) as CartResponse;
    expect(updated.id, 'The workflow should update the created cart').toBe(created.id);
    expect(updated.products, 'The cart should reflect the changed product quantity').toEqual(updatePayload.products);
    expect(updated.products[0].quantity).toBe(createPayload.products[0].quantity + 1);

    const deleteRoute = routeWithId(Routes.DELETE_CART, created.id);
    const deleteResponse = await request.delete(`${BASE_URL}${deleteRoute}`);
    expect(deleteResponse.status(), 'Workflow cart deletion should return 200').toBe(200);

    await expectDeleteResponse(deleteResponse, created.id, 'created cart');
  });
});
