import { apiCall } from './axios';
import axiosInstance from './axios';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    last_login: string | null;
  };
  roles: string[];
  permissions: string[];
}

class AuthApi {
  /**
   * Login with email and password.
   * Calls the backend /api/v1/login endpoint, stores the JWT token,
   * and returns the user data.
   */
  async loginWithPassword(
    email: string,
    password: string
  ): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>('/api/v1/login', { email, password });
    const data = response.data;

    // Store the token in localStorage for subsequent requests
    if (data.token) {
      localStorage.setItem('_token', data.token);
      localStorage.setItem(
        '_token_expires_at',
        String(Math.floor(Date.now() / 1000) + 86400)
      );
    }

    return data;
  }

  /**
   * Get current user info from the backend /api/v1/auth/me endpoint.
   */
  async getCurrentUser() {
    try {
      const token = localStorage.getItem('_token');
      if (!token) return null;

      const response = await axiosInstance.get('/api/v1/auth/me');
      return response.data;
    } catch (error: any) {
      // Return null for any auth/network failure — let the user log in again
      if (
        error?.response?.status === 401 ||
        error?.response?.status === 403 ||
        error?.code === 'ERR_FAILED' ||
        error?.code === 'ERR_NETWORK' ||
        !error?.response
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * SSO login (legacy - redirects to OIDC provider).
   */
  async loginSSO() {
    window.location.href = '/api/v1/auth/sso';
  }

  /**
   * Facebook OAuth login - sends the access_token to backend.
   */
  async loginWithFacebook(access_token: string): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>('/api/v1/auth/facebook', { access_token });
    const data = response.data;
    if (data.token) {
      localStorage.setItem('_token', data.token);
      localStorage.setItem(
        '_token_expires_at',
        String(Math.floor(Date.now() / 1000) + 86400)
      );
    }
    return data;
  }

  /**
   * Logout - clear tokens.
   */
  async logout() {
    localStorage.removeItem('_token');
    localStorage.removeItem('_token_expires_at');
  }
}

export const authApi = new AuthApi();
export { apiCall };