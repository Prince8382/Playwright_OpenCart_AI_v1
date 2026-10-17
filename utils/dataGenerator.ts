import { faker } from '@faker-js/faker';

export class RandomDataUtil {
  static getFirstName(): string {
    return faker.person.firstName();
  }

  static getLastName(): string {
    return faker.person.lastName();
  }

  static getFullName(): string {
    return faker.person.fullName();
  }

  static getEmail(): string {
    return faker.internet.email();
  }

  static getPhoneNumber(): string {
    return faker.phone.number();
  }

  static getUsername(): string {
    return faker.internet.username();
  }

  static getPassword(length: number = 10): string {
    return faker.internet.password({ length });
  }

  static getCountry(): string {
    return faker.location.country();
  }

  static getState(): string {
    return faker.location.state();
  }

  static getCity(): string {
    return faker.location.city();
  }

  static getStreet(): string {
    return faker.location.street();
  }

  static getStreetAddress(): string {
    return faker.location.streetAddress();
  }

  static getZipCode(): string {
    return faker.location.zipCode();
  }

  static getLatitude(): string {
    return faker.location.latitude().toString();
  }

  static getLongitude(): string {
    return faker.location.longitude().toString();
  }

  static getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  static getRecentDate(days: number = 10): string {
    return faker.date.recent({ days }).toISOString().split('T')[0];
  }

  static getFutureDate(years: number = 1): string {
    return faker.date.future({ years }).toISOString().split('T')[0];
  }

  static getPastDate(years: number = 1): string {
    return faker.date.past({ years }).toISOString().split('T')[0];
  }

  static getProductName(): string {
    return faker.commerce.productName();
  }

  static getProductDescription(): string {
    return faker.commerce.productDescription();
  }

  static getProductPrice(): string {
    return faker.commerce.price({ min: 1, max: 500, dec: 2 });
  }

  static getDepartment(): string {
    return faker.commerce.department();
  }

  static getImageUrl(): string {
    return faker.image.url();
  }

  static getNumber(): number {
    return faker.number.int({ min: 1, max: 999 });
  }

  static generateInvalidLoginPayload() {
    return {
      username: RandomDataUtil.getUsername(),
      password: RandomDataUtil.getPassword(),
    };
  }

  static generateProductPayload() {
    return {
      title: RandomDataUtil.getProductName(),
      price: Number(RandomDataUtil.getProductPrice()),
      description: RandomDataUtil.getProductDescription(),
      image: RandomDataUtil.getImageUrl(),
      category: RandomDataUtil.getDepartment().toLowerCase(),
    };
  }

  static generateUpdatedProductPayload() {
    const product = RandomDataUtil.generateProductPayload();
    return {
      ...product,
      title: `Updated ${product.title}`,
    };
  }

  static generateUserPayload() {
    return {
      email: RandomDataUtil.getEmail(),
      username: RandomDataUtil.getUsername(),
      password: RandomDataUtil.getPassword(),
      name: {
        firstname: RandomDataUtil.getFirstName(),
        lastname: RandomDataUtil.getLastName(),
      },
      address: {
        city: RandomDataUtil.getCity(),
        street: RandomDataUtil.getStreet(),
        number: RandomDataUtil.getNumber(),
        zipcode: RandomDataUtil.getZipCode(),
        geolocation: {
          lat: RandomDataUtil.getLatitude(),
          long: RandomDataUtil.getLongitude(),
        },
      },
      phone: RandomDataUtil.getPhoneNumber(),
    };
  }

  static generateUserUpdatePayload() {
    const user = RandomDataUtil.generateUserPayload();
    return {
      ...user,
      username: `updated-${user.username}`,
    };
  }

  static generateCartPayload(userId: number) {
    return {
      userId,
      date: RandomDataUtil.getCurrentDate(),
      products: [
        {
          productId: RandomDataUtil.getNumber(),
          quantity: RandomDataUtil.getNumber(),
        },
      ],
    };
  }

  static generateUpdatedCartPayload(userId: number) {
    return RandomDataUtil.generateCartPayload(userId);
  }
}
