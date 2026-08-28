import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../api/errors';
import { selfService } from '../services';
import { NextClassSection, StudentSchedulePage } from './StudentSchedulePage';

vi.mock('../services', () => ({ selfService: { schedule: vi.fn() } }));
const mocked = vi.mocked(selfService);
const next = { date: '2026-08-31', startTime: '19:00', endTime: '20:00', className: 'No-Gi', modalityName: 'Jiu-Jitsu' };

describe('student schedule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the next class on Home with a secondary agenda link', async () => {
    mocked.schedule.mockResolvedValue({ next, upcoming: [] });
    render(<MemoryRouter><NextClassSection /></MemoryRouter>);
    expect(screen.getByText('Carregando próxima aula...')).toBeInTheDocument();
    expect(await screen.findByText('Jiu-Jitsu')).toBeInTheDocument();
    expect(screen.getByText('No-Gi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver agenda' })).toHaveAttribute('href', '/app/schedule');
  });

  it('renders next and upcoming classes in server order', async () => {
    mocked.schedule.mockResolvedValue({ next, upcoming: [{ ...next, date: '2026-09-02' }, { ...next, date: '2026-09-07' }] });
    render(<MemoryRouter><StudentSchedulePage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getAllByText('Jiu-Jitsu')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Próximas aulas' })).toBeInTheDocument();
    expect(screen.queryByText(/professor|local|presença/i)).not.toBeInTheDocument();
  });

  it('renders the approved empty state', async () => {
    mocked.schedule.mockResolvedValue({ next: null, upcoming: [] });
    render(<MemoryRouter><StudentSchedulePage /></MemoryRouter>);
    expect(await screen.findByText('Nenhuma próxima aula encontrada.')).toBeInTheDocument();
  });

  it('renders forbidden and error states safely', async () => {
    mocked.schedule.mockRejectedValue(new ApiClientError({ status: 403, message: 'Negado' }));
    const forbidden = render(<MemoryRouter><StudentSchedulePage /></MemoryRouter>);
    expect(await screen.findByText('Acesso indisponível')).toBeInTheDocument();
    forbidden.unmount();
    mocked.schedule.mockRejectedValue(new ApiClientError({ status: 500, message: 'Falha segura' }));
    render(<MemoryRouter><StudentSchedulePage /></MemoryRouter>);
    expect(await screen.findByText('Falha segura')).toBeInTheDocument();
  });
});
