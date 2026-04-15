import React from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  ShoppingCart, 
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Loader2,
  X,
  Trash2,
  Upload
} from 'lucide-react';
import { subscribeToCollection, addPurchaseOrder, receivePurchaseOrder, addItem, updateItem } from '@/lib/db';
import { PurchaseOrder, Item } from '@/types';
import { toast } from 'sonner';
import { useSettings } from '@/lib/SettingsContext';
import { GoogleGenAI } from "@google/genai";

export function Purchasing() {
  const { settings } = useSettings();
  const [orders, setOrders] = React.useState<PurchaseOrder[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    supplier: '',
    items: [{ name: '', quantity: 1, cost: 0 }]
  });

  const [reviewData, setReviewData] = React.useState<{
    newItems: { name: string, cost: number }[];
    costUpdates: { id: string, name: string, oldCost: number, newCost: number, selected: boolean }[];
  }>({ newItems: [], costUpdates: [] });

  React.useEffect(() => {
    const unsubOrders = subscribeToCollection('purchaseOrders', setOrders);
    const unsubItems = subscribeToCollection('items', setItems);
    
    setLoading(false);
    return () => {
      unsubOrders();
      unsubItems();
    };
  }, []);

  const handleNewOrder = () => {
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          const prompt = `
            You are an AI assistant that extracts purchase order information from receipts or lists.
            Extract the supplier name (if visible) and a list of items.
            For each item, extract the name, quantity (default to 1 if not specified), and unit cost (if specified, otherwise 0).
            Return the result as a JSON object with the following structure:
            {
              "supplier": "Supplier Name",
              "items": [
                { "name": "Item Name", "quantity": 1, "cost": 10.5 }
              ]
            }
            Only return the JSON, no markdown formatting.
          `;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: file.type,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json",
            }
          });

          const text = response.text;
          if (!text) {
            throw new Error("No response from Gemini");
          }

          const data = JSON.parse(text);
          
          setFormData(prev => ({
            supplier: data.supplier || prev.supplier,
            items: data.items && data.items.length > 0 ? data.items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity || 1,
              cost: item.cost || 0
            })) : prev.items
          }));
          
          toast.success('Ticket procesado correctamente');
        } catch (error) {
          console.error(error);
          toast.error('Error al procesar el ticket');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.onerror = () => {
        throw new Error('Error reading file');
      };
    } catch (error) {
      console.error(error);
      toast.error('Error al procesar el ticket');
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReceiveOrder = async (order: PurchaseOrder) => {
    try {
      await receivePurchaseOrder(order.id, order.items);
      toast.success(`Orden ${order.id.slice(-6)} marcada como recibida y stock actualizado`);
    } catch (error) {
      toast.error('Error al recibir la orden');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier) {
      toast.error('Ingresa el nombre del proveedor');
      return;
    }
    if (formData.items.some(i => !i.name || i.quantity <= 0)) {
      toast.error('Completa todos los items y cantidades');
      return;
    }

    const newItems: { name: string, cost: number }[] = [];
    const costUpdates: { id: string, name: string, oldCost: number, newCost: number, selected: boolean }[] = [];

    formData.items.forEach(formItem => {
      const existingItem = items.find(i => i.name.toLowerCase() === formItem.name.toLowerCase());
      if (!existingItem) {
        newItems.push({ name: formItem.name, cost: formItem.cost });
      } else if (existingItem.cost !== formItem.cost) {
        costUpdates.push({
          id: existingItem.id,
          name: existingItem.name,
          oldCost: existingItem.cost || 0,
          newCost: formItem.cost,
          selected: true
        });
      }
    });

    if (newItems.length > 0 || costUpdates.length > 0) {
      setReviewData({ newItems, costUpdates });
      setIsReviewOpen(true);
    } else {
      await finalizePurchaseOrder();
    }
  };

  const finalizePurchaseOrder = async () => {
    setIsSubmitting(true);
    try {
      const finalItems = [];

      // 1. Create new items
      for (const newItem of reviewData.newItems) {
        const docRef = await addItem({
          name: newItem.name,
          type: 'MATERIAL',
          unit: 'unidad',
          stock: 0,
          minStock: 0,
          cost: newItem.cost,
          price: 0,
          hasVariants: false,
          attributes: [],
          variantStock: {}
        });
        if (docRef) {
          finalItems.push({ itemId: docRef.id, quantity: formData.items.find(i => i.name === newItem.name)?.quantity || 1, cost: newItem.cost });
        }
      }

      // 2. Update costs
      for (const update of reviewData.costUpdates) {
        if (update.selected) {
          await updateItem(update.id, { cost: update.newCost });
        }
      }

      // 3. Map existing items
      for (const formItem of formData.items) {
        const existingItem = items.find(i => i.name.toLowerCase() === formItem.name.toLowerCase());
        if (existingItem) {
          finalItems.push({ itemId: existingItem.id, quantity: formItem.quantity, cost: formItem.cost });
        }
      }

      const total = finalItems.reduce((acc, i) => acc + (i.quantity * i.cost), 0);

      await addPurchaseOrder({
        supplier: formData.supplier,
        items: finalItems,
        date: new Date().toISOString(),
        status: 'PENDING',
        total
      });

      toast.success('Orden de compra creada');
      setIsModalOpen(false);
      setIsReviewOpen(false);
      setFormData({ supplier: '', items: [{ name: '', quantity: 1, cost: 0 }] });
      setReviewData({ newItems: [], costUpdates: [] });
    } catch (error) {
      toast.error('Error al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItemToForm = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, cost: 0 }]
    }));
  };

  const removeItemFromForm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemInForm = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleDownload = (id: string) => {
    toast.info(`Descargando PDF de la orden ${id.slice(-6)}`);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Compras</h2>
          <p className="text-slate-500 text-sm">Gestiona tus órdenes de compra a proveedores.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Orden
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Orden de Compra</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-blue-900">Carga Automática con IA</h4>
                <p className="text-xs text-blue-700">Sube una foto de tu ticket o listado y la IA extraerá los datos.</p>
              </div>
              <div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {isUploading ? 'Procesando...' : 'Subir Imagen'}
                </Button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Input 
                  id="supplier" 
                  value={formData.supplier} 
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Items de la Orden</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addItemToForm} className="text-blue-600 h-8">
                    <Plus className="h-4 w-4 mr-1" /> Añadir Item
                  </Button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-100 relative group">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Producto/Material</Label>
                      <Input 
                        list="items-list"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const existing = items.find(i => i.name.toLowerCase() === val.toLowerCase());
                          updateItemInForm(index, 'name', val);
                          if (existing && item.cost === 0) {
                            updateItemInForm(index, 'cost', existing.cost);
                          }
                        }}
                        placeholder="Escribe o selecciona..."
                        className="bg-white"
                      />
                      <datalist id="items-list">
                        {items.map(i => (
                          <option key={i.id} value={i.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="w-24 space-y-2">
                      <Label className="text-xs">Cant.</Label>
                      <Input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => updateItemInForm(index, 'quantity', parseFloat(e.target.value))}
                        className="bg-white"
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <Label className="text-xs">Costo Un.</Label>
                      <Input 
                        type="number" 
                        value={item.cost} 
                        onChange={(e) => updateItemInForm(index, 'cost', parseFloat(e.target.value))}
                        className="bg-white"
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItemFromForm(index)}
                        className="text-slate-400 hover:text-red-600 h-10 w-10"
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium opacity-70">Total Estimado</span>
                <span className="text-xl font-bold">
                  {settings.currency}{formData.items.reduce((acc, i) => acc + (i.quantity * i.cost), 0).toLocaleString()}
                </span>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Siguiente
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Revisión de Orden</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {reviewData.newItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Nuevos Items a Crear</h3>
                  <ul className="space-y-2">
                    {reviewData.newItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.name}</span>
                        <span className="font-medium text-slate-900">{settings.currency}{item.cost}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reviewData.costUpdates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Actualización de Costos</h3>
                  <ul className="space-y-2">
                    {reviewData.costUpdates.map((update, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={update.selected}
                            onChange={(e) => {
                              const newUpdates = [...reviewData.costUpdates];
                              newUpdates[idx].selected = e.target.checked;
                              setReviewData({ ...reviewData, costUpdates: newUpdates });
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-slate-600">{update.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 line-through">{settings.currency}{update.oldCost}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-medium text-amber-600">{settings.currency}{update.newCost}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsReviewOpen(false)}>Volver</Button>
              <Button onClick={finalizePurchaseOrder} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-400">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar y Crear Orden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Pendientes de Recibir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(po => po.status === 'PENDING').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Total Invertido (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {settings.currency}{orders.filter(po => po.status === 'RECEIVED').reduce((acc, po) => acc + po.total, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Órdenes Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Orden ID</TableHead>
                <TableHead className="font-semibold text-slate-700">Proveedor</TableHead>
                <TableHead className="font-semibold text-slate-700">Fecha</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Total</TableHead>
                <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((po) => (
                <TableRow key={po.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-600">{po.id.slice(-6)}</TableCell>
                  <TableCell className="font-medium text-slate-900">{po.supplier}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(po.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">{settings.currency}{po.total.toLocaleString()}</TableCell>
                  <TableCell>
                    {po.status === 'RECEIVED' && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Recibida
                      </Badge>
                    )}
                    {po.status === 'PENDING' && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                        <Clock className="mr-1 h-3 w-3" /> Pendiente
                      </Badge>
                    )}
                    {po.status === 'CANCELLED' && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                        <XCircle className="mr-1 h-3 w-3" /> Cancelada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleDownload(po.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <Download size={16} />
                      </Button>
                      {po.status === 'PENDING' && (
                        <Button 
                          onClick={() => handleReceiveOrder(po)}
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          Recibir
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">No hay órdenes de compra</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
