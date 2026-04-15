import { Item, BOM, PurchaseOrder, ProductionOrder, Sale } from '../types';

export const mockItems: Item[] = [
  { id: '1', name: 'Harina de Trigo', type: 'MATERIAL', unit: 'kg', stock: 50, minStock: 20, cost: 1.5 },
  { id: '2', name: 'Azúcar Blanca', type: 'MATERIAL', unit: 'kg', stock: 30, minStock: 10, cost: 1.2 },
  { id: '3', name: 'Mantequilla', type: 'MATERIAL', unit: 'kg', stock: 15, minStock: 5, cost: 5.0 },
  { id: '4', name: 'Galletas de Mantequilla (Pack 12)', type: 'PRODUCT', unit: 'pack', stock: 20, minStock: 10, cost: 3.5, price: 8.0 },
  { id: '5', name: 'Bizcocho de Vainilla', type: 'PRODUCT', unit: 'unidad', stock: 5, minStock: 5, cost: 4.5, price: 12.0 },
];

export const mockBOMs: BOM[] = [
  {
    id: 'b1',
    productId: '4',
    materials: [
      { itemId: '1', quantity: 0.5 }, // 0.5kg harina
      { itemId: '2', quantity: 0.2 }, // 0.2kg azucar
      { itemId: '3', quantity: 0.25 }, // 0.25kg mantequilla
    ],
  },
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'PO-001',
    supplier: 'Distribuidora Central',
    date: '2024-03-20',
    status: 'RECEIVED',
    items: [
      { itemId: '1', quantity: 100, cost: 1.5 },
      { itemId: '2', quantity: 50, cost: 1.2 },
    ],
    total: 210,
  },
  {
    id: 'PO-002',
    supplier: 'Lácteos del Sur',
    date: '2024-03-25',
    status: 'PENDING',
    items: [
      { itemId: '3', quantity: 20, cost: 5.0 },
    ],
    total: 100,
  },
];

export const mockProductionOrders: ProductionOrder[] = [
  {
    id: 'MO-001',
    productId: '4',
    quantity: 10,
    date: '2024-03-22',
    status: 'COMPLETED',
  },
  {
    id: 'MO-002',
    productId: '5',
    quantity: 5,
    date: '2024-03-28',
    status: 'IN_PROGRESS',
  },
];

export const mockSales: Sale[] = [
  {
    id: 'SAL-001',
    customer: 'Juan Pérez',
    date: '2024-03-28',
    status: 'COMPLETED',
    items: [
      { productId: '4', quantity: 2, price: 8.0 },
    ],
    total: 16.0,
  },
  {
    id: 'SAL-002',
    customer: 'María García',
    date: '2024-03-29',
    status: 'COMPLETED',
    items: [
      { productId: '4', quantity: 5, price: 8.0 },
      { productId: '5', quantity: 1, price: 12.0 },
    ],
    total: 52.0,
  },
];
