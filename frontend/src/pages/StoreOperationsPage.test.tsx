import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';
import { storeOperations } from '../services';
import { StoreOperationsPage } from './StoreOperationsPage';

vi.mock('../services', () => ({ storeOperations: { products: vi.fn(), reviews: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(), uploadProductImage: vi.fn(), addStock: vi.fn(), findCustomer: vi.fn(), createOrder: vi.fn(), submitManualPayment: vi.fn(), approve: vi.fn(), cancel: vi.fn(), refund: vi.fn(), updateOrderStatus: vi.fn() } }));
const mocked = vi.mocked(storeOperations);
const auth = (role: 'OWNER' | 'ADMIN' | 'RECEPTION'): AuthContextValue => ({ user: { id: 1, name: 'Operador', email: 'op@example.com', role, active: true }, authenticated: true, initializing: false, login: vi.fn(), logout: vi.fn() });
const renderRole = (role: 'OWNER' | 'ADMIN' | 'RECEPTION') => render(<AuthContext.Provider value={auth(role)}><StoreOperationsPage /></AuthContext.Provider>);

describe('StoreOperationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.products.mockResolvedValue([{ id: 3, name: 'Short', description: 'Treino', type: 'SHORTS', salePrice: 100, madeToOrder: false, leadTimeDays: 7, status: 'ACTIVE', imageUrl: null, variants: [{ id: 7, color: 'Preto', size: 'M', availableQuantity: 3, minimumStock: 5, latestUnitCost: 40, stockState: 'LOW_STOCK' }] }]);
    mocked.reviews.mockResolvedValue([]);
  });

  it('shows stock alert, product administration and review queue to ADMIN', async () => {
    renderRole('ADMIN');
    expect(await screen.findByText(/ESTOQUE ACABANDO/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novo produto' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pagamentos em análise' })).toBeInTheDocument();
  });

  it('allows RECEPTION sales but hides product, stock and approval actions', async () => {
    renderRole('RECEPTION');
    expect(await screen.findByRole('heading', { name: 'Venda pela recepção' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Novo produto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pagamentos em análise' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar entrada' })).not.toBeInTheDocument();
    expect(mocked.reviews).not.toHaveBeenCalled();
  });
});
