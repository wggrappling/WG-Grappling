import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../api/errors';
import { selfService } from '../../services';
import { StudentHomeDashboard } from './StudentHomeDashboard';

vi.mock('../../services', () => ({ selfService: { notices: vi.fn(), graduations: vi.fn(), modalities: vi.fn(), finance: vi.fn(), documents: vi.fn() } }));
const mocked = vi.mocked(selfService);

const defaults = () => {
  mocked.notices.mockResolvedValue([{ id: 1, title: 'A', content: 'A', publishedAt: '2026-08-28', isRead: false }, { id: 2, title: 'B', content: 'B', publishedAt: '2026-08-27', isRead: false }]);
  mocked.graduations.mockResolvedValue({ current: [{ id: 1, modality: { id: 2, name: 'Jiu-Jitsu' }, graduationLevel: { code: 'BLUE', name: 'Faixa azul' }, belt: 'BLUE', degree: 0, beltStartedAt: '2026-01-01', graduatedAt: '2026-01-01', status: 'ACTIVE', correctedAt: null, cancelledAt: null }], history: [] });
  mocked.modalities.mockResolvedValue({ current: [{ id: 1, modality: { id: 2, name: 'Jiu-Jitsu', description: 'Arte suave', hasGraduation: true }, status: 'ACTIVE', startedAt: '2026-01-01', pausedAt: null, resumedAt: null, finishedAt: null }], history: [] });
  mocked.finance.mockResolvedValue({ plans: { current: [], history: [] }, charges: [], payments: [], situation: { openChargeCount: 1, openBalance: 150, overdueChargeCount: 0, overdueBalance: 0, nextCharge: null } });
  mocked.documents.mockResolvedValue([{ id: 1, name: 'contrato.pdf', type: 'CONTRACT', status: 'ACTIVE', createdAt: '2026-01-01', size: 20, available: true }]);
};

describe('StudentHomeDashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); defaults(); });

  it('composes approved summaries and secondary shortcuts without invented data', async () => {
    render(<MemoryRouter><StudentHomeDashboard /></MemoryRouter>);
    expect(await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent === '2 avisos não lidos')).toBeInTheDocument();
    expect(screen.getByText('Faixa azul')).toBeInTheDocument();
    expect(screen.getAllByText('Jiu-Jitsu').length).toBeGreaterThan(0);
    expect(screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent?.replace(/\s/g, ' ') === 'Saldo R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === '1 documento disponível')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Loja/ })).toHaveAttribute('href', '/app/shop');
    expect(screen.getByRole('link', { name: /Perfil/ })).toHaveAttribute('href', '/app/profile');
    expect(screen.queryByText(/estoque|gateway|cpf|endereço/i)).not.toBeInTheDocument();
  });

  it('isolates one card failure while keeping the other cards useful', async () => {
    mocked.finance.mockRejectedValue(new ApiClientError({ status: 500, message: 'Falha' }));
    render(<MemoryRouter><StudentHomeDashboard /></MemoryRouter>);
    expect(await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent === '2 avisos não lidos')).toBeInTheDocument();
    expect(screen.getByText(/Não foi possível carregar/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver documentos' })).toBeInTheDocument();
  });

  it('renders forbidden independently and preserves consultation shortcuts', async () => {
    mocked.notices.mockRejectedValue(new ApiClientError({ status: 403, message: 'Negado' }));
    render(<MemoryRouter><StudentHomeDashboard /></MemoryRouter>);
    expect(await screen.findByText('Informação indisponível.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver avisos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Loja/ })).toBeInTheDocument();
  });
});
