// Small fetch wrapper. Sends the auth cookie and throws an Error with the server's message.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// { page: 2, q: '' } → "?page=2" (empty values are left out)
export function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

// Standard list / get / create / update / remove calls for one API resource.
export function resource(base) {
  return {
    list: (params) => api(`${base}${qs(params)}`),
    get: (id) => api(`${base}/${id}`),
    create: (body) => api(base, { method: 'POST', body }),
    update: (id, body) => api(`${base}/${id}`, { method: 'PUT', body }),
    remove: (id) => api(`${base}/${id}`, { method: 'DELETE' }),
  };
}
