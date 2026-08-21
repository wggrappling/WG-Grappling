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
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await login({ email, password });
      const state = location.state as LoginLocationState | null;
      navigate(state?.from?.pathname || '/dashboard', { replace: true });
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
        <img
          className="login-brand-mark"
          src="/assets/branding/wg-logo.png"
          alt="WG Grappling"
        />
        <img
          className="login-brand-mark-word"
          src="/assets/branding/wg-logo.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="login-grappling-silhouette"
          src="/assets/branding/wg-grappling-silhouette.png"
          alt=""
          aria-hidden="true"
        />
        <div className="login-brand-copy">
          <p>Centralize a jornada dos seus alunos<br />dentro e fora do tatame.</p>
        </div>
        <div className="login-brand-detail">
          <span>Disciplina</span>
          <i aria-hidden="true" />
          <span>Evolução</span>
          <i aria-hidden="true" />
          <span>Comunidade</span>
        </div>
        <div className="login-brand-modalities" aria-label="Modalidades">
          <span>
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M11 5 6 8l3 7 3-2v14h8V13l3 2 3-7-5-3-2 4h-6l-2-4Z" />
              <path d="M13 9h6M16 9v18" />
            </svg>
            Jiu Jitsu<br />Luta Livre
          </span>
          <span>
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M11 5c4-3 9-1 11 3 1 2 1 5 0 7l-4 5-2 6H8l1-7-2-4c-2-4 0-8 4-10Z" />
              <path d="M11 5c-1 4 1 7 5 8M9 20h9M9 23h8" />
            </svg>
            Muay Thai<br />Boxe
          </span>
          <span>
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M12 9c0-5 8-5 8 0h-3c0-2-2-2-2 0h-3Z" />
              <path d="M10 10h12l4 17H6l4-17Z" />
              <path d="M12 17h8" />
            </svg>
            Funcional<br />Condicionamento
          </span>
        </div>
        <p className="login-brand-footer">
          <span>WG Grappling Jiu Jitsu</span><i aria-hidden="true" /><strong>Body Thrower</strong>
        </p>
      </section>

      <section className="login-form-panel">
        <img
          className="login-kabuto-symbol"
          src="/assets/branding/kabuto-symbol-original-clean.png"
          alt=""
          aria-hidden="true"
        />
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

          <p className="login-help">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 3 27 7v8c0 7-4.5 11.5-11 14-6.5-2.5-11-7-11-14V7l11-4Z" />
              <rect x="11" y="14" width="10" height="8" rx="2" />
              <path d="M13 14v-2a3 3 0 0 1 6 0v2" />
            </svg>
            <span>Acesso exclusivo para a equipe<br />WG Grappling.</span>
          </p>
        </form>
        <img
          className="login-kabuto-logo"
          src="/assets/branding/kabuto-logo.png"
          alt="Kabuto"
        />
      </section>
    </main>
  );
}
