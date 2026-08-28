import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';
import { storeOperations } from '../services';
import { StoreOperationsPage } from './StoreOperationsPage';

vi.mock('../services', () => ({ storeOperations: { products: vi.fn(), reviews: vi.fn(), orders: vi.fn(), order: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(), uploadProductImage: vi.fn(), addStock: vi.fn(), findCustomer: vi.fn(), createOrder: vi.fn(), submitManualPayment: vi.fn(), approve: vi.fn(), reject: vi.fn(), cancel: vi.fn(), refund: vi.fn(), updateOrderStatus: vi.fn() } }));
const mocked = vi.mocked(storeOperations);
const auth = (role: 'OWNER' | 'ADMIN' | 'RECEPTION'): AuthContextValue => ({ user: { id: 1, name: 'Operador', email: 'op@example.com', role, active: true }, authenticated: true, initializing: false, login: vi.fn(), logout: vi.fn() });
const renderRole = (role: 'OWNER' | 'ADMIN' | 'RECEPTION') => render(<AuthContext.Provider value={auth(role)}><StoreOperationsPage /></AuthContext.Provider>);

describe('StoreOperationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.products.mockResolvedValue([{ id: 3, name: 'Short', description: 'Treino', type: 'SHORTS', salePrice: 100, madeToOrder: false, leadTimeDays: 7, status: 'ACTIVE', imageUrl: null, variants: [{ id: 7, color: 'Preto', size: 'M', availableQuantity: 3, minimumStock: 5, latestUnitCost: 40, stockState: 'LOW_STOCK' }] }]);
    mocked.reviews.mockResolvedValue([]);
    mocked.orders.mockResolvedValue([]);
  });

  it('shows stock alert, product administration and review queue to ADMIN', async () => {
    renderRole('ADMIN');
    expect(await screen.findByRole('heading', { name: 'Produtos' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Estoque' }));
    expect(screen.getByText('ESTOQUE ACABANDO')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pagamentos em análise' }));
    expect(screen.getByRole('heading', { name: 'Pagamentos em análise' })).toBeInTheDocument();
  });

  it('allows RECEPTION sales but hides product, stock and approval actions', async () => {
    renderRole('RECEPTION');
    expect(await screen.findByRole('heading', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Produtos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pagamentos em análise' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar entrada' })).not.toBeInTheDocument();
    expect(mocked.reviews).not.toHaveBeenCalled();
    expect(mocked.orders).toHaveBeenCalled();
  });

  it('sends manual payment from RECEPTION to a confirmation modal and analysis', async () => {
    mocked.findCustomer.mockResolvedValue({ name: 'Ana', enrollmentNumber: 'WG-41', status: 'ACTIVE' });
    mocked.createOrder.mockResolvedValue({ id: 12, total: 100, status: 'PAYMENT_REVIEW' });
    renderRole('RECEPTION');
    await screen.findByRole('heading', { name: 'Cliente' });
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '52998224725' } });
    fireEvent.click(screen.getByRole('button', { name: 'Localizar cliente' }));
    await screen.findByText('Ana');
    fireEvent.change(screen.getByLabelText('CPF confirmado'), { target: { value: '52998224725' } });
    fireEvent.change(screen.getByLabelText('Produto, cor e tamanho'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Valor do pagamento'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Pagamento'), { target: { value: 'PIX_MANUAL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como pago' }));
    expect(screen.getByRole('dialog', { name: 'Marcar como pago' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Justificativa obrigatória'), { target: { value: 'Comprovante apresentado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para análise' }));
    await waitFor(() => expect(mocked.createOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'PIX_MANUAL', justification: 'Comprovante apresentado' })));
  });

  it('shows internal orders only to ADMIN and keeps server balances visible', async () => {
    mocked.orders.mockResolvedValue([{ id: 12, subtotal: 100, total: 100, paid: 30, balance: 70, status: 'IN_PRODUCTION', createdAt: '2026-08-27', student: { enrollmentNumber: 'WG-41', person: { name: 'Ana' } }, items: [{ id: 1, productName: 'Short', color: 'Preto', size: 'M', madeToOrder: true, leadTimeDays: 7, quantity: 1, unitPrice: 100, subtotal: 100 }], payments: [] }]);
    renderRole('ADMIN');
    await screen.findByRole('heading', { name: 'Produtos' });
    fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }));
    expect(screen.getByText(/Pedido #12 · Ana/)).toBeInTheDocument();
    expect(screen.getByText('R$ 70,00')).toBeInTheDocument();
    expect(screen.getByText('Em fabricação')).toBeInTheDocument();
  });

  it('lets ADMIN reject a payment with a required justification without cancelling the order', async () => {
    mocked.reviews.mockResolvedValue([{ id: 5, orderId: 12, method: 'PIX_MANUAL', amount: 30, justification: 'Comprovante recebido', submittedAt: '2026-08-27', submitter: { name: 'Recepção', role: 'RECEPTION' }, order: { total: 100, items: [{ productName: 'Short', color: 'Preto', size: 'M', quantity: 1 }], student: { enrollmentNumber: 'WG-41', person: { name: 'Ana' } } } }]);
    mocked.reject.mockResolvedValue({});
    renderRole('ADMIN');
    await screen.findByRole('heading', { name: 'Produtos' });
    fireEvent.click(screen.getByRole('button', { name: /Pagamentos em análise/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }));
    fireEvent.change(screen.getByLabelText('Justificativa da rejeição'), { target: { value: 'Comprovante inválido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rejeição' }));
    await waitFor(() => expect(mocked.reject).toHaveBeenCalledWith(5, 'Comprovante inválido'));
    expect(mocked.cancel).not.toHaveBeenCalled();
  });

  it('lets RECEPTION submit a second partial payment from an existing order', async () => {
    mocked.orders.mockResolvedValue([{ id: 12, subtotal: 100, total: 100, paid: 30, balance: 70, status: 'PENDING_PAYMENT', createdAt: '2026-08-27', student: { enrollmentNumber: 'WG-41', person: { name: 'Ana' } }, items: [{ id: 1, productName: 'Short', color: 'Preto', size: 'M', madeToOrder: false, leadTimeDays: null, quantity: 1, unitPrice: 100, subtotal: 100 }], payments: [{ id: 4, method: 'PIX_MANUAL', amount: 30, status: 'CONFIRMED', createdAt: '2026-08-27' }] }]);
    mocked.submitManualPayment.mockResolvedValue({});
    renderRole('RECEPTION');
    await screen.findByRole('heading', { name: 'Cliente' });
    fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como pago' }));
    fireEvent.change(screen.getByLabelText('Valor informado'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Justificativa obrigatória'), { target: { value: 'Segundo comprovante recebido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para análise' }));
    await waitFor(() => expect(mocked.submitManualPayment).toHaveBeenCalledWith(12, expect.objectContaining({ method: 'PIX_MANUAL', amount: 70, justification: 'Segundo comprovante recebido' })));
  });
});
