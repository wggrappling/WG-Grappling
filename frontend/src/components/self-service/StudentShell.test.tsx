import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../contexts/AuthContext';
import { StudentShell } from './StudentShell';

const value = (logout = vi.fn()): AuthContextValue => ({
  user: { id: 1, name: 'Ana', email: 'ana@example.com', role: 'ALUNO', active: true },
  authenticated: true,
  initializing: false,
  login: vi.fn(),
  logout,
});

describe('StudentShell', () => {
  it('offers the approved navigation and keeps Shop as a secondary destination', () => {
    render(<AuthContext.Provider value={value()}><MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<StudentShell />}><Route index element={<p>Conteúdo</p>} /></Route></Routes></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByRole('navigation', { name: 'Navegação principal do aluno' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Loja Em breve/ })).toHaveAttribute('href', '/app/shop');
    expect(screen.getAllByRole('link')).toHaveLength(7);
  });

  it('logs out and returns to login', async () => {
    const logout = vi.fn();
    const user = userEvent.setup();
    render(<AuthContext.Provider value={value(logout)}><MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<StudentShell />}><Route index element={<p>Conteúdo</p>} /></Route><Route path="/login" element={<p>Login</p>} /></Routes></MemoryRouter></AuthContext.Provider>);
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
