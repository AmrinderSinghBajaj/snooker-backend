import api from './client';

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const assetsApi = {
  list: () => api.get('/assets'),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  archive: (id) => api.delete(`/assets/${id}`),
  activeSessions: () => api.get('/assets/active-sessions'),
  startGame: (assetId, playerNames, startTimeIso) =>
    api.post(`/assets/${assetId}/start`, { player_names: playerNames, start_time: startTimeIso }),
  pauseGame: (assetId) => api.post(`/assets/${assetId}/pause`),
  resumeGame: (assetId) => api.post(`/assets/${assetId}/resume`),
  cancelGame: (assetId) => api.post(`/assets/${assetId}/cancel`),
  updatePlayers: (sessionId, playerNames) =>
    api.put(`/assets/active-sessions/${sessionId}/players`, { player_names: playerNames }),
};

export const billingApi = {
  stop: (sessionId) => api.post(`/billing/${sessionId}/stop`),
  cancelStop: (sessionId) => api.post(`/billing/${sessionId}/cancel-stop`),
  split: (sessionId, payerCustomerIds, payerNames) => api.post(`/billing/${sessionId}/split`, { payer_customer_ids: payerCustomerIds, payer_names: payerNames }),
  done: (sessionId, playersOrPayerNames) => {
    if (Array.isArray(playersOrPayerNames) && playersOrPayerNames.length > 0 && typeof playersOrPayerNames[0] === 'object') {
      return api.post(`/billing/${sessionId}/done`, { players: playersOrPayerNames });
    }
    return api.post(`/billing/${sessionId}/done`, { payer_names: playersOrPayerNames });
  },
  records: () => api.get('/billing/records'),
  markPaid: (sessionId, paymentMethodOrPayload) => {
    const payload = typeof paymentMethodOrPayload === 'string'
      ? { payment_method: paymentMethodOrPayload }
      : paymentMethodOrPayload;
    return api.post(`/billing/${sessionId}/paid`, payload);
  },
  markUnpaid: (sessionId, paidAmount, pendingAmount) =>
    api.post(`/billing/${sessionId}/unpaid`, { paid_amount: paidAmount, pending_amount: pendingAmount }),
  detail: (sessionId) => api.get(`/billing/${sessionId}/detail`),
  edit: (sessionId, payload) => api.put(`/billing/${sessionId}/edit`, payload),
  createManualEntry: (payload) => api.post('/billing/manual-entry', payload),
  remove: (sessionId) => api.delete(`/billing/${sessionId}`),
  settleOutstanding: (payload) => api.post('/billing/outstanding/settle', payload),
  listDeleted: () => api.get('/billing/deleted'),
  restore: (sessionId) => api.post(`/billing/${sessionId}/restore`),
};

export const foodApi = {
  list: () => api.get('/food/items'),
  create: (data) => api.post('/food/items', data),
  update: (id, data) => api.put(`/food/items/${id}`, data),
  archive: (id) => api.delete(`/food/items/${id}`),
  assign: (sessionId, lines, orderedBy) => api.post('/food/assign', { session_id: sessionId, lines, ordered_by: orderedBy }),
};

export const revenueApi = {
  today: () => api.get('/revenue/today'),
  weekly: () => api.get('/revenue/weekly'),
  monthly: () => api.get('/revenue/monthly'),
  drilldownDay: (targetDate) => api.get('/revenue/drilldown/day', { params: { target_date: targetDate } }),
  drilldownWeek: (weekEnd) => api.get('/revenue/drilldown/week', { params: { week_end: weekEnd } }),
  drilldownMonth: (year, month) => api.get('/revenue/drilldown/month', { params: { year, month } }),
  searchDate: (targetDate) => api.get('/revenue/search/date', { params: { target_date: targetDate } }),
  searchRange: (startDate, endDate) => api.get('/revenue/search/range', { params: { start_date: startDate, end_date: endDate } }),
  passwordStatus: () => api.get('/revenue/password-status'),
  setPassword: (password) => api.post('/revenue/password/set', { password }),
  verifyPassword: (password) => api.post('/revenue/password/verify', { password }),
  changePassword: (currentPassword, newPassword) => api.post('/revenue/password/change', { current_password: currentPassword, new_password: newPassword }),
  resetPassword: (loginPassword, newPassword) => api.post('/revenue/password/reset', { login_password: loginPassword, new_password: newPassword }),
};

export const customersApi = {
  list: () => api.get('/customers'),
  create: (data) => api.post('/customers/create', data),
  remove: (id) => api.delete(`/customers/${id}`),
  walletSummary: () => api.get('/customers/wallet/summary'),
  addWalletMoney: (id, amount, paymentMethod, note) =>
    api.post(`/customers/${id}/wallet/add`, { amount, payment_method: paymentMethod, note }),
  walletHistory: (id) => api.get(`/customers/${id}/wallet/history`),
  updatePhone: (id, phone) => api.post(`/customers/${id}/phone`, { phone }),
};

export const brandingApi = {
  updateSettings: (data) => api.put('/branding/settings', data),
};

export const staffApi = {
  list: () => api.get('/staff'),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  remove: (id) => api.delete(`/staff/${id}`),
};

export const membershipsApi = {
  slabs: () => api.get('/memberships/slabs'),
  createSlab: (data) => api.post('/memberships/slabs', data),
  updateSlab: (id, data) => api.put(`/memberships/slabs/${id}`, data),
  deleteSlab: (id) => api.delete(`/memberships/slabs/${id}`),
  assign: (customerId, membershipSlabId) => api.post('/memberships/assign', { customerId, membershipSlabId }),
};

export const expensesApi = {
  list: (params) => api.get('/expenses', { params }),
  summary: () => api.get('/expenses/summary'),
  create: (data) => api.post('/expenses', data),
  remove: (id) => api.delete(`/expenses/${id}`),
};

