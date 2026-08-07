const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiConfig = {
  baseURL: configuredBaseUrl || 'http://localhost:3000',
  timeout: 15_000,
} as const;
