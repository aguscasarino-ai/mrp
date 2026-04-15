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
  Receipt, 
  User,
  CheckCircle2,
  Download,
  DollarSign,
  TrendingUp,
  Loader2,
  X,
  Trash2
} from 'lucide-react';
import { subscribeToCollection, addSale } from '@/lib/db';
import { Sale, Item } from '@/types';
import { toast } from 'sonner';
import { useSettings } from '@/lib/SettingsContext';

export function Sales() {
  const { settings } = useSettings();
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    customer: '',
    items: [{ productId: '', quantity: 1, price: 0, variantValues: {} as Record<string, string> }]
  });

  React.useEffect(() => {
    const unsubSales = subscribeToCollection('sales', setSales);
    const unsubItems = subscribeToCollection('items', setItems);
    
    setLoading(false);
    return () => {
      unsubSales();
      unsubItems();
    };
  }, []);

  const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);

  const handleNewSale = () => {
    setIsModalOpen(true);
  };

  const handleDownload = (id: string) => {
    toast.info(`Descargando comprobante de venta ${id.slice(-6)}`);
  };

  const handleDetails = (id: string) => {
    toast.info(`Mostrando detalles de la venta ${id.slice(-6)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (formData.items.some(i => !i.productId || i.quantity <= 0)) {
      toast.error('Completa todos los productos y cantidades');
      return;
    }

    // Validar stock
    for (const saleItem of formData.items) {
      const product = items.find(i => i.id === saleItem.productId);
      if (!product) continue;

      if (product.hasVariants && saleItem.variantValues) {
        const variantKey = Object.values(saleItem.variantValues).join('-');
        const currentVariantStock = product.variantStock?.[variantKey] || 0;
        if (currentVariantStock < saleItem.quantity) {
          toast.error(`Stock insuficiente de ${product.name} (${variantKey})`);
          return;
        }
      } else if (product.stock < saleItem.quantity) {
        toast.error(`Stock insuficiente de ${product.name}`);
        return;
      }
    }

    const total = formData.items.reduce((acc, i) => acc + (i.quantity * i.price), 0);

    setIsSubmitting(true);
    try {
      await addSale({
        ...formData,
        date: new Date().toISOString(),
        status: 'COMPLETED',
        total
      });
      toast.success('Venta registrada con éxito');
      setIsModalOpen(false);
      setFormData({ customer: '', items: [{ productId: '', quantity: 1, price: 0, variantValues: {} }] });
    } catch (error) {
      toast.error('Error al registrar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItemToForm = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, price: 0, variantValues: {} }]
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
    const updatedItem = { ...newItems[index], [field]: value };
    
    // Auto-completar precio si se selecciona producto
    if (field === 'productId') {
      const product = items.find(i => i.id === value);
      if (product?.price) {
        updatedItem.price = product.price;
      }
      updatedItem.variantValues = {}; // Reset variants when product changes
    }
    
    newItems[index] = updatedItem;
    setFormData(prev => ({ ...prev, items: newItems }));
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ventas</h2>
          <p className="text-slate-500 text-sm">Registra tus ventas y gestiona la facturación a clientes.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Venta
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Venta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente</Label>
                <Input 
                  id="customer" 
                  value={formData.customer} 
                  onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Productos</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addItemToForm} className="text-blue-600 h-8">
                    <Plus className="h-4 w-4 mr-1" /> Añadir Producto
                  </Button>
                </div>
                
                {formData.items.map((item, index) => {
                  const selectedProduct = items.find(i => i.id === item.productId);
                  return (
                    <div key={index} className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100 relative group">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Producto</Label>
                          <Select 
                            value={item.productId} 
                            onValueChange={(val) => updateItemInForm(index, 'productId', val)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecciona">
                                {item.productId ? items.find(i => i.id === item.productId)?.name : "Selecciona"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {items.filter(i => i.type === 'PRODUCT').map(i => (
                                <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.stock})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Label className="text-xs">Precio</Label>
                          <Input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => updateItemInForm(index, 'price', parseFloat(e.target.value))}
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

                      {selectedProduct?.hasVariants && selectedProduct.attributes && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                          {selectedProduct.attributes.map(attr => (
                            <div key={attr} className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-500">{attr}</Label>
                              <Input 
                                placeholder={`Ej: ${attr === 'Esencia' ? 'Lavanda' : 'Rojo'}`}
                                value={item.variantValues?.[attr] || ''}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].variantValues = {
                                    ...(newItems[index].variantValues || {}),
                                    [attr]: e.target.value
                                  };
                                  setFormData({ ...formData, items: newItems });
                                }}
                                className="h-8 bg-white text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-emerald-900 text-white p-4 rounded-lg flex justify-between items-center shadow-lg">
                <span className="text-sm font-medium opacity-70">Total a Cobrar</span>
                <span className="text-xl font-bold">
                  {settings.currency}{formData.items.reduce((acc, i) => acc + (i.quantity * i.price), 0).toLocaleString()}
                </span>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Completar Venta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {settings.currency}{totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">Acumulado total</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Ventas Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{sales.length}</div>
            <p className="text-xs text-slate-500 mt-1">Órdenes completadas</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {settings.currency}{(totalRevenue / (sales.length || 1)).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">Por cada venta</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Venta ID</TableHead>
                <TableHead className="font-semibold text-slate-700">Cliente</TableHead>
                <TableHead className="font-semibold text-slate-700">Fecha</TableHead>
                <TableHead className="font-semibold text-slate-700">Items</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Total</TableHead>
                <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-600">{sale.id.slice(-6)}</TableCell>
                  <TableCell className="font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      {sale.customer}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(sale.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-600">
                      {sale.items.map((item, idx) => {
                        const product = items.find(i => i.id === item.productId);
                        return (
                          <div key={idx} className="mb-1">
                            <span className="font-medium">{item.quantity}x</span> {product?.name || 'Producto eliminado'}
                            {item.variantValues && Object.keys(item.variantValues).length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {Object.entries(item.variantValues).map(([k, v]) => (
                                  <span key={k} className="text-[9px] bg-slate-100 px-1 rounded text-slate-500 border border-slate-200">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">{settings.currency}{sale.total.toLocaleString()}</TableCell>
                  <TableCell>
                    {sale.status === 'COMPLETED' && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Completada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleDownload(sale.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <Download size={16} />
                      </Button>
                      <Button onClick={() => handleDetails(sale.id)} variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50">
                        Detalles
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">No hay ventas registradas</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
