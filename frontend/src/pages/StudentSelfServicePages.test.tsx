import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../api/errors';
import { selfService } from '../services';
import {
  StudentAttendancePage,
  StudentFinancePage,
  StudentGraduationsPage,
  StudentHomePage,
  StudentProfilePage,
} from './StudentSelfServicePages';

vi.mock('../services', () => ({
  selfService: {
    me: vi.fn(),
    profile: vi.fn(),
    graduations: vi.fn(),
    modalities: vi.fn(),
    attendance: vi.fn(),
    finance: vi.fn(),
  },
}));

const mocked = vi.mocked(selfService);
const renderPage = (page: React.ReactNode) => render(<MemoryRouter>{page}</MemoryRouter>);

describe('student self-service pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads /me and renders ACTIVE student navigation without internal IDs', async () => {
    mocked.me.mockResolvedValue({
      account: { id: 8, name: 'Ana', email: 'ana@example.com', role: 'ALUNO', active: true },
      student: { id: 44, name: 'Ana', enrollmentNumber: 'WG-44', status: 'ACTIVE', joinedAt: '2026-01-01' },
      academicContext: { active: true },
    });
    renderPage(<StudentHomePage />);
    expect(screen.getByText('Carregando suas informações...')).toBeInTheDocument();
    expect(await screen.findByText('Matrícula WG-44')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Graduação/ })).toHaveAttribute('href', '/app/graduation');
    expect(screen.queryByText('44')).not.toBeInTheDocument();
    expect(mocked.me).toHaveBeenCalledTimes(1);
  });

  it('shows PAUSED as consultation-only without operation controls', async () => {
    mocked.profile.mockResolvedValue({
      name: 'Ana', email: 'ana@example.com', phone: null, maskedCpf: '***.982.247-**', address: null,
      enrollmentNumber: 'WG-44', studentStatus: 'PAUSED', joinedAt: '2026-01-01',
    });
    renderPage(<StudentProfilePage />);
    expect(await screen.findByText('Matrícula pausada')).toBeInTheDocument();
    expect(screen.getByText(/somente para consulta/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar|editar/i })).not.toBeInTheDocument();
  });

  it('shows masked CPF and only the authenticated student address', async () => {
    mocked.profile.mockResolvedValue({
      name: 'Ana', email: 'ana@example.com', phone: '11999999999', maskedCpf: '***.982.247-**',
      address: { zipCode: '01001000', street: 'Praça da Sé', number: '10', complement: null, neighborhood: 'Sé', city: 'São Paulo', state: 'SP', country: 'Brasil' },
      enrollmentNumber: 'WG-44', studentStatus: 'ACTIVE', joinedAt: '2026-01-01',
    });
    renderPage(<StudentProfilePage />);
    expect(await screen.findByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.getByText(/Praça da Sé, 10/)).toBeInTheDocument();
    expect(screen.getByText(/Alterações de e-mail, senha e dados cadastrais/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar|editar|alterar senha/i })).not.toBeInTheDocument();
  });

  it('renders empty graduation state', async () => {
    mocked.graduations.mockResolvedValue({ current: [], history: [] });
    renderPage(<StudentGraduationsPage />);
    expect(await screen.findByText('Nenhuma graduação registrada.')).toBeInTheDocument();
  });

  it('clears protected content and renders a safe 403 state', async () => {
    mocked.graduations.mockRejectedValue(new ApiClientError({ status: 403, message: 'Negado' }));
    renderPage(<StudentGraduationsPage />);
    expect(await screen.findByText('Acesso indisponível')).toBeInTheDocument();
    expect(screen.queryByText('Histórico')).not.toBeInTheDocument();
  });

  it('renders a comprehensible 401 error when the request is rejected', async () => {
    mocked.finance.mockRejectedValue(new ApiClientError({ status: 401, message: 'Sessão expirada' }));
    renderPage(<StudentFinancePage />);
    expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
    expect(screen.getByText('Sessão expirada')).toBeInTheDocument();
  });

  it('uses /me/attendance without studentId and applies only date filters', async () => {
    mocked.attendance.mockResolvedValue({
      period: { startDate: '2026-05-30', endDate: '2026-08-27' },
      summary: { total: 0, present: 0, absent: 0, justified: 0 }, records: [],
    });
    renderPage(<StudentAttendancePage />);
    await screen.findByText('Nenhum registro de presença neste período.');
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtro' }));
    await waitFor(() => expect(mocked.attendance).toHaveBeenLastCalledWith('2026-08-01', '2026-08-20'));
  });

  it('separates academic finance and does not present Shop data', async () => {
    mocked.finance.mockResolvedValue({
      plans: { current: [], history: [] }, charges: [], payments: [],
      situation: { openChargeCount: 0, openBalance: 0, overdueChargeCount: 0, overdueBalance: 0, nextCharge: null },
    });
    renderPage(<StudentFinancePage />);
    expect(await screen.findByText('Nenhuma cobrança acadêmica.')).toBeInTheDocument();
    expect(screen.queryByText(/produto|carrinho|checkout/i)).not.toBeInTheDocument();
    expect(mocked.finance).toHaveBeenCalledTimes(1);
  });
});
