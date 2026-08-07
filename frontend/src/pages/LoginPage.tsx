import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../api';
import { useAuth } from '../hooks';

type LoginLocationState = {
  from?: { pathname?: string };
};

export function LoginPage() {
  const { authenticated, initializing, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!initializing && authenticated) {
    return <Navigate to="/students/7" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await login({ email, password });
      const state = location.state as LoginLocationState | null;
      navigate(state?.from?.pathname || '/students/7', { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível entrar. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="WG Grappling">
        <div className="login-brand-mark">WG</div>
        <div>
          <p className="login-brand-eyebrow">Gestão integrada</p>
          <h1>WG Grappling</h1>
          <p>Centralize a jornada dos seus alunos dentro e fora do tatame.</p>
        </div>
        <div className="login-brand-detail">
          <span>Disciplina</span>
          <span>Evolução</span>
          <span>Comunidade</span>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-heading">
            <p className="section-eyebrow">Área administrativa</p>
            <h2>Bem-vindo de volta</h2>
            <p>Entre com suas credenciais para acessar a Central do Aluno.</p>
          </div>

          {errorMessage && (
            <div className="login-error" role="alert">{errorMessage}</div>
          )}

          <label className="login-field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              value={email}
              autoComplete="email"
              placeholder="seu@email.com"
              required
              disabled={submitting}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="login-field">
            <span>Senha</span>
            <input
              type="password"
              name="password"
              value={password}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              required
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button className="login-submit" type="submit" disabled={submitting || initializing}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="login-help">Acesso exclusivo para a equipe WG Grappling.</p>
        </form>
      </section>
    </main>
  );
}
