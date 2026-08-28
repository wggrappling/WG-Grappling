import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import './student-self-service.css';

const navigation = [
  { to: '/app', label: 'Início', icon: '⌂', end: true },
  { to: '/app/graduation', label: 'Graduação', icon: '◆' },
  { to: '/app/finance', label: 'Financeiro', icon: '$' },
  { to: '/app/shop', label: 'Loja', icon: '▣' },
  { to: '/app/notices', label: 'Avisos', icon: '●' },
  { to: '/app/profile', label: 'Perfil', icon: '○' },
] as const;

export function StudentShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="student-app">
      <header className="student-header">
        <NavLink to="/app" className="student-brand" aria-label="WG Grappling — Início">
          <img src="/assets/branding/kabuto-logo.png" alt="" />
          <span><strong>WG Grappling</strong><small>Área do aluno</small></span>
        </NavLink>
        <div className="student-header-actions">
          <button type="button" className="student-logout" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
            Sair
          </button>
        </div>
      </header>

      <div className="student-welcome" aria-label="Sessão atual">
        <span>Olá,</span> <strong>{user?.name}</strong>
      </div>

      <main className="student-content" id="student-content">
        <Outlet />
      </main>

      <nav className="student-navigation" aria-label="Navegação principal do aluno">
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false}>
            <span aria-hidden="true">{item.icon}</span>
            <small>{item.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
