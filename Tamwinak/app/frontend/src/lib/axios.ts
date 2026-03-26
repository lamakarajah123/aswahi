/**
 * Central Axios HTTP client for all Aswahi API calls.
 * Automatically injects the JWT Bearer token from localStorage on every request.
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001';

const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — inject Bearer token
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('_token');
    if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
});

// Response interceptor — on 401 clear token so AuthContext logs user out
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            localStorage.removeItem('_token');
            localStorage.removeItem('_token_expires_at');
            window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);

/** Thin wrapper that mirrors the shape pages expect: { data, status } */
export const apiCall = {
    async invoke<T = any>({
        url,
        method = 'GET',
        data,
        params,
        headers,
        signal,
    }: {
        url: string;
        method?: string;
        data?: any;
        params?: any;
        headers?: Record<string, string>;
        signal?: AbortSignal;
    }): Promise<AxiosResponse<T>> {
        const config: AxiosRequestConfig = {
            url,
            method: method.toLowerCase() as any,
            data,
            params,
            headers,
            signal,
        };
        return axiosInstance.request<T>(config);
    },
};

export default axiosInstance;
