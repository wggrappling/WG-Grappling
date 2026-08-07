import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '../api';

export const httpService = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  async post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> {
    const response = await apiClient.post<TResponse>(url, body, config);
    return response.data;
  },

  async patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig<TBody>,
  ): Promise<TResponse> {
    const response = await apiClient.patch<TResponse>(url, body, config);
    return response.data;
  },

  async remove<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};
