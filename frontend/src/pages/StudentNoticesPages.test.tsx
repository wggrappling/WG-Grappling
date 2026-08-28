import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../api/errors';
import { selfService } from '../services';
import { StudentNoticePage, StudentNoticesPage } from './StudentNoticesPages';

vi.mock('../services', () => ({
  selfService: { notices: vi.fn(), notice: vi.fn(), markNoticeRead: vi.fn() },
}));

const mocked = vi.mocked(selfService);

describe('student notices pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading, unread/read list semantics and links without recipient data', async () => {
    mocked.notices.mockResolvedValue([
      { id: 2, title: 'Graduação', content: 'Detalhes', publishedAt: '2026-08-28T12:00:00Z', isRead: false },
      { id: 1, title: 'Horário', content: 'Detalhes', publishedAt: '2026-08-27T12:00:00Z', isRead: true },
    ]);
    render(<MemoryRouter><StudentNoticesPage /></MemoryRouter>);
    expect(screen.getByText('Carregando suas informações...')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Graduação' })).toHaveAttribute('href', '/app/notices/2');
    expect(screen.getByText(/Não lido:/)).toBeInTheDocument();
    expect(screen.getByText(/Lido:/)).toBeInTheDocument();
    expect(screen.queryByText(/studentId|userId|autor/i)).not.toBeInTheDocument();
  });

  it('renders the approved empty state', async () => {
    mocked.notices.mockResolvedValue([]);
    render(<MemoryRouter><StudentNoticesPage /></MemoryRouter>);
    expect(await screen.findByText('Nenhum aviso no momento.')).toBeInTheDocument();
  });

  it('renders forbidden and retryable error states', async () => {
    mocked.notices.mockRejectedValue(new ApiClientError({ status: 403, message: 'Negado' }));
    const view = render(<MemoryRouter><StudentNoticesPage /></MemoryRouter>);
    expect(await screen.findByText('Acesso indisponível')).toBeInTheDocument();
    view.unmount();
    mocked.notices.mockRejectedValue(new ApiClientError({ status: 500, message: 'Falha segura' }));
    render(<MemoryRouter><StudentNoticesPage /></MemoryRouter>);
    expect(await screen.findByText('Falha segura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('shows detail and marks only the route notice as read', async () => {
    const unread = { id: 9, title: 'Funcionamento', content: 'Academia aberta.', publishedAt: '2026-08-28T12:00:00Z', isRead: false };
    mocked.notice.mockResolvedValue(unread);
    mocked.markNoticeRead.mockResolvedValue({ ...unread, isRead: true });
    render(<MemoryRouter initialEntries={['/app/notices/9']}><Routes><Route path="/app/notices/:noticeId" element={<StudentNoticePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Funcionamento' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como lido' }));
    expect(await screen.findByText('Lido')).toBeInTheDocument();
    expect(mocked.markNoticeRead).toHaveBeenCalledWith(9);
    expect(screen.getByRole('link', { name: /Voltar aos avisos/ })).toHaveAttribute('href', '/app/notices');
  });
});
