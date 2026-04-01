export type ProductSize = string;

export type StorefrontProductVariant = {
  id: string;
  sku: string;
  color: string;
  size: ProductSize;
  stock: number;
  available: boolean;
};

export type StorefrontProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  country: string;
  season: string;
  type: string;
  collection: string;
  collectionSlug: string;
  category: string;
  categorySlug: string;
  fit: string;
  material: string;
  badge?: string;
  gradient: string;
  palette: [string, string];
  image: string;
  images: string[];
  details: string[];
  highlights: string[];
  colors: string[];
  sizes: ProductSize[];
  variants: StorefrontProductVariant[];
  featured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  isRetro: boolean;
  isActive: boolean;
};

export type StorefrontCollection = {
  name: string;
  slug: string;
  description?: string | null;
  productCount: number;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId?: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  image: string;
  price: number;
  size: ProductSize;
  color: string;
  availableStock: number;
  quantity: number;
};

export type ActionResponse = {
  ok: boolean;
  message: string;
};

export type CustomerIdentity = {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
};

export type CustomerSessionResponse =
  | {
      authenticated: true;
      customer: CustomerIdentity;
    }
  | {
      authenticated: false;
      customer: null;
    };

export type OrderActionResponse = ActionResponse & {
  orderId?: string;
  orderNumber?: string;
  total?: number;
};

export type CheckoutQuoteResponse = ActionResponse & {
  subtotal?: number;
  discountAmount?: number;
  shippingAmount?: number;
  total?: number;
  freeShipping?: boolean;
  shippingLabel?: string;
  shippingEta?: string;
  couponCode?: string | null;
  couponDescription?: string | null;
};

export type CheckoutSessionResponse = ActionResponse & {
  orderId?: string;
  orderNumber?: string;
  redirectUrl?: string;
  sessionId?: string | null;
  isMock?: boolean;
};
