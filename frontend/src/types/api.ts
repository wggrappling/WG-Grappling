export type ApiListResponse<T> = {
  module?: string;
  total: number;
  data: T[];
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

export type ApiDataResponse<T> = {
  message?: string;
  data: T;
};

export type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export type HttpErrorDetails = {
  status: number | null;
  message: string;
  data?: ApiErrorPayload;
};
