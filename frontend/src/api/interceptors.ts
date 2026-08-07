import axios, { type AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorPayload } from '../types';
import { ApiClientError } from './errors';
import { tokenStorage } from './tokenStorage';

export const unauthorizedEventName = 'wg-grappling:unauthorized';

const fallbackMessages: Record<number, string> = {
  401: 'Sua sessão expirou. Faça login novamente.',
  403: 'Você não possui permissão para realizar esta ação.',
  500: 'O servidor encontrou um erro. Tente novamente mais tarde.',
};

const readErrorMessage = (error: AxiosError<ApiErrorPayload>): string => {
  const responseMessage = error.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage.join(' ');
  }

  if (responseMessage) {
    return responseMessage;
  }

  const status = error.response?.status;
  return (status && fallbackMessages[status]) || error.message || 'Não foi possível concluir a solicitação.';
};

export function configureInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const token = tokenStorage.get();

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (!axios.isAxiosError<ApiErrorPayload>(error)) {
        return Promise.reject(error);
      }

      const status = error.response?.status ?? null;

      if (status === 401) {
        tokenStorage.remove();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(unauthorizedEventName));
        }
      }

      return Promise.reject(new ApiClientError({
        status,
        message: readErrorMessage(error),
        data: error.response?.data,
      }));
    },
  );
}
