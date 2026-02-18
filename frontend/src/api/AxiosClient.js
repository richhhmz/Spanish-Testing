// frontend/src/api/AxiosClient.js
import axios from 'axios';
import { isDebug } from '../globals.js';
// import { BackLog } from '../utils/BackLog'; // ONLY if you really use it

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AxiosClient = axios.create({
  baseURL: API_BASE_URL,
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
