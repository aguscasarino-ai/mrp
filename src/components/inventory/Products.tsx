import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreVertical,
  Loader2,
  Edit2,
  Trash2,
  X,
  Copy,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Item } from '@/types';
import { subscribeToCollection, addItem, updateItem, deleteItem } from '@/lib/db';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSettings } from '@/lib/SettingsContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export function Products({ hideHeader = false }: { hideHeader?: boolean }) {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [items, setItems] = React.useState<Item[]>([]);
  const [allItems, setAllItems] = React.useState<Item[]>([]);
  const [boms, setBoms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<keyof Item>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  
  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    type: 'PRODUCT' as const,
    unit: 'unidad',
    stock: 0,
    minStock: 0,
    cost: 0,
    price: 0,
    hasVariants: false,
    attributes: [] as string[]
  });

  const [newAttribute, setNewAttribute] = React.useState('');

  React.useEffect(() => {
    const unsubItems = subscribeToCollection('items', (data) => {
      setAllItems(data);
      setItems(data.filter(item => item.type === 'PRODUCT'));
      setLoading(false);
    });
    const unsubBoms = subscribeToCollection('boms', (data) => {
      setBoms(data);
    });
    return () => {
      unsubItems();
      unsubBoms();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateItem(editingItem.id, formData);
        toast.success('Producto actualizado correctamente');
      } else {
        await addItem({
          ...formData,
          variantStock: {}
        });
        toast.success('Producto agregado correctamente');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({
        name: '',
        type: 'PRODUCT',
        unit: 'unidad',
        stock: 0,
        minStock: 0,
        cost: 0,
        price: 0,
        hasVariants: false,
        attributes: []
      });
    } catch (error) {
      toast.error('Error al procesar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      unit: item.unit,
      stock: item.stock,
      minStock: item.minStock,
      cost: item.cost,
      price: item.price || 0,
      hasVariants: item.hasVariants || false,
      attributes: item.attributes || []
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (item: Item) => {
    setEditingItem(null);
    setFormData({
      name: `${item.name} (Copia)`,
      type: item.type,
      unit: item.unit,
      stock: 0,
      minStock: item.minStock,
      cost: item.cost,
      price: item.price || 0,
      hasVariants: item.hasVariants || false,
      attributes: item.attributes || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItem(itemToDelete);
      toast.success('Producto eliminado correctamente');
    } catch (error) {
      toast.error('Error al eliminar el producto');
    } finally {
      setItemToDelete(null);
    }
  };

  const handleSort = (field: keyof Item) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const calculateCost = (productId: string) => {
    const bom = boms.find(b => b.productId === productId);
    if (!bom) return 0;
    return bom.materials.reduce((total: number, mat: any) => {
      if (mat.isVariable) return total;
      const material = allItems.find(i => i.id === mat.itemId);
      if (!material) return total;
      return total + (material.cost * mat.quantity);
    }, 0);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const aValue = sortField === 'cost' ? calculateCost(a.id) : (a[sortField] || '');
    const bValue = sortField === 'cost' ? calculateCost(b.id) : (b[sortField] || '');
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className={cn("flex items-center", hideHeader ? "justify-end" : "justify-between")}>
        {!hideHeader && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Stock Productos</h2>
            <p className="text-slate-500 text-sm">Gestiona el inventario de tus productos terminados.</p>
          </div>
        )}
        
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingItem(null);
            setFormData({
              name: '',
              type: 'PRODUCT',
              unit: 'unidad',
              stock: 0,
              minStock: 0,
              cost: 0,
              price: 0,
              hasVariants: false,
              attributes: []
            });
          }
        }}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Producto' : 'Agregar Nuevo Producto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input 
                    id="name" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidad</Label>
                  <Input 
                    id="unit" 
                    required 
                    placeholder="unidad, pack, etc"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Actual</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    required 
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value === '' ? 0 : Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock Mínimo</Label>
                  <Input 
                    id="minStock" 
                    type="number" 
                    min="0"
                    required 
                    value={formData.minStock}
                    onChange={e => setFormData({...formData, minStock: e.target.value === '' ? 0 : Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio Venta ($)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.price === 0 ? '' : formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Manejar Variantes</Label>
                      <p className="text-xs text-slate-500">Permite definir variables como esencia, color, etc.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formData.hasVariants} 
                      onChange={(e) => setFormData({...formData, hasVariants: e.target.checked})}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {formData.hasVariants && (
                    <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <Label className="text-xs font-bold uppercase text-slate-500">Variables Definidas</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.attributes.map((attr, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-white border-slate-200 pr-1">
                            {attr}
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 ml-1 hover:text-red-500"
                              onClick={() => setFormData({...formData, attributes: formData.attributes.filter((_, i) => i !== idx)})}
                            >
                              <X size={10} />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Ej: Esencia, Color..." 
                          value={newAttribute} 
                          onChange={(e) => setNewAttribute(e.target.value)}
                          className="h-8 bg-white"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={() => {
                            if (newAttribute && !formData.attributes.includes(newAttribute)) {
                              setFormData({...formData, attributes: [...formData.attributes, newAttribute]});
                              setNewAttribute('');
                            }
                          }}
                          className="h-8"
                        >
                          Añadir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-400">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingItem ? 'Actualizar' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar producto..." 
                className="pl-9 border-slate-200 focus:ring-blue-500 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="rounded-md border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                        <div className="flex items-center">Producto <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('stock')}>
                        <div className="flex items-center justify-end">Stock <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('cost')}>
                        <div className="flex items-center justify-end">Costo <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('price')}>
                        <div className="flex items-center justify-end">Precio Venta <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">Receta</TableHead>
                      <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="font-medium text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.unit}</div>
                            {item.hasVariants && item.attributes && (
                              <div className="flex gap-1 mt-1">
                                {item.attributes.map(attr => (
                                  <Badge key={attr} variant="outline" className="text-[10px] py-0 px-1 border-slate-200 text-slate-400">
                                    {attr}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={
                              item.stock <= item.minStock 
                                ? "text-red-600" 
                                : item.stock <= item.minStock * 1.5 
                                ? "text-amber-600" 
                                : "text-slate-900"
                            }>
                              {item.stock} {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-slate-600">{settings.currency}{calculateCost(item.id).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-blue-600">{settings.currency}{item.price?.toLocaleString()}</TableCell>
                          <TableCell>
                            {boms.some(b => b.productId === item.id) ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">Configurada</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 border-slate-200">Sin Receta</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.stock <= item.minStock ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Stock Bajo</Badge>
                            ) : item.stock <= item.minStock * 1.5 ? (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Stock Medio</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Disponible</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-md flex items-center justify-center transition-colors">
                                <MoreVertical size={16} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(item)} className="cursor-pointer">
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(item)} className="cursor-pointer">
                                  <Copy className="mr-2 h-4 w-4" />
                                  <span>Duplicar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setItemToDelete(item.id)} className="cursor-pointer text-red-600 focus:text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Eliminar</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {item.hasVariants && item.variantStock && Object.keys(item.variantStock).length > 0 && (
                          <TableRow className="bg-slate-50/30">
                            <TableCell colSpan={6} className="py-2 px-8">
                              <div className="flex flex-wrap gap-4">
                                {Object.entries(item.variantStock).map(([key, stock]) => (
                                  <div key={key} className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-400 font-medium">{key.replace('|', ', ')}:</span>
                                    <span className={cn("font-bold", (stock as number) <= 0 ? "text-red-500" : "text-slate-700")}>
                                      {stock as number} {item.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">No se encontraron productos</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el producto
              y todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
