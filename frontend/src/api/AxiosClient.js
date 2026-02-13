import axios from 'axios';
import { isDebug } from '../globals.js';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AxiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/* ───────────────── REFRESH STATE ───────────────── */

let isRefreshing = false;
let refreshQueue = [];

const resolveQueue = (error, token = null) => {
  refreshQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  refreshQueue = [];
};

/* ───────────────── REQUEST ───────────────── */

AxiosClient.interceptors.request.use((config) => {

  // 🚫 Never attach token to auth endpoints
  if (config.url === '/auth/login' || config.url === '/auth/refresh') {
    return config;
  }

  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ───────────────── RESPONSE ───────────────── */

AxiosClient.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    /* ---------------------------------------------------------
       🔴 HARD FAIL: refresh endpoint must NEVER retry or queue
       --------------------------------------------------------- */
    if (err.response?.status === 401 && original?.url === '/auth/refresh') {
      if (isDebug)
        BackLog.warn('⛔ Refresh token invalid — logging out');

      localStorage.removeItem('authToken');
      isRefreshing = false;
      refreshQueue = [];

      window.location.replace('/login?reason=session-expired');

      // HARD STOP — prevent hanging promises
      return new Promise(() => {});
    }

    /* ---------------------------------------------------------
       🔁 Normal access-token refresh flow
       --------------------------------------------------------- */
    if (
      err.response?.status === 401 &&
      !original._retry &&
      original.url !== '/auth/refresh'
    ) {
      original._retry = true;

      // ⏳ Another refresh already in progress → queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return AxiosClient(original);
        });
      }

      isRefreshing = true;

      if (isDebug)
        console.warn('🔄 JWT expired — attempting refresh');

      try {
        const refresh = await AxiosClient.post('/auth/refresh');
        const newToken = refresh.data.accessToken;

        localStorage.setItem('authToken', newToken);
        resolveQueue(null, newToken);

        original.headers.Authorization = `Bearer ${newToken}`;
        return AxiosClient(original);

      } catch (refreshErr) {
        if (isDebug)
          console.warn('⛔ Refresh failed — session expired');

        // 🔴 RELEASE ALL WAITING REQUESTS
        resolveQueue(refreshErr);

        localStorage.removeItem('authToken');
        isRefreshing = false;

        window.location.replace('/login?reason=session-expired');

        // 🔴 HARD STOP
        return new Promise(() => {});
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default AxiosClient;
