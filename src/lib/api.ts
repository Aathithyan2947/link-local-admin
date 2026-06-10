import axios from 'axios';

export const TOKEN_KEY = 'll_admin_token';
export const REFRESH_KEY = 'll_admin_refresh';
export const ADMIN_KEY = 'll_admin_user';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function clearSessionAndRedirect() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ADMIN_KEY);
  if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
}

// Shared in-flight refresh so parallel 401s only trigger one /auth/refresh.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  refreshPromise ??= axios
    .post('/api/v1/auth/refresh', { refreshToken })
    .then((res) => {
      const newToken = (res.data as { data?: { accessToken?: string } })?.data?.accessToken ?? null;
      if (newToken) localStorage.setItem(TOKEN_KEY, newToken);
      return newToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    // On 401, try a one-time silent refresh + retry before forcing re-login.
    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  },
);

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

/** Extracts a human message from an axios error. */
export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message;
  }
  return 'Unexpected error';
}
