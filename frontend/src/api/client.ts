import axios from 'axios';
import { apiConfig } from './config';
import { configureInterceptors } from './interceptors';

export const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

configureInterceptors(apiClient);
