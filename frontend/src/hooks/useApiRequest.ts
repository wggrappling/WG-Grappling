import { useCallback, useState } from 'react';

type ApiRequestState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
};

const initialState = {
  data: null,
  error: null,
  loading: false,
};

export function useApiRequest<T, TArgs extends unknown[] = []>() {
  const [state, setState] = useState<ApiRequestState<T>>(initialState);

  const execute = useCallback(async (request: (...args: TArgs) => Promise<T>, ...args: TArgs) => {
    setState({ data: null, error: null, loading: true });

    try {
      const data = await request(...args);
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Erro inesperado.');
      setState({ data: null, error: normalizedError, loading: false });
      throw normalizedError;
    }
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, execute, reset };
}
