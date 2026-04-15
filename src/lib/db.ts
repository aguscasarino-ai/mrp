import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDoc,
  getDocs,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operation: OperationType, path: string) {
  console.error(`Firestore Error [${operation}] at ${path}:`, error);
  throw error;
}

export const subscribeToCollection = (path: string, callback: (data: any[]) => void) => {
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, path));
};

export const addItem = async (item: any) => {
  try {
    return await addDoc(collection(db, 'items'), {
      ...item,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'items');
  }
};

export const updateItem = async (id: string, data: any) => {
  try {
    const docRef = doc(db, 'items', id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `items/${id}`);
  }
};

export const deleteItem = async (id: string) => {
  try {
    const docRef = doc(db, 'items', id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `items/${id}`);
  }
};

export const addCategory = async (category: any) => {
  try {
    return await addDoc(collection(db, 'categories'), {
      ...category,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'categories');
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const docRef = doc(db, 'categories', id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
};

export const updateCategory = async (id: string, data: any) => {
  try {
    const docRef = doc(db, 'categories', id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
  }
};

export const addSale = async (sale: any) => {
  try {
    // 1. Registrar la venta
    const saleRef = await addDoc(collection(db, 'sales'), {
      ...sale,
      date: Timestamp.now()
    });

    // 2. Descontar stock de productos
    for (const item of sale.items) {
      const itemRef = doc(db, 'items', item.productId);
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        const updates: any = {
          stock: data.stock - item.quantity,
          updatedAt: Timestamp.now()
        };

        // Manejar variantes si existen
        if (item.variantValues) {
          const variantKey = Object.entries(item.variantValues)
            .map(([k, v]) => `${k}:${v}`)
            .join('|');
          
          const variantStock = data.variantStock || {};
          variantStock[variantKey] = (variantStock[variantKey] || 0) - item.quantity;
          updates.variantStock = variantStock;
        }

        await updateDoc(itemRef, updates);
      }
    }
    return saleRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sales');
  }
};

export const addProductionOrder = async (order: any) => {
  try {
    return await addDoc(collection(db, 'productionOrders'), {
      ...order,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'productionOrders');
  }
};

export const addBOM = async (bom: any) => {
  try {
    return await addDoc(collection(db, 'boms'), {
      ...bom,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'boms');
  }
};

export const updateBOM = async (id: string, bom: any) => {
  try {
    const docRef = doc(db, 'boms', id);
    return await updateDoc(docRef, {
      ...bom,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `boms/${id}`);
  }
};

export const deleteBOM = async (id: string) => {
  try {
    const docRef = doc(db, 'boms', id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `boms/${id}`);
  }
};

export const deleteProductionOrder = async (id: string) => {
  try {
    const docRef = doc(db, 'productionOrders', id);
    return await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `productionOrders/${id}`);
  }
};

export const updateProductionOrder = async (id: string, data: any) => {
  try {
    const docRef = doc(db, 'productionOrders', id);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `productionOrders/${id}`);
  }
};

export const addPurchaseOrder = async (order: any) => {
  try {
    return await addDoc(collection(db, 'purchaseOrders'), {
      ...order,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'purchaseOrders');
  }
};

export const receivePurchaseOrder = async (orderId: string, items: any[]) => {
  try {
    // 1. Actualizar estado de la orden
    await updateDoc(doc(db, 'purchaseOrders', orderId), {
      status: 'RECEIVED',
      receivedAt: Timestamp.now()
    });

    // 2. Sumar stock a cada item
    for (const item of items) {
      const itemRef = doc(db, 'items', item.itemId);
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        await updateDoc(itemRef, {
          stock: itemDoc.data().stock + item.quantity,
          updatedAt: Timestamp.now()
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `purchaseOrders/${orderId}`);
  }
};

export const completeProductionOrder = async (
  orderId: string, 
  productId: string, 
  quantity: number, 
  materials: any[], 
  variantValues?: Record<string, string>
) => {
  try {
    // 1. Actualizar estado de la orden
    await updateDoc(doc(db, 'productionOrders', orderId), {
      status: 'COMPLETED',
      completedAt: Timestamp.now()
    });

    // 2. Sumar stock al producto final
    const productRef = doc(db, 'items', productId);
    const productDoc = await getDoc(productRef);
    if (productDoc.exists()) {
      const data = productDoc.data();
      const updates: any = {
        stock: data.stock + quantity,
        updatedAt: Timestamp.now()
      };

      // Manejar variantes si existen
      if (variantValues) {
        const variantKey = Object.entries(variantValues)
          .map(([k, v]) => `${k}:${v}`)
          .join('|');
        
        const variantStock = data.variantStock || {};
        variantStock[variantKey] = (variantStock[variantKey] || 0) + quantity;
        updates.variantStock = variantStock;
      }

      await updateDoc(productRef, updates);
    }

    // 3. Descontar materiales
    for (const mat of materials) {
      const matRef = doc(db, 'items', mat.itemId);
      const matDoc = await getDoc(matRef);
      if (matDoc.exists()) {
        await updateDoc(matRef, {
          stock: matDoc.data().stock - (mat.quantity * quantity),
          updatedAt: Timestamp.now()
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `productionOrders/${orderId}`);
  }
};
