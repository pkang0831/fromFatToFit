import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '@/lib/supabase';
import { setAuthCookie } from '@/lib/utils/cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use(
  async (config) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) { /* noop */ }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !data.session) {
          processQueue(refreshError, null);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('session-expired'));
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
          return Promise.reject(error);
        }

        const newToken = data.session.access_token;
        const newRefresh = data.session.refresh_token;

        localStorage.setItem('access_token', newToken);
        localStorage.setItem('refresh_token', newRefresh);
        setAuthCookie('access_token', newToken);
        setAuthCookie('refresh_token', newRefresh);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('session-expired'));
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
