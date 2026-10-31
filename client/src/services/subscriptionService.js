import { api, qs, resource } from './api.js';

export const subscriptionService = {
  ...resource('/subscriptions'),
  action: (id, action) => api(`/subscriptions/${id}/actions`, { method: 'POST', body: { action } }),
  invoiceNow: (id) => api(`/subscriptions/${id}/invoice`, { method: 'POST' }),
};

export const customerService = {
  list: (params) => api(`/customers${qs(params)}`),
  get: (id) => api(`/customers/${id}`),
  create: (body) => api('/customers', { method: 'POST', body }),
};

export const userService = {
  list: (params) => api(`/users${qs(params)}`),
  createStaff: (body) => api('/users/staff', { method: 'POST', body }),
  setActive: (id, isActive) => api(`/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
};

// Customer portal: the logged-in customer's own data.
export const portalService = {
  summary: () => api('/portal/summary'),
  subscriptions: () => api('/portal/subscriptions'),
  getSubscription: (id) => api(`/portal/subscriptions/${id}`),
  action: (id, action) => api(`/portal/subscriptions/${id}/actions`, { method: 'POST', body: { action } }),
  invoices: (params) => api(`/portal/invoices${qs(params)}`),
  getInvoice: (id) => api(`/portal/invoices/${id}`),
};
