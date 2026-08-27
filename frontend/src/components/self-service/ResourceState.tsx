import type { ReactNode } from 'react';

type Props = {
  loading: boolean;
  error: Error | null;
  forbidden: boolean;
  empty?: boolean;
  emptyMessage?: string;
  onRetry: () => void;
  children: ReactNode;
};

export function ResourceState({ loading, error, forbidden, empty, emptyMessage, onRetry, children }: Props) {
  if (loading) return <section className="student-state" aria-live="polite"><span className="student-spinner" aria-hidden="true" /><p>Carregando suas informações...</p></section>;
  if (forbidden) return <section className="student-state student-state-error" role="alert"><strong>Acesso indisponível</strong><p>Sua situação atual não permite acessar estas informações. Entre em contato com a academia.</p></section>;
  if (error) return <section className="student-state student-state-error" role="alert"><strong>Não foi possível carregar</strong><p>{error.message}</p><button type="button" onClick={onRetry}>Tentar novamente</button></section>;
  if (empty) return <section className="student-state"><p>{emptyMessage ?? 'Nenhuma informação encontrada.'}</p></section>;
  return children;
}
