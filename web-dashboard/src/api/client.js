let getAccessToken = () => null;
let refreshAccessToken = async () => null;

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const toAbsolute = (path) => API_BASE ? path.replace(/^\/api/, API_BASE) : path;

export function configureApiAuth({ accessTokenGetter, refreshTokenFn }) {
  getAccessToken =
    typeof accessTokenGetter === "function" ? accessTokenGetter : () => null;
  refreshAccessToken =
    typeof refreshTokenFn === "function" ? refreshTokenFn : async () => null;
}

export async function apiFetch(path, init = {}, retryOnAuthError = true) {
  const headers = new Headers(init.headers || {});
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(toAbsolute(path), {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status !== 401 || !retryOnAuthError) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set("Authorization", `Bearer ${refreshed}`);

  return fetch(toAbsolute(path), {
    ...init,
    credentials: "include",
    headers: retryHeaders,
  });
}
