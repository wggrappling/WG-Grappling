import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { ApiClientError } from '../api/errors';

type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  forbidden: boolean;
};

export function useSelfServiceResource<T>(load: () => Promise<T>, dependencies: DependencyList = []) {
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    loading: true,
    error: null,
    forbidden: false,
  });

  const refresh = useCallback(async () => {
    setState({ data: null, loading: true, error: null, forbidden: false });
    try {
      const data = await load();
      setState({ data, loading: false, error: null, forbidden: false });
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error('Não foi possível carregar os dados.');
      setState({
        data: null,
        loading: false,
        error: normalized,
        forbidden: error instanceof ApiClientError && error.status === 403,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => { void refresh(); }, [refresh]);
  return { ...state, refresh };
}
