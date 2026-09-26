const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status})`);
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  return data;
}

export const api = {
  // Refund requests
  getRefundRequests: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return request(`/refund-requests${q ? '?' + q : ''}`);
  },
  getRefundRequest: (id) => request(`/refund-requests/${id}`),
  getRefundRequestAudit: (id) => request(`/refund-requests/${id}/audit`),
  submitRefundRequest: (body) => request('/refund-requests', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateRefundRequest: (id, body) => request(`/refund-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  getStats: () => request('/refund-requests/stats'),

  // Customers
  getCustomers: () => request('/customers'),
  getCustomer: (id) => request(`/customers/${id}`),

  // Health
  health: () => request('/health')
};
