import { api, qs } from './api.js';

export const paymentService = {
  list: (params) => api(`/payments${qs(params)}`),
  create: (body) => api('/payments', { method: 'POST', body }),
  remove: (id) => api(`/payments/${id}`, { method: 'DELETE' }),
};
