import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResourceState } from '../components/self-service/ResourceState';
import { useSelfServiceResource } from '../hooks';
import { selfService } from '../services';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' });

function StoreHeader({ title, description }: { title: string; description: string }) {
  return <header className="student-page-header"><h1>{title}</h1><p>{description}</p></header>;
}

function StoreLinks() {
  return <nav className="student-store-links" aria-label="Navegação da Loja">
    <Link to="/app/shop">Catálogo</Link>
    <Link to="/app/shop/cart">Carrinho</Link>
    <Link to="/app/shop/orders">Pedidos</Link>
  </nav>;
}

function PausedStoreNotice() {
  return <div className="student-status-banner" role="status"><strong>Loja em modo de consulta</strong><br />Sua matrícula pausada não permite alterar o carrinho ou iniciar compras.</div>;
}

function MutationMessage({ message, error }: { message: string; error: boolean }) {
  return message ? <p className={error ? 'student-action-message student-action-error' : 'student-action-message'} role={error ? 'alert' : 'status'}>{message}</p> : null;
}

export function StudentStorePage() {
  const [search, setSearch] = useState('');
  const load = useCallback(async () => {
    const [me, products] = await Promise.all([selfService.me(), selfService.storeProducts()]);
    return { me, products };
  }, []);
  const resource = useSelfServiceResource(load, [load]);
  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return resource.data?.products.filter((product) => !term
      || product.name.toLocaleLowerCase('pt-BR').includes(term)
      || product.description.toLocaleLowerCase('pt-BR').includes(term)) ?? [];
  }, [resource.data, search]);
  const paused = resource.data?.me.student.status === 'PAUSED';

  return <>
    <StoreHeader title="Loja" description="Produtos disponíveis na academia, separados do seu financeiro acadêmico." />
    <StoreLinks />
    <ResourceState {...resource} empty={false} onRetry={() => void resource.refresh()}>
      {resource.data && <>
        {paused && <PausedStoreNotice />}
        <label className="student-store-search">Buscar produtos<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou descrição" /></label>
        {products.length === 0
          ? <section className="student-state"><p>{search ? 'Nenhum produto corresponde à busca.' : 'Nenhum produto disponível no momento.'}</p></section>
          : <section className="student-product-grid" aria-label="Produtos disponíveis">
            {products.map((product) => <article className="student-product-card" key={product.id}>
              {product.imageUrl && <img src={product.imageUrl} alt={`Foto de ${product.name}`} />}
              <div><h2>{product.name}</h2><p>{product.description}</p></div>
              <strong>{currency.format(product.price)}</strong>
              <span className={product.available ? 'student-pill student-pill-active' : 'student-pill'}>{product.available ? 'Disponível' : 'Indisponível'}</span>
              <Link to={`/app/shop/products/${product.id}`}>Ver produto</Link>
            </article>)}
          </section>}
      </>}
    </ResourceState>
  </>;
}

export function StudentProductPage() {
  const productId = Number(useParams().productId);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [variantId, setVariantId] = useState('');
  const load = useCallback(async () => {
    const [me, product] = await Promise.all([selfService.me(), selfService.storeProduct(productId)]);
    return { me, product };
  }, [productId]);
  const resource = useSelfServiceResource(load, [load]);
  const paused = resource.data?.me.student.status === 'PAUSED';
  const add = async () => {
    setMessage('');
    try {
      const selected = Number(variantId || resource.data?.product.variants.find((variant) => variant.available)?.id);
      if (!selected) throw new Error('Selecione uma variação disponível.');
      await selfService.addCartItem(productId, selected, 1);
      setFailed(false);
      setMessage('Produto adicionado ao carrinho.');
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'Não foi possível alterar o carrinho.');
    }
  };

  return <>
    <StoreHeader title="Produto" description="Detalhes e disponibilidade atual do produto." />
    <StoreLinks />
    <ResourceState {...resource} onRetry={() => void resource.refresh()}>
      {resource.data && <section className="student-card student-product-detail">
        {paused && <PausedStoreNotice />}
        <h2>{resource.data.product.name}</h2>
        {resource.data.product.imageUrl && <img src={resource.data.product.imageUrl} alt={`Foto de ${resource.data.product.name}`} />}
        <p>{resource.data.product.description}</p>
        <strong className="student-product-price">{currency.format(resource.data.product.price)}</strong>
        <span className={resource.data.product.available ? 'student-pill student-pill-active' : 'student-pill'}>{resource.data.product.available ? 'Disponível' : 'Indisponível'}</span>
        {resource.data.product.madeToOrder && <p>Sob encomenda · prazo de até {resource.data.product.leadTimeDays} dias.</p>}
        <label>Variação<select aria-label="Variação" value={variantId} onChange={(event) => setVariantId(event.target.value)}><option value="">Selecione</option>{resource.data.product.variants.map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.available}>{[variant.color, variant.size].filter(Boolean).join(' · ') || 'Padrão'}{!variant.available ? ' — indisponível' : ''}</option>)}</select></label>
        {!paused && resource.data.product.available && <button type="button" onClick={() => void add()}>Adicionar ao carrinho</button>}
        <MutationMessage message={message} error={failed} />
      </section>}
    </ResourceState>
  </>;
}

export function StudentCartPage() {
  const load = useCallback(async () => {
    const [me, cart] = await Promise.all([selfService.me(), selfService.cart()]);
    return { me, cart };
  }, []);
  const resource = useSelfServiceResource(load, [load]);
  const [message, setMessage] = useState('');
  const [method, setMethod] = useState<'PIX_QR_CODE' | 'CREDIT_CARD_LINK' | 'CREDIT_CARD_PHYSICAL' | 'PIX_MANUAL'>('PIX_MANUAL');
  const paused = resource.data?.me.student.status === 'PAUSED';
  const mutate = async (operation: () => Promise<unknown>) => {
    setMessage('');
    try {
      await operation();
      await resource.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível alterar o carrinho.');
    }
  };
  const update = (event: FormEvent<HTMLFormElement>, itemId: number) => {
    event.preventDefault();
    const quantity = Number(new FormData(event.currentTarget).get('quantity'));
    void mutate(() => selfService.updateCartItem(itemId, quantity));
  };

  return <>
    <StoreHeader title="Carrinho" description="Valores recalculados pelo servidor com o preço atual dos produtos." />
    <StoreLinks />
    <ResourceState {...resource} empty={Boolean(resource.data && resource.data.cart.items.length === 0)} emptyMessage="Seu carrinho está vazio." onRetry={() => void resource.refresh()}>
      {resource.data && <>
        {paused && <PausedStoreNotice />}
        <MutationMessage message={message} error />
        <section className="student-list student-cart-list">
          {resource.data.cart.items.map((item) => <article key={item.id}>
            <div><strong>{item.product.name}</strong><small>{[item.variant.color, item.variant.size].filter(Boolean).join(' · ') || 'Padrão'} · {currency.format(item.unitPrice)} por unidade · Subtotal {currency.format(item.subtotal)}</small>{!item.available && <small className="student-action-error">Quantidade indisponível no momento.</small>}</div>
            {paused
              ? <span>Qtd. {item.quantity}</span>
              : <form onSubmit={(event) => update(event, item.id)} className="student-cart-actions">
                <label><span className="student-visually-hidden">Quantidade de {item.product.name}</span><input name="quantity" type="number" min="1" defaultValue={item.quantity} /></label>
                <button type="submit">Atualizar</button>
                <button type="button" className="student-button-secondary" onClick={() => void mutate(() => selfService.removeCartItem(item.id))}>Remover</button>
              </form>}
          </article>)}
        </section>
        <section className="student-card student-cart-total"><span>Total atual</span><strong>{currency.format(resource.data.cart.total)}</strong>{!paused && <><label>Forma de pagamento<select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}><option value="PIX_MANUAL">Pix manual</option><option value="CREDIT_CARD_PHYSICAL">Cartão físico</option><option value="PIX_QR_CODE">Pix QR Code</option><option value="CREDIT_CARD_LINK">Link de cartão</option></select></label><button type="button" disabled={resource.data.cart.items.some((item) => !item.available)} onClick={() => void mutate(() => selfService.checkout(method, resource.data!.cart.total))}>Criar pedido</button></>}<p>Pagamentos eletrônicos dependem de confirmação real. Pagamentos manuais passam por análise da academia.</p></section>
      </>}
    </ResourceState>
  </>;
}

export function StudentOrdersPage() {
  const load = useCallback(() => selfService.orders(), []);
  const resource = useSelfServiceResource(load, [load]);
  return <>
    <StoreHeader title="Pedidos" description="Acompanhe somente os seus pedidos comerciais." />
    <StoreLinks />
    <ResourceState {...resource} empty={Boolean(resource.data && resource.data.length === 0)} emptyMessage="Você ainda não possui pedidos." onRetry={() => void resource.refresh()}>
      {resource.data && <section className="student-list">{resource.data.map((order) => <article key={order.id}><div><strong>Pedido #{order.id}</strong><small>{date.format(new Date(order.createdAt))} · {order.itemCount} item(ns) · Saldo {currency.format(order.balance)}</small></div><div><strong>{currency.format(order.total)}</strong><Link to={`/app/shop/orders/${order.id}`}>Detalhes</Link></div></article>)}</section>}
    </ResourceState>
  </>;
}

export function StudentOrderPage() {
  const orderId = Number(useParams().orderId);
  const load = useCallback(() => selfService.order(orderId), [orderId]);
  const resource = useSelfServiceResource(load, [load]);
  return <>
    <StoreHeader title="Pedido" description="Itens e valores registrados no seu pedido." />
    <StoreLinks />
    <ResourceState {...resource} onRetry={() => void resource.refresh()}>
      {resource.data && <div className="student-grid">
        <section className="student-card"><h2>Pedido #{resource.data.id}</h2><p>{date.format(new Date(resource.data.createdAt))}</p><span className="student-pill student-pill-paused">{resource.data.status.replace(/_/g, ' ')}</span><p>Pago: {currency.format(resource.data.paid)} · Pendente: {currency.format(resource.data.balance)}</p></section>
        <section className="student-list">{resource.data.items.map((item) => <article key={item.id}><div><strong>{item.productName}</strong><small>{item.quantity} × {currency.format(item.unitPrice)}</small></div><strong>{currency.format(item.subtotal)}</strong></article>)}</section>
        <section className="student-card student-cart-total"><span>Total registrado</span><strong>{currency.format(resource.data.total)}</strong></section>
      </div>}
    </ResourceState>
  </>;
}
