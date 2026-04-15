import React from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Factory, 
  ClipboardList,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreVertical,
  Trash2,
  X,
  Edit2,
  Search,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeToCollection, addProductionOrder, completeProductionOrder, addBOM, updateBOM, deleteBOM, deleteProductionOrder, updateItem, updateProductionOrder, addItem } from '@/lib/db';
import { db } from '@/lib/firebase';
import { updateDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { ProductionOrder, Item, BOM, BOMItem, Category } from '@/types';
import { toast } from 'sonner';
import { Products } from '@/components/inventory/Products';
import { useSettings } from '@/lib/SettingsContext';

function MaterialSelect({ 
  value, 
  materials, 
  selectedMaterial, 
  onValueChange 
}: { 
  value: string | undefined; 
  materials: Item[]; 
  selectedMaterial: Item | undefined; 
  onValueChange: (val: string) => void;
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  return (
    <Select 
      value={value} 
      onValueChange={onValueChange}
    >
      <SelectTrigger className="bg-white h-8 text-[11px]">
        <SelectValue placeholder="Materia Prima">
          {selectedMaterial?.name || "Materia Prima"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[300px]">
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <Input 
              placeholder="Filtrar..." 
              className="pl-7 h-7 text-[10px] bg-slate-50 border-none focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <SelectItem value="CREATE_NEW" className="text-blue-600 font-bold text-[11px]">
          <Plus className="h-3 w-3 mr-2 inline" /> Nueva
        </SelectItem>
        <div className="max-h-[200px] overflow-y-auto">
          {materials
            .filter(m => !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(m => (
              <SelectItem key={m.id} value={m.id} className="text-[11px]">{m.name}</SelectItem>
            ))
          }
        </div>
      </SelectContent>
    </Select>
  );
}

export function Production({ activeTab = 'boms' }: { activeTab?: string }) {
  const { settings } = useSettings();
  const [orders, setOrders] = React.useState<ProductionOrder[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [boms, setBoms] = React.useState<BOM[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false);
  const [isBOMModalOpen, setIsBOMModalOpen] = React.useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = React.useState(false);
  const [pendingBomMaterialIndex, setPendingBomMaterialIndex] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingBOM, setEditingBOM] = React.useState<BOM | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<ProductionOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = React.useState<string | null>(null);
  const [bomToDelete, setBomToDelete] = React.useState<string | null>(null);

  // Form states
  const [orderForm, setOrderForm] = React.useState({
    productId: '',
    quantity: 1,
    deliveryDate: '',
    status: 'PLANNED' as ProductionOrder['status'],
    variantValues: {} as Record<string, string>,
    selectedMaterials: [] as BOMItem[]
  });

  const [materialForm, setMaterialForm] = React.useState({
    name: '',
    category: '',
    unit: 'unidad',
    stock: 0,
    minStock: 0,
    cost: 0
  });

  const [bomSearchTerms, setBomSearchTerms] = React.useState<Record<number, string>>({});

  const [bomForm, setBomForm] = React.useState<{
    productId: string;
    productName: string;
    materials: BOMItem[];
  }>({
    productId: '',
    productName: '',
    materials: [{ itemId: '', quantity: 0, isVariable: false }]
  });

  React.useEffect(() => {
    const unsubOrders = subscribeToCollection('productionOrders', setOrders);
    const unsubItems = subscribeToCollection('items', setItems);
    const unsubBoms = subscribeToCollection('boms', setBoms);
    const unsubCategories = subscribeToCollection('categories', setCategories);
    
    setLoading(false);
    return () => {
      unsubOrders();
      unsubItems();
      unsubBoms();
      unsubCategories();
    };
  }, []);

  const handleStartOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'productionOrders', orderId), {
        status: 'IN_PROGRESS'
      });
      toast.success('Producción iniciada');
    } catch (error) {
      toast.error('Error al iniciar la producción');
    }
  };

  const handleCompleteOrder = async (order: ProductionOrder) => {
    const bom = boms.find(b => b.productId === order.productId);
    if (!bom) {
      toast.error('No hay receta definida para este producto');
      return;
    }
    
    // Use selectedMaterials if available, otherwise use BOM materials
    const materialsToDeduct = order.selectedMaterials || bom.materials;

    // Validar stock de materiales antes de completar
    for (const mat of materialsToDeduct) {
      const material = items.find(i => i.id === mat.itemId);
      if (!material || material.stock < (mat.quantity * order.quantity)) {
        toast.error(`Stock insuficiente de ${material?.name || 'material'}`);
        return;
      }
    }

    try {
      await completeProductionOrder(
        order.id, 
        order.productId, 
        order.quantity, 
        materialsToDeduct,
        order.variantValues
      );
      toast.success('Producción completada y stock actualizado');
    } catch (error) {
      toast.error('Error al completar la producción');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.productId) {
      toast.error('Selecciona un producto');
      return;
    }

    const product = items.find(i => i.id === orderForm.productId);
    if (product?.hasVariants && product.attributes) {
      for (const attr of product.attributes) {
        if (!orderForm.variantValues[attr]) {
          toast.error(`Define el valor para ${attr}`);
          return;
        }
      }
    }

    const bom = boms.find(b => b.productId === orderForm.productId);
    if (bom) {
      for (const mat of orderForm.selectedMaterials) {
        if (mat.isVariable && !mat.itemId) {
          const categoryName = categories.find(c => c.id === mat.category)?.name || 'Variable';
          toast.error(`Selecciona el material para el grupo: ${categoryName}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        productId: orderForm.productId,
        quantity: orderForm.quantity,
        deliveryDate: orderForm.deliveryDate,
        status: orderForm.status,
        variantValues: orderForm.variantValues,
        selectedMaterials: orderForm.selectedMaterials,
        date: editingOrder ? editingOrder.date : new Date().toISOString()
      };

      if (editingOrder) {
        await updateProductionOrder(editingOrder.id, orderData);
        toast.success('Orden de producción actualizada');
      } else {
        await addProductionOrder(orderData);
        toast.success('Orden de producción creada');
      }
      setIsOrderModalOpen(false);
      setEditingOrder(null);
      setOrderForm({ productId: '', quantity: 1, deliveryDate: '', status: 'PLANNED', variantValues: {}, selectedMaterials: [] });
    } catch (error) {
      toast.error('Error al guardar la orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrder = (order: ProductionOrder) => {
    setEditingOrder(order);
    setOrderForm({
      productId: order.productId,
      quantity: order.quantity,
      deliveryDate: order.deliveryDate || '',
      status: order.status,
      variantValues: order.variantValues || {},
      selectedMaterials: order.selectedMaterials || []
    });
    setIsOrderModalOpen(true);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await addItem({
        ...materialForm,
        type: 'MATERIAL',
        variantStock: {}
      });
      toast.success('Materia prima creada');
      setIsMaterialModalOpen(false);
      setMaterialForm({ name: '', category: '', unit: 'unidad', stock: 0, minStock: 0, cost: 0 });
      
      if (pendingBomMaterialIndex !== null && res?.id) {
        updateMaterialInForm(pendingBomMaterialIndex, 'itemId', res.id);
        setPendingBomMaterialIndex(null);
      }
    } catch (error) {
      toast.error('Error al crear materia prima');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomForm.productId && !bomForm.productName) {
      toast.error('Selecciona o ingresa un nombre para el producto');
      return;
    }
    if (bomForm.materials.some(m => (!m.isVariable && !m.itemId) || (m.isVariable && !m.category) || m.quantity <= 0)) {
      toast.error('Completa todos los materiales (o grupos) y cantidades');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalProductId = bomForm.productId;

      // Calculate total cost
      let totalCost = 0;
      for (const mat of bomForm.materials) {
        if (!mat.isVariable) {
          const material = items.find(i => i.id === mat.itemId);
          if (material) {
            totalCost += (material.cost || 0) * mat.quantity;
          }
        }
      }

      if (finalProductId && bomForm.productName) {
        // Update existing product name and cost
        // Check if product exists before updating
        const productRef = doc(db, 'items', finalProductId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          await updateItem(finalProductId, {
            name: bomForm.productName,
            cost: totalCost,
            hasVariants: bomForm.materials.some(m => m.isVariable),
            attributes: bomForm.materials.filter(m => m.isVariable).map(m => categories.find(c => c.id === m.category)?.name || m.category || 'Variante')
          });
        } else {
          // If it doesn't exist, recreate it
          await setDoc(productRef, {
            name: bomForm.productName,
            type: 'PRODUCT',
            unit: 'unidad',
            stock: 0,
            minStock: 0,
            cost: totalCost,
            hasVariants: bomForm.materials.some(m => m.isVariable),
            attributes: bomForm.materials.filter(m => m.isVariable).map(m => categories.find(c => c.id === m.category)?.name || m.category || 'Variante'),
            variantStock: {},
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      } else if (!finalProductId && bomForm.productName) {
        // Check if a product with this name already exists to avoid duplicates
        const existingProduct = products.find(p => p.name.toLowerCase() === bomForm.productName.toLowerCase());
        
        if (existingProduct) {
          finalProductId = existingProduct.id;
          await updateItem(finalProductId, {
            cost: totalCost,
            hasVariants: bomForm.materials.some(m => m.isVariable),
            attributes: bomForm.materials.filter(m => m.isVariable).map(m => categories.find(c => c.id === m.category)?.name || m.category || 'Variante')
          });
        } else {
          // Create new product
          const newProduct = {
            name: bomForm.productName,
            type: 'PRODUCT' as const,
            unit: 'unidad',
            stock: 0,
            minStock: 0,
            cost: totalCost,
            hasVariants: bomForm.materials.some(m => m.isVariable),
            attributes: bomForm.materials.filter(m => m.isVariable).map(m => categories.find(c => c.id === m.category)?.name || m.category || 'Variante'),
            variantStock: {}
          };
          const res = await addItem(newProduct);
          finalProductId = res?.id || '';
        }
      }

      const finalBomForm = { productId: finalProductId, materials: bomForm.materials };

      if (editingBOM) {
        await updateBOM(editingBOM.id, finalBomForm);
        toast.success('Receta actualizada');
      } else {
        await addBOM(finalBomForm);
        toast.success('Receta creada');
      }
      
      // Update product cost based on BOM if it was an existing product and name wasn't updated (already handled above if name was updated)
      if (bomForm.productId && !bomForm.productName) {
        const product = items.find(i => i.id === bomForm.productId);
        if (product && totalCost >= 0) {
          const productRef = doc(db, 'items', product.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            await updateItem(product.id, { cost: totalCost });
          }
        }
      }

      setIsBOMModalOpen(false);
      setEditingBOM(null);
      setBomForm({ productId: '', productName: '', materials: [{ itemId: '', quantity: 0, isVariable: false }] });
    } catch (error) {
      toast.error('Error al guardar la receta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBOM = async () => {
    if (!bomToDelete) return;
    try {
      await deleteBOM(bomToDelete);
      toast.success('Receta eliminada');
    } catch (error) {
      toast.error('Error al eliminar la receta');
    } finally {
      setBomToDelete(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await deleteProductionOrder(orderToDelete);
      toast.success('Orden eliminada');
    } catch (error) {
      toast.error('Error al eliminar la orden');
    } finally {
      setOrderToDelete(null);
    }
  };

  const addMaterialToForm = () => {
    setBomForm(prev => ({
      ...prev,
      materials: [...prev.materials, { itemId: '', category: '', quantity: 0, isVariable: false }]
    }));
  };

  const removeMaterialFromForm = (index: number) => {
    setBomForm(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const updateMaterialInForm = (index: number, fieldOrUpdates: keyof BOMItem | Partial<BOMItem>, value?: any) => {
    setBomForm(prev => {
      const newMaterials = [...prev.materials];
      if (typeof fieldOrUpdates === 'string') {
        newMaterials[index] = { ...newMaterials[index], [fieldOrUpdates]: value };
      } else {
        newMaterials[index] = { ...newMaterials[index], ...fieldOrUpdates };
      }
      return { ...prev, materials: newMaterials };
    });
  };

  const products = items.filter(i => i.type === 'PRODUCT');
  const materials = items.filter(i => i.type === 'MATERIAL');

  return (
    <div className="space-y-6">
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Órdenes para Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => new Date(o.date).toDateString() === new Date().toDateString()).length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Programadas para hoy</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Promedio Diario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {orders.length > 0 ? (orders.length / Math.max(1, Math.ceil((new Date().getTime() - Math.min(...orders.map(o => new Date(o.date).getTime()))) / (1000 * 60 * 60 * 24)))).toFixed(1) : 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Órdenes por día</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Costo Total en Proceso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {settings.currency}{orders.filter(o => o.status === 'IN_PROGRESS').reduce((acc, o) => acc + (items.find(i => i.id === o.productId)?.cost || 0) * o.quantity, 0).toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Valor de producción activa</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Órdenes de Producción</h2>
              <p className="text-slate-500 text-sm">Gestiona y realiza seguimiento de las órdenes de fabricación.</p>
            </div>
            <div className="flex gap-2">
            <Dialog open={isOrderModalOpen} onOpenChange={(open) => {
              setIsOrderModalOpen(open);
              if (!open) {
                setEditingOrder(null);
                setOrderForm({ productId: '', quantity: 1, deliveryDate: '', status: 'PLANNED', variantValues: {}, selectedMaterials: [] });
              }
            }}>
              <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
                <Plus className="mr-2 h-4 w-4" /> Nueva Orden
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingOrder ? 'Editar Orden de Producción' : 'Nueva Orden de Producción'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitOrder} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Producto a Fabricar</Label>
                      <Select 
                        value={orderForm.productId} 
                        onValueChange={(val) => {
                          const bom = boms.find(b => b.productId === val);
                          setOrderForm(prev => ({ 
                            ...prev, 
                            productId: val,
                            variantValues: {},
                            selectedMaterials: bom ? bom.materials.map(m => ({ ...m })) : []
                          }));
                        }}
                        disabled={!!editingOrder}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto">
                            {orderForm.productId ? products.find(p => p.id === orderForm.productId)?.name : "Selecciona un producto"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {products.filter(p => boms.some(b => b.productId === p.id)).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input 
                        type="number" 
                        value={orderForm.quantity} 
                        onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                        min={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fecha de Entrega</Label>
                      <Input 
                        type="date" 
                        value={orderForm.deliveryDate} 
                        onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                      />
                    </div>

                    {editingOrder && (
                      <div className="space-y-2 col-span-2">
                        <Label>Estado</Label>
                        <Select 
                          value={orderForm.status} 
                          onValueChange={(val: any) => setOrderForm(prev => ({ ...prev, status: val }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLANNED">Planificada</SelectItem>
                            <SelectItem value="IN_PROGRESS">En Proceso</SelectItem>
                            <SelectItem value="COMPLETED">Completada</SelectItem>
                            <SelectItem value="CANCELLED">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {orderForm.productId && items.find(i => i.id === orderForm.productId)?.hasVariants && (
                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Label className="text-xs font-bold text-blue-700 uppercase">Definir Variantes</Label>
                      {items.find(i => i.id === orderForm.productId)?.attributes?.map(attr => (
                        <div key={attr} className="space-y-1">
                          <Label className="text-xs">{attr}</Label>
                          <Input 
                            placeholder={`Ej: ${attr === 'Esencia' ? 'Lavanda' : 'Rojo'}`}
                            value={orderForm.variantValues[attr] || ''}
                            onChange={(e) => setOrderForm(prev => ({
                              ...prev,
                              variantValues: { ...prev.variantValues, [attr]: e.target.value }
                            }))}
                            className="h-8 bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {orderForm.productId && orderForm.selectedMaterials.some(m => m.isVariable) && (
                    <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <Label className="text-xs font-bold text-amber-700 uppercase">Seleccionar Materiales Variables</Label>
                      {orderForm.selectedMaterials.map((mat, idx) => {
                        if (!mat.isVariable) return null;
                        return (
                          <div key={idx} className="space-y-1">
                            <Label className="text-xs">{mat.category ? categories.find(c => c.id === mat.category)?.name : 'Material Variable'}</Label>
                            <Select 
                              value={mat.itemId || ''} 
                              onValueChange={(val) => {
                                const newMats = [...orderForm.selectedMaterials];
                                newMats[idx].itemId = val;
                                setOrderForm(prev => ({ ...prev, selectedMaterials: newMats }));
                              }}
                            >
                              <SelectTrigger className="h-8 bg-white">
                                <SelectValue placeholder="Selecciona...">
                                  {mat.itemId ? materials.find(m => m.id === mat.itemId)?.name : "Selecciona..."}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {materials.filter(m => !mat.category || m.category === mat.category).map(m => (
                                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input 
                      type="number" 
                      value={orderForm.quantity} 
                      onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                      min={1}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Crear Orden
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Entrega</TableHead>
                    <TableHead className="font-semibold text-slate-700">Producto</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Cantidad</TableHead>
                    <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const product = items.find(i => i.id === order.productId);
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-slate-500 text-sm">
                          {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Sin fecha'}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {product?.name || 'Producto eliminado'}
                          {order.variantValues && Object.keys(order.variantValues).length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {Object.entries(order.variantValues).map(([k, v]) => (
                                <Badge key={k} variant="outline" className="text-[10px] py-0 px-1 border-blue-100 text-blue-600 bg-blue-50">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{order.quantity} {product?.unit}</TableCell>
                        <TableCell>
                          {order.status === 'COMPLETED' && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Completada
                            </Badge>
                          )}
                          {order.status === 'IN_PROGRESS' && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                              <Play className="mr-1 h-3 w-3" /> En Proceso
                            </Badge>
                          )}
                          {order.status === 'PLANNED' && (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">
                              Planificada
                            </Badge>
                          )}
                          {order.status === 'CANCELLED' && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                              Cancelada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          {order.status === 'IN_PROGRESS' ? (
                            <Button 
                              onClick={() => handleCompleteOrder(order)}
                              variant="outline" 
                              size="sm" 
                              className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                              Finalizar
                            </Button>
                          ) : order.status === 'PLANNED' ? (
                            <Button 
                              onClick={() => handleStartOrder(order.id)}
                              variant="outline" 
                              size="sm" 
                              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              Iniciar
                            </Button>
                          ) : null}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => setOrderToDelete(order.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>

                      </TableRow>
                    );
                  })}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">No hay órdenes de producción</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'boms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recetas (BOM)</h2>
              <p className="text-slate-500 text-sm">Configura las recetas y materiales necesarios para cada producto.</p>
            </div>
            
            <Dialog open={isBOMModalOpen} onOpenChange={(open) => {
              setIsBOMModalOpen(open);
              if (!open) {
                setEditingBOM(null);
                setBomForm({ productId: '', productName: '', materials: [{ itemId: '', category: '', quantity: 0, isVariable: false }] });
              }
            }}>
              <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
                <Plus className="mr-2 h-4 w-4" /> Nueva Receta
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBOM ? 'Editar Receta' : 'Nueva Receta (BOM)'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitBOM} className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre del Producto Final</Label>
                      <Input 
                        placeholder="Ej: Vela Tenesse" 
                        value={bomForm.productName || ''} 
                        onChange={(e) => setBomForm(prev => ({ ...prev, productName: e.target.value }))}
                      />
                      <p className="text-xs text-slate-500">Este nombre se usará para crear o identificar el producto final.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                      <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Materiales y Cantidades</Label>
                      
                      <div className="space-y-2">
                        {bomForm.materials.map((mat, index) => {
                          const selectedMaterial = materials.find(m => m.id === mat.itemId);
                          const selectedCategory = categories.find(c => c.id === mat.category);
                          
                          return (
                            <div key={index} className="bg-slate-50 p-2 rounded-lg border border-slate-100 relative group">
                              <div className="flex gap-2 items-center">
                                {/* Tipo */}
                                <div className="w-24 shrink-0">
                                  <div className="flex bg-slate-200/50 p-0.5 rounded-md h-8">
                                    <button
                                      type="button"
                                      onClick={() => updateMaterialInForm(index, { isVariable: false, category: '' })}
                                      className={cn(
                                        "flex-1 text-[9px] font-bold uppercase rounded-sm transition-all",
                                        !mat.isVariable ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                      )}
                                    >
                                      Fijo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateMaterialInForm(index, { isVariable: true, itemId: '' })}
                                      className={cn(
                                        "flex-1 text-[9px] font-bold uppercase rounded-sm transition-all",
                                        mat.isVariable ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                      )}
                                    >
                                      Var.
                                    </button>
                                  </div>
                                </div>

                                {/* Material / Grupo */}
                                <div className="flex-1 min-w-0">
                                  {!mat.isVariable ? (
                                    <div key={`fixed-${index}`}>
                                      <MaterialSelect 
                                        value={mat.itemId || undefined}
                                        materials={materials}
                                        selectedMaterial={selectedMaterial}
                                        onValueChange={(val) => {
                                          if (val === 'CREATE_NEW') {
                                            setPendingBomMaterialIndex(index);
                                            setIsMaterialModalOpen(true);
                                          } else {
                                            updateMaterialInForm(index, 'itemId', val);
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div key={`variable-${index}`}>
                                      <Select 
                                        value={mat.category || undefined} 
                                        onValueChange={(val) => updateMaterialInForm(index, 'category', val)}
                                      >
                                        <SelectTrigger className="bg-white h-8 text-[11px]">
                                          <SelectValue placeholder="Grupo">
                                            {selectedCategory?.name || "Grupo"}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="min-w-[200px]">
                                          {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="text-[11px]">{c.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>

                                {/* Medida (Unidad) */}
                                <div className="w-20 shrink-0">
                                  <div className="h-8 flex items-center px-2 bg-slate-100 rounded border border-slate-200 text-[10px] font-medium text-slate-500 truncate">
                                    {mat.isVariable ? (selectedCategory?.unit || 'Var.') : (selectedMaterial?.unit || '-')}
                                  </div>
                                </div>

                                {/* Cantidad */}
                                <div className="w-20 shrink-0">
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="Cant."
                                    value={mat.quantity || ''} 
                                    onChange={(e) => updateMaterialInForm(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="bg-white h-8 text-[11px] text-right"
                                  />
                                </div>

                                {/* Eliminar */}
                                {bomForm.materials.length > 1 && (
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removeMaterialFromForm(index)}
                                    className="text-slate-300 hover:text-red-500 h-8 w-8 shrink-0"
                                  >
                                    <X size={14} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <Button type="button" variant="outline" size="sm" onClick={addMaterialToForm} className="w-full text-blue-600 border-blue-100 bg-blue-50/50 hover:bg-blue-50 h-9">
                        <Plus className="h-4 w-4 mr-1" /> Añadir Material
                      </Button>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingBOM ? 'Guardar Cambios' : 'Crear Receta'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boms.map((bom) => {
              const product = items.find(i => i.id === bom.productId);
              return (
                <Card key={bom.id} className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-bold text-slate-900">{product?.name || 'Producto eliminado'}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-400 hover:text-red-600"
                      onClick={() => setBomToDelete(bom.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Materiales Requeridos</p>
                      {bom.materials.map((mat, idx) => {
                        const material = items.find(i => i.id === mat.itemId);
                        const category = categories.find(c => c.id === mat.category);
                        return (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                              <span className="text-slate-600">
                                {mat.isVariable ? (
                                  <span className="font-semibold text-amber-600">Variable: {category?.name || 'Grupo'}</span>
                                ) : (
                                  material?.name || 'Material eliminado'
                                )}
                              </span>
                              {mat.isVariable && <span className="text-[10px] text-slate-400 italic">Se elige al crear orden</span>}
                            </div>
                            <span className="font-medium text-slate-900">{mat.quantity} {material?.unit || ''}</span>
                          </div>
                        );
                      })}
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingBOM(bom);
                        setBomForm({
                          productId: bom.productId,
                          productName: product?.name || '',
                          materials: bom.materials
                        });
                        setIsBOMModalOpen(true);
                      }}
                      variant="ghost" 
                      className="w-full mt-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-bold"
                    >
                      EDITAR RECETA
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {boms.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500">No hay recetas configuradas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-4">
          <Products hideHeader={false} />
        </div>
      )}

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la orden de producción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bomToDelete} onOpenChange={(open) => !open && setBomToDelete(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la receta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBOM} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isMaterialModalOpen} onOpenChange={setIsMaterialModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Materia Prima</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMaterial} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input 
                required 
                value={materialForm.name}
                onChange={e => setMaterialForm({...materialForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría / Grupo</Label>
              <Select 
                value={materialForm.category} 
                onValueChange={(val) => setMaterialForm({...materialForm, category: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input 
                  required 
                  value={materialForm.unit}
                  onChange={e => setMaterialForm({...materialForm, unit: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Costo</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  required 
                  value={materialForm.cost}
                  onChange={e => setMaterialForm({...materialForm, cost: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Crear Materia Prima
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
