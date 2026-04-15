
export type ItemType = 'MATERIAL' | 'PRODUCT';

export interface Category {
  id: string;
  name: string;
  type: ItemType;
  unit?: string;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  unit: string;
  stock: number;
  minStock: number;
  cost: number;
  price?: number;
  hasVariants?: boolean;
  attributes?: string[]; // e.g., ["Esencia"]
  variantStock?: Record<string, number>; // e.g., {"Lavanda": 10}
  category?: string;
}

export interface BOMItem {
  itemId: string;
  quantity: number;
  isVariable?: boolean;
  category?: string; // Hint for variable items (Group)
}

export interface BOM {
  id: string;
  productId: string;
  materials: BOMItem[];
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  date: string;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  items: {
    itemId: string;
    quantity: number;
    cost: number;
  }[];
  total: number;
}

export interface ProductionOrder {
  id: string;
  productId: string;
  quantity: number;
  date: string;
  deliveryDate?: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  variantValues?: Record<string, string>;
  selectedMaterials?: BOMItem[];
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  variantValues?: Record<string, string>;
}

export interface Sale {
  id: string;
  customer: string;
  date: string;
  items: SaleItem[];
  total: number;
  status: 'COMPLETED' | 'CANCELLED';
}
