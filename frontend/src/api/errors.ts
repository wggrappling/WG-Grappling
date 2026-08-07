import type { HttpErrorDetails } from '../types';

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly data?: HttpErrorDetails['data'];

  constructor({ status, message, data }: HttpErrorDetails) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}
