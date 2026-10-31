import { api, qs } from './api.js';

export const invoiceService = {
  list: (params) => api(`/invoices${qs(params)}`),
  get: (id) => api(`/invoices/${id}`),
  confirm: (id) => api(`/invoices/${id}/confirm`, { method: 'POST' }),
  cancel: (id) => api(`/invoices/${id}/cancel`, { method: 'POST' }),
  send: (id) => api(`/invoices/${id}/send`, { method: 'POST' }),
  runBilling: () => api('/invoices/run-billing', { method: 'POST' }),
  confirmDrafts: () => api('/invoices/confirm-drafts', { method: 'POST' }),
};

export const reportService = {
  summary: (params) => api(`/reports/summary${qs(params)}`),
};
