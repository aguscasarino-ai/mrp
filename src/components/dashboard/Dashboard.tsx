import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Plus,
  Factory,
  ShoppingCart,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { subscribeToCollection } from '@/lib/db';
import { Item, ProductionOrder, Sale } from '@/types';
import { useSettings } from '@/lib/SettingsContext';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export function Dashboard({ setActiveTab }: DashboardProps) {
  const { settings } = useSettings();
  const [filter, setFilter] = React.useState('30days');
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');
  const [showLowStockOnly, setShowLowStockOnly] = React.useState(false);
  const [activeAlert, setActiveAlert] = React.useState<'none' | 'stock' | 'production' | 'sales'>('none');
  
  const [items, setItems] = React.useState<Item[]>([]);
  const [productionOrders, setProductionOrders] = React.useState<ProductionOrder[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubItems = subscribeToCollection('items', setItems);
    const unsubProduction = subscribeToCollection('productionOrders', setProductionOrders);
    const unsubSales = subscribeToCollection('sales', setSales);

    setLoading(false);
    return () => {
      unsubItems();
      unsubProduction();
      unsubSales();
    };
  }, []);
  
  const lowStockItems = items.filter(item => item.stock <= item.minStock);
  const pendingOrders = productionOrders.filter(order => order.status === 'IN_PROGRESS');
  
  // Filter data based on date
  const getFilteredSales = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    if (filter === 'custom') {
      if (customStartDate) startDate = new Date(customStartDate);
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      if (filter === '7days') startDate.setDate(now.getDate() - 7);
      else if (filter === '30days') startDate.setDate(now.getDate() - 30);
      else if (filter === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (filter === 'quarter') startDate.setMonth(now.getMonth() - 3);
      else if (filter === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    });
  };

  const filteredSales = getFilteredSales();
  const totalSales = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
  
  // Calculate total profit from filtered sales
  const totalProfit = filteredSales.reduce((acc, sale) => {
    const saleProfit = sale.items.reduce((itemAcc, item) => {
      const product = items.find(i => i.id === item.productId);
      const cost = product?.cost || 0;
      return itemAcc + (item.price - cost) * item.quantity;
    }, 0);
    return acc + saleProfit;
  }, 0);

  // Generate chart data for the last 7 days
  const chartData = React.useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push({
        date: d.toISOString().split('T')[0],
        name: days[d.getDay()],
        ventas: 0,
        ganancia: 0
      });
    }

    filteredSales.forEach(sale => {
      const saleDate = sale.date.split('T')[0];
      const dayData = last7Days.find(d => d.date === saleDate);
      if (dayData) {
        dayData.ventas += sale.total;
        const profit = sale.items.reduce((acc, item) => {
          const product = items.find(i => i.id === item.productId);
          return acc + (item.price - (product?.cost || 0)) * item.quantity;
        }, 0);
        dayData.ganancia += profit;
      }
    });

    return last7Days;
  }, [filteredSales, items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Resumen General</h2>
        <div className="flex flex-wrap items-center gap-3">
          {filter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500">a</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="month">Este mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Este año</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          onClick={() => setActiveAlert(activeAlert === 'sales' ? 'none' : 'sales')}
          className={cn(
            "border-slate-200 shadow-sm hover:border-emerald-200 transition-colors cursor-pointer",
            activeAlert === 'sales' && "ring-2 ring-emerald-500 border-emerald-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{settings.currency}{totalSales.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <ArrowUpRight size={12} />
              <span>{filteredSales.length} ventas en el periodo</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-slate-200 shadow-sm hover:border-blue-200 transition-colors cursor-pointer"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ganancia Bruta</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{settings.currency}{totalProfit.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
              <ArrowUpRight size={12} />
              <span>Margen estimado</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveAlert(activeAlert === 'stock' ? 'none' : 'stock')}
          className={cn(
            "border-slate-200 shadow-sm hover:border-amber-200 transition-colors cursor-pointer",
            activeAlert === 'stock' && "ring-2 ring-amber-500 border-amber-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Alertas Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowStockItems.length}</div>
            <p className="text-xs text-slate-500 mt-1">Items críticos</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveAlert(activeAlert === 'production' ? 'none' : 'production')}
          className={cn(
            "border-slate-200 shadow-sm hover:border-indigo-200 transition-colors cursor-pointer",
            activeAlert === 'production' && "ring-2 ring-indigo-500 border-indigo-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Producción</CardTitle>
            <Factory className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{pendingOrders.length}</div>
            <p className="text-xs text-slate-500 mt-1">Órdenes activas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Flujo de Caja y Ganancias</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${settings.currency}${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="#10b981" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ganancia" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGanancia)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-3 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button onClick={() => setActiveTab('sales')} variant="outline" className="h-20 flex flex-col gap-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                <Plus size={20} className="text-blue-600" />
                <span className="text-xs font-medium">Nueva Venta</span>
              </Button>
              <Button onClick={() => setActiveTab('production')} variant="outline" className="h-20 flex flex-col gap-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                <Factory size={20} className="text-indigo-600" />
                <span className="text-xs font-medium">Producir</span>
              </Button>
              <Button onClick={() => setActiveTab('purchasing')} variant="outline" className="h-20 flex flex-col gap-2 border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
                <ShoppingCart size={20} className="text-amber-600" />
                <span className="text-xs font-medium">Comprar</span>
              </Button>
              <Button onClick={() => setActiveTab('rawMaterials')} variant="outline" className="h-20 flex flex-col gap-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all">
                <Package size={20} className="text-emerald-600" />
                <span className="text-xs font-medium">Ajuste Stock</span>
              </Button>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-slate-200 shadow-sm transition-all",
            activeAlert !== 'none' && "ring-2",
            activeAlert === 'stock' && "ring-amber-500",
            activeAlert === 'production' && "ring-indigo-500",
            activeAlert === 'sales' && "ring-emerald-500"
          )}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {activeAlert === 'stock' ? "Listado de Stock Bajo" : 
                 activeAlert === 'production' ? "Órdenes en Proceso" :
                 activeAlert === 'sales' ? "Últimas Ventas" :
                 "Alertas de Inventario"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeAlert === 'none' || activeAlert === 'stock' ? (
                  <>
                    {lowStockItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">{item.stock} {item.unit}</p>
                          <p className="text-xs text-slate-400">Mín: {item.minStock}</p>
                        </div>
                      </div>
                    ))}
                    {lowStockItems.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No hay alertas de stock</p>
                    )}
                  </>
                ) : activeAlert === 'production' ? (
                  <>
                    {pendingOrders.map((order) => {
                      const product = items.find(i => i.id === order.productId);
                      return (
                        <div key={order.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">{product?.name || 'Producto'}</p>
                            <p className="text-xs text-slate-500">Orden: {order.id.slice(-6)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-indigo-600">{order.quantity} {product?.unit}</p>
                            <p className="text-xs text-slate-400">En proceso</p>
                          </div>
                        </div>
                      );
                    })}
                    {pendingOrders.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No hay órdenes en proceso</p>
                    )}
                  </>
                ) : activeAlert === 'sales' ? (
                  <>
                    {filteredSales.slice(0, 5).map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">{sale.customer}</p>
                          <p className="text-xs text-slate-500">{new Date(sale.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">{settings.currency}{sale.total.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">{sale.items.length} items</p>
                        </div>
                      </div>
                    ))}
                    {filteredSales.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No hay ventas en este periodo</p>
                    )}
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
