import { tokenStorage } from '../api';
import type { AuthUser, LoginCredentials, LoginResponse } from '../types';
import { httpService } from './http.service';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const response = await httpService.post<LoginResponse, LoginCredentials>('/auth/login', credentials);
    tokenStorage.set(response.access_token);

    try {
      return await this.getCurrentUser();
    } catch (error) {
      tokenStorage.remove();
      throw error;
    }
  },

  getCurrentUser(): Promise<AuthUser> {
    return httpService.get<AuthUser>('/auth/me');
  },

  logout(): void {
    tokenStorage.remove();
  },
};
