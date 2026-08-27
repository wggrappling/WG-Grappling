import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import { ProtectedRoute } from './ProtectedRoute';

const auth = (role: UserRole): AuthContextValue => ({
  user: { id: 1, name: 'Usuário', email: 'user@example.com', role, active: true },
  authenticated: true,
  initializing: false,
  login: vi.fn(),
  logout: vi.fn(),
});

function renderAccess(role: UserRole, allowedRoles?: readonly UserRole[]) {
  return render(
    <AuthContext.Provider value={auth(role)}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute allowedRoles={allowedRoles}><p>Conteúdo protegido</p></ProtectedRoute>} />
          <Route path="/app" element={<p>Área do aluno</p>} />
          <Route path="/students" element={<p>Área interna</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute role isolation', () => {
  it('redirects ALUNO away from legacy authenticated-only internal routes', () => {
    renderAccess('ALUNO');
    expect(screen.getByText('Área do aluno')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  it('allows ALUNO only on an explicit ALUNO route', () => {
    renderAccess('ALUNO', ['ALUNO']);
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('redirects an internal role away from an ALUNO route', () => {
    renderAccess('ADMIN', ['ALUNO']);
    expect(screen.getByText('Área interna')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });
});
