export type StoreProduct = {
  id: number;
  name: string;
  description: string;
  type: 'SHIRT' | 'SHORTS' | 'SET';
  price: number;
  available: boolean;
  madeToOrder: boolean;
  leadTimeDays: number;
  imageUrl: string | null;
  variants: Array<{ id: number; color: string | null; size: string | null; available: boolean }>;
};

export type CartItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  available: boolean;
  product: Pick<StoreProduct, 'id' | 'name' | 'description'>;
  variant: { id: number; color: string | null; size: string | null };
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
  status: 'PENDING_PAYMENT' | 'PAYMENT_REVIEW' | 'CONFIRMED' | 'IN_PRODUCTION' | 'AWAITING_DELIVERY' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  itemCount: number;
  paid: number;
  balance: number;
};

export type StoreOrder = Omit<StoreOrderSummary, 'itemCount'> & {
  items: Array<{
    id: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    color: string | null;
    size: string | null;
  }>;
  paid: number;
  balance: number;
  payments: Array<{ id: number; method: string; amount: number; status: string; createdAt: string }>;
};
