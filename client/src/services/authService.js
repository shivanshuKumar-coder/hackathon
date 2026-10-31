import { api } from './api.js';

export const authService = {
  me: () => api('/auth/me'),
  config: () => api('/auth/config'),
  google: (credential) => api('/auth/google', { method: 'POST', body: { credential } }),
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  signup: (name, email, password) => api('/auth/signup', { method: 'POST', body: { name, email, password } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => api('/auth/reset-password', { method: 'POST', body: { token, password } }),
  changePassword: (currentPassword, newPassword) =>
    api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
};
