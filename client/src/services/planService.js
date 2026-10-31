import { api, qs, resource } from './api.js';

export const planService = resource('/catalog/plans');
export const templateService = resource('/catalog/templates');
export const quotationService = {
  list: (params) => api(`/quotations${qs(params)}`),
};
