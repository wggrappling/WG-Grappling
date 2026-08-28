import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../api/errors';
import { selfService } from '../services';
import { StudentDocumentPage, StudentDocumentsPage } from './StudentDocumentsPages';

vi.mock('../services', () => ({
  selfService: { documents: vi.fn(), document: vi.fn(), documentFile: vi.fn() },
}));

const mocked = vi.mocked(selfService);
const record = { id: 4, name: 'contrato.pdf', type: 'CONTRACT' as const, status: 'ACTIVE' as const, createdAt: '2026-08-20T12:00:00Z', size: 1200, available: true };

describe('student documents pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading and available/unavailable own document cards', async () => {
    mocked.documents.mockResolvedValue([record, { ...record, id: 5, name: 'termo.pdf', status: 'ARCHIVED', available: false }]);
    render(<MemoryRouter><StudentDocumentsPage /></MemoryRouter>);
    expect(screen.getByText('Carregando suas informações...')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'contrato.pdf' })).toHaveAttribute('href', '/app/documents/4');
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.queryByText(/storage|uploadedBy|studentId/i)).not.toBeInTheDocument();
  });

  it('renders empty, forbidden and error states', async () => {
    mocked.documents.mockResolvedValue([]);
    const empty = render(<MemoryRouter><StudentDocumentsPage /></MemoryRouter>);
    expect(await screen.findByText('Nenhum documento disponível.')).toBeInTheDocument();
    empty.unmount();
    mocked.documents.mockRejectedValue(new ApiClientError({ status: 403, message: 'Negado' }));
    const forbidden = render(<MemoryRouter><StudentDocumentsPage /></MemoryRouter>);
    expect(await screen.findByText('Acesso indisponível')).toBeInTheDocument();
    forbidden.unmount();
    mocked.documents.mockRejectedValue(new ApiClientError({ status: 500, message: 'Falha segura' }));
    render(<MemoryRouter><StudentDocumentsPage /></MemoryRouter>);
    expect(await screen.findByText('Falha segura')).toBeInTheDocument();
  });

  it('renders detail and requests the protected download endpoint through the client', async () => {
    mocked.document.mockResolvedValue(record);
    mocked.documentFile.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    vi.stubGlobal('open', vi.fn());
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:safe') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    render(<MemoryRouter initialEntries={['/app/documents/4']}><Routes><Route path="/app/documents/:documentId" element={<StudentDocumentPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'contrato.pdf' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar' }));
    expect(mocked.documentFile).toHaveBeenCalledWith(4, false);
    expect(screen.getByRole('button', { name: 'Baixar' })).toBeInTheDocument();
  });

  it('does not show file actions when unavailable', async () => {
    mocked.document.mockResolvedValue({ ...record, status: 'ARCHIVED', available: false });
    render(<MemoryRouter initialEntries={['/app/documents/4']}><Routes><Route path="/app/documents/:documentId" element={<StudentDocumentPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Indisponível')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Visualizar|Baixar/ })).not.toBeInTheDocument();
  });
});
