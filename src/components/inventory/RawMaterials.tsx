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
  Copy,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeToCollection, addItem, updateItem, deleteItem, addCategory, deleteCategory, updateCategory } from '@/lib/db';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Item, Category } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function RawMaterials() {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [newCategoryUnit, setNewCategoryUnit] = React.useState('');
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<keyof Item>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  
  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    category: '',
    type: 'MATERIAL' as const,
    unit: 'kg',
    stock: 0,
    minStock: 0,
    cost: 0,
    price: 0,
    hasVariants: false,
    attributes: [] as string[]
  });

  const [costCalc, setCostCalc] = React.useState({
    totalPrice: 0,
    totalQuantity: 1
  });

  React.useEffect(() => {
    const unsubItems = subscribeToCollection('items', (data) => {
      setItems(data.filter(item => item.type === 'MATERIAL'));
      setLoading(false);
    });
    const unsubCategories = subscribeToCollection('categories', (data) => {
      setCategories(data);
    });
    return () => {
      unsubItems();
      unsubCategories();
    };
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: newCategoryName, unit: newCategoryUnit });
        toast.success('Categoría actualizada');
      } else {
        await addCategory({ name: newCategoryName, type: 'MATERIAL', unit: newCategoryUnit });
        toast.success('Categoría agregada');
      }
      setNewCategoryName('');
      setNewCategoryUnit('');
      setEditingCategory(null);
    } catch (error) {
      toast.error('Error al procesar categoría');
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryUnit(cat.unit || '');
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete);
      toast.success('Categoría eliminada');
    } catch (error) {
      toast.error('Error al eliminar categoría');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error('Debes asignar una categoría');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const itemRef = doc(db, 'items', editingItem.id);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          await updateItem(editingItem.id, formData);
          toast.success('Materia prima actualizada correctamente');
        } else {
          toast.error('La materia prima ya no existe');
        }
      } else {
        await addItem({
          ...formData,
          variantStock: {}
        });
        toast.success('Materia prima agregada correctamente');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({
        name: '',
        category: '',
        type: 'MATERIAL',
        unit: 'kg',
        stock: 0,
        minStock: 0,
        cost: 0,
        price: 0,
        hasVariants: false,
        attributes: []
      });
    } catch (error) {
      toast.error('Error al procesar la materia prima');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || '',
      type: item.type,
      unit: item.unit,
      stock: item.stock,
      minStock: item.minStock,
      cost: item.cost,
      price: item.price || 0,
      hasVariants: item.hasVariants || false,
      attributes: item.attributes || []
    });
    setCostCalc({
      totalPrice: item.cost,
      totalQuantity: 1
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (item: Item) => {
    setEditingItem(null);
    setFormData({
      name: `${item.name} (Copia)`,
      category: item.category || '',
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
      toast.success('Materia prima eliminada correctamente');
    } catch (error) {
      toast.error('Error al eliminar la materia prima');
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

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Materias Primas</h2>
          <p className="text-slate-500 text-sm">Gestiona el inventario de tus insumos.</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
            <DialogTrigger render={<Button variant="outline" className="border-slate-200">Gestionar Categorías</Button>} />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Categorías de Materias Primas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <form onSubmit={handleAddCategory} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input 
                      placeholder={editingCategory ? "Editar nombre..." : "Nueva categoría..."} 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <Input 
                      placeholder="Unidad (ej. gramos)" 
                      value={newCategoryUnit}
                      onChange={(e) => setNewCategoryUnit(e.target.value)}
                      className="w-32"
                    />
                    <Button type="submit" variant="secondary">
                      {editingCategory ? 'Actualizar' : 'Agregar'}
                    </Button>
                    {editingCategory && (
                      <Button type="button" variant="ghost" onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setNewCategoryUnit('');
                      }}>X</Button>
                    )}
                  </div>
                </form>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{cat.name}</span>
                        {cat.unit && <span className="text-xs text-slate-500">Unidad: {cat.unit}</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditCategory(cat)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setCategoryToDelete(cat.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No hay categorías creadas.</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingItem(null);
            setFormData({
              name: '',
              category: '',
              type: 'MATERIAL',
              unit: 'kg',
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
            <Plus className="mr-2 h-4 w-4" /> Nueva Materia Prima
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Materia Prima' : 'Agregar Nueva Materia Prima'}</DialogTitle>
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
                <div className="space-y-2 col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category">Categoría / Grupo</Label>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="h-auto p-0 text-xs text-blue-600"
                      onClick={() => setIsCategoryModalOpen(true)}
                    >
                      + Nueva categoría
                    </Button>
                  </div>
                  <Select 
                    value={formData.category} 
                    onValueChange={(val) => setFormData({...formData, category: val})}
                    required
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidad de Medida</Label>
                  <Input 
                    id="unit" 
                    required 
                    placeholder="Ej: gramo, ml, unidad"
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
                <div className="space-y-2 col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Cálculo de Costo por {formData.unit || 'unidad'}</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Precio Pagado ({settings.currency})</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={costCalc.totalPrice === 0 ? '' : costCalc.totalPrice}
                        onChange={e => {
                          const price = e.target.value === '' ? 0 : Number(e.target.value);
                          setCostCalc(prev => ({ ...prev, totalPrice: price }));
                          setFormData(prev => ({ ...prev, cost: price / (costCalc.totalQuantity || 1) }));
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Cantidad de {formData.unit || 'unidades'}</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={costCalc.totalQuantity === 0 ? '' : costCalc.totalQuantity}
                        onChange={e => {
                          const qty = e.target.value === '' ? 1 : Number(e.target.value);
                          setCostCalc(prev => ({ ...prev, totalQuantity: qty }));
                          setFormData(prev => ({ ...prev, cost: costCalc.totalPrice / (qty || 1) }));
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-medium">COSTO POR {formData.unit?.toUpperCase() || 'UNIDAD'}:</span>
                    <span className="text-sm font-bold text-blue-600">{settings.currency}{formData.cost.toFixed(4)}</span>
                  </div>
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
                placeholder="Buscar materia prima..." 
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
                        <div className="flex items-center">Materia Prima <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('category')}>
                        <div className="flex items-center">Categoría <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('stock')}>
                        <div className="flex items-center justify-end">Stock <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('cost')}>
                        <div className="flex items-center justify-end">Costo <ArrowUpDown className="ml-2 h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">
                        Capital
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.unit}</div>
                        </TableCell>
                        <TableCell>
                          {item.category && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                              {categories.find(c => c.id === item.category)?.name || item.category}
                            </Badge>
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
                        <TableCell className="text-right font-medium text-slate-900">
                          {settings.currency}{item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-700">
                          {settings.currency}{(item.stock * item.cost).toLocaleString()}
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
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">No se encontraron materias primas</TableCell>
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente la materia prima
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

      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
