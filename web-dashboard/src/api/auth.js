function unwrapDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((x) => JSON.stringify(x)).join("; ");
  return JSON.stringify(detail);
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function fetchAuth(path, init = {}) {
  const response = await fetch(API_BASE ? `${API_BASE}${path}` : `/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      if (payload?.detail !== undefined) message = unwrapDetail(payload.detail);
      else message = JSON.stringify(payload);
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function loginAuth(email, password) {
  return fetchAuth("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, session_mode: "cookie" }),
  });
}

export async function registerAuth(email, password, nombre) {
  return fetchAuth("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, nombre, session_mode: "cookie" }),
  });
}

export async function refreshAuth() {
  return fetchAuth("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ session_mode: "cookie" }),
  });
}

export async function getCurrentUser(accessToken) {
  return fetchAuth("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function logoutAuth(accessToken = null) {
  return fetchAuth("/auth/logout", {
    method: "POST",
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
    body: JSON.stringify({ session_mode: "cookie" }),
  });
}
