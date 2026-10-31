import { resource } from './api.js';

export const productService = resource('/catalog/products');
export const taxService = resource('/catalog/taxes');
export const discountService = resource('/discounts');
