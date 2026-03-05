// frontend/src/api/AxiosClient.js
import axios from 'axios';
import { isDebug, isProd } from '../globals.js';
import { BackLog } from '../utils/BackLog.js';

const AxiosClient = axios.create({
  baseURL: isProd
    ? 'https://progspanlrn.com'
    : 'http://localhost:8080',
  withCredentials: true,
});

/* ───────────────── REFRESH STATE ───────────────── */

let isRefreshing = false;
let refreshQueue = [];

const resolveQueue = (error = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  refreshQueue = [];
};

/* ───────────────── REQUEST ───────────────── */

// ✅ No Authorization header at all (cookie auth only)
AxiosClient.interceptors.request.use((config) => config);

/* ───────────────── RESPONSE ───────────────── */

AxiosClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // If we don't have a config, just reject
    if (!original) return Promise.reject(err);

    // Don't loop forever
    if (original._retry) return Promise.reject(err);

    // ✅ Special-case: while on /magic, do NOT refresh or redirect on 401.
    // Reason: during magic-link redeem, you are expected to be unauthenticated briefly.
    // A background 401 (e.g. BackLog) would otherwise redirect and abort /magic/redeem.
    if (err.response?.status === 401 && window.location.pathname === '/magic') {
      if (isDebug) console.warn('[AxiosClient] 401 on /magic — skipping refresh/redirect for:', original.url);
      return Promise.reject(err);
    }

    // Never retry refresh itself
    if (original.url === '/auth/refresh') {
      if (isDebug) console.warn('⛔ Refresh failed — redirecting to /login');
      window.location.replace('/login?reason=session-expired');
      return new Promise(() => {}); // hard stop
    }

    // On 401, try refresh ONCE, then retry original
    if (err.response?.status === 401) {
      original._retry = true;

      // If a refresh is already happening, wait for it
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => AxiosClient(original));
      }

      isRefreshing = true;

      try {
        await AxiosClient.post('/auth/refresh'); // ✅ refresh via cookies
        resolveQueue(null);
        return AxiosClient(original);
      } catch (refreshErr) {
        resolveQueue(refreshErr);
        window.location.replace('/login?reason=session-expired');
        return new Promise(() => {}); // hard stop
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default AxiosClient;
