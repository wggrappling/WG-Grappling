export type StoreProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
};

export type CartItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  available: boolean;
  product: Pick<StoreProduct, 'id' | 'name' | 'description'>;
};

export type StoreCart = {
  items: CartItem[];
  subtotal: number;
  total: number;
};

export type StoreOrderSummary = {
  id: number;
  subtotal: number;
  total: number;
  status: 'PENDING_PAYMENT';
  createdAt: string;
  itemCount: number;
};

export type StoreOrder = Omit<StoreOrderSummary, 'itemCount'> & {
  items: Array<{
    id: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};
