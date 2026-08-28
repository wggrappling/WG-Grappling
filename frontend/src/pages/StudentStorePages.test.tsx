import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../api/errors';
import { selfService } from '../services';
import { StudentCartPage, StudentOrderPage, StudentOrdersPage, StudentProductPage, StudentStorePage } from './StudentStorePages';

vi.mock('../services', () => ({
  selfService: {
    me: vi.fn(), storeProducts: vi.fn(), storeProduct: vi.fn(), cart: vi.fn(),
    storeProductImage: vi.fn(),
    addCartItem: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn(),
    orders: vi.fn(), order: vi.fn(), checkout: vi.fn(),
  },
}));

const mocked = vi.mocked(selfService);
const me = (status: 'ACTIVE' | 'PAUSED' = 'ACTIVE') => ({
  account: { id: 8, name: 'Ana', email: 'ana@example.com', role: 'ALUNO' as const, active: true },
  student: { id: 44, name: 'Ana', enrollmentNumber: 'WG-44', status, joinedAt: '2026-01-01' },
  academicContext: { active: status === 'ACTIVE' },
});
const product = { id: 3, name: 'Kimono', description: 'Trançado', type: 'SET' as const, price: 399.9, available: true, madeToOrder: false, leadTimeDays: 7, imageUrl: null, variants: [{ id: 11, color: 'Preto', size: 'M', available: true }] };
const renderAt = (path: string, element: React.ReactNode, routePath = '*') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path={routePath} element={element} /></Routes></MemoryRouter>);

describe('student store pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads protected product images through the authenticated service', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:product') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    mocked.me.mockResolvedValue(me());
    mocked.storeProducts.mockResolvedValue([{ ...product, imageUrl: '/me/store/products/3/image' }]);
    mocked.storeProductImage.mockResolvedValue(new Blob(['image']));
    renderAt('/app/shop', <StudentStorePage />);
    expect(await screen.findByRole('img', { name: 'Foto de Kimono' })).toHaveAttribute('src', 'blob:product');
    expect(mocked.storeProductImage).toHaveBeenCalledWith(3);
  });

  it('renders loading and a real catalog without exposing stock quantity', async () => {
    mocked.me.mockResolvedValue(me());
    mocked.storeProducts.mockResolvedValue([product]);
    renderAt('/app/shop', <StudentStorePage />);
    expect(screen.getByText('Carregando suas informações...')).toBeInTheDocument();
    expect(await screen.findByText('Kimono')).toBeInTheDocument();
    expect(screen.getByText('R$ 399,90')).toBeInTheDocument();
    expect(screen.queryByText(/4 unidades|estoque/i)).not.toBeInTheDocument();
  });

  it('supports catalog search and empty results', async () => {
    mocked.me.mockResolvedValue(me());
    mocked.storeProducts.mockResolvedValue([product]);
    renderAt('/app/shop', <StudentStorePage />);
    await screen.findByText('Kimono');
    fireEvent.change(screen.getByLabelText('Buscar produtos'), { target: { value: 'faixa' } });
    expect(screen.getByText('Nenhum produto corresponde à busca.')).toBeInTheDocument();
  });

  it('allows ACTIVE to add a product without sending price or studentId', async () => {
    mocked.me.mockResolvedValue(me('ACTIVE'));
    mocked.storeProduct.mockResolvedValue(product);
    mocked.addCartItem.mockResolvedValue({ items: [], subtotal: 0, total: 0 });
    renderAt('/app/shop/products/3', <StudentProductPage />, '/app/shop/products/:productId');
    await screen.findByRole('button', { name: 'Adicionar ao carrinho' });
    fireEvent.change(screen.getByLabelText('Variação'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    await waitFor(() => expect(mocked.addCartItem).toHaveBeenCalledWith(3, 11, 1));
    expect(await screen.findByText('Produto adicionado ao carrinho.')).toBeInTheDocument();
  });

  it('shows catalog to PAUSED but hides every purchase action', async () => {
    mocked.me.mockResolvedValue(me('PAUSED'));
    mocked.storeProduct.mockResolvedValue(product);
    renderAt('/app/shop/products/3', <StudentProductPage />, '/app/shop/products/:productId');
    expect(await screen.findByText('Consulta disponível')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar ao carrinho' })).not.toBeInTheDocument();
  });

  it('sends selected quantity without client price, total or studentId', async () => {
    mocked.me.mockResolvedValue(me('ACTIVE'));
    mocked.storeProduct.mockResolvedValue(product);
    mocked.addCartItem.mockResolvedValue({ items: [], subtotal: 0, total: 0 });
    renderAt('/app/shop/products/3', <StudentProductPage />, '/app/shop/products/:productId');
    await screen.findByRole('button', { name: 'Adicionar ao carrinho' });
    fireEvent.change(screen.getByLabelText('Variação'), { target: { value: '11' } });
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    await waitFor(() => expect(mocked.addCartItem).toHaveBeenCalledWith(3, 11, 2));
  });

  it('renders server-calculated cart totals and updates only quantity', async () => {
    mocked.me.mockResolvedValue(me());
    mocked.cart.mockResolvedValue({ items: [{ id: 9, quantity: 2, unitPrice: 50, subtotal: 100, available: true, product: { id: 3, name: 'Faixa', description: 'Azul' }, variant: { id: 11, color: 'Azul', size: 'M' } }], subtotal: 100, total: 100 });
    mocked.updateCartItem.mockResolvedValue({ items: [], subtotal: 0, total: 0 });
    renderAt('/app/shop/cart', <StudentCartPage />);
    expect(await screen.findByText('R$ 100,00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quantidade de Faixa'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(mocked.updateCartItem).toHaveBeenCalledWith(9, 3));
  });

  it('renders own orders and no checkout or payment action', async () => {
    mocked.orders.mockResolvedValue([{ id: 12, subtotal: 80, total: 80, paid: 0, balance: 80, status: 'PENDING_PAYMENT', createdAt: '2026-08-27', itemCount: 1 }]);
    renderAt('/app/shop/orders', <StudentOrdersPage />);
    expect(await screen.findByText('Pedido #12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pagar|checkout|finalizar/i })).not.toBeInTheDocument();
  });

  it('translates made-to-order tracking and shows variation and payments', async () => {
    mocked.order.mockResolvedValue({ id: 12, subtotal: 80, total: 80, paid: 30, balance: 50, status: 'IN_PRODUCTION', createdAt: '2026-08-27', items: [{ id: 1, productName: 'Kimono', quantity: 1, unitPrice: 80, subtotal: 80, color: 'Preto', size: 'M', madeToOrder: true, leadTimeDays: 7 }], payments: [{ id: 2, method: 'PIX_MANUAL', amount: 30, status: 'UNDER_REVIEW', createdAt: '2026-08-27' }] });
    renderAt('/app/shop/orders/12', <StudentOrderPage />, '/app/shop/orders/:orderId');
    expect(await screen.findByText('Em fabricação')).toBeInTheDocument();
    expect(screen.getByText(/Preto · M/)).toBeInTheDocument();
    expect(screen.getByText('Pix manual')).toBeInTheDocument();
    expect(screen.getByText('Em análise')).toBeInTheDocument();
    expect(screen.getByText('Prazo estimado: até 7 dias')).toBeInTheDocument();
  });

  it('renders a safe 403 state without stale store content', async () => {
    mocked.me.mockRejectedValue(new ApiClientError({ status: 403, message: 'Negado' }));
    mocked.storeProducts.mockResolvedValue([]);
    renderAt('/app/shop', <StudentStorePage />);
    expect(await screen.findByText('Acesso indisponível')).toBeInTheDocument();
    expect(screen.queryByLabelText('Produtos disponíveis')).not.toBeInTheDocument();
  });
});
