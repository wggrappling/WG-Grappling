const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiConfig = {
  baseURL: configuredBaseUrl || '/api',
  timeout: 15_000,
} as const;
