import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  ShoppingCart, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  Receipt,
  TrendingUp,
  Layers,
  ClipboardList,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/SettingsContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'rawMaterials', label: 'Materias Primas', icon: Package },
  { 
    id: 'production', 
    label: 'Producción', 
    icon: Factory,
    subItems: [
      { id: 'production_boms', label: 'Recetas', icon: ClipboardList },
      { id: 'production_orders', label: 'Órdenes de producción', icon: Play },
      { id: 'production_stock', label: 'Productos', icon: Package },
    ]
  },
  { id: 'purchasing', label: 'Compras', icon: ShoppingCart },
  { id: 'sales', label: 'Ventas', icon: Receipt },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <div 
      className={cn(
        "h-screen bg-white border-r border-slate-200 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1 rounded-lg">
              <TrendingUp size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-sm tracking-tight text-slate-900 uppercase truncate max-w-[140px]">
              {settings.businessName}
            </h1>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-500"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id || item.subItems?.some(sub => sub.id === activeTab);
          
          return (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => {
                  if (item.subItems) {
                    setActiveTab(item.subItems[0].id);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={cn(isActive ? "text-blue-600" : "text-slate-400")} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {item.subItems && (
                  collapsed ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  ) : (
                    <ChevronDown size={16} className={cn("transition-transform", isActive ? "rotate-180" : "")} />
                  )
                )}
              </button>
              
              {item.subItems && isActive && (
                <div className={cn("py-1 space-y-1", collapsed ? "px-2" : "pl-10 pr-3")}>
                  {item.subItems.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveTab(sub.id)}
                      title={sub.label}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3",
                        activeTab === sub.id
                          ? "bg-blue-100/50 text-blue-700 font-medium"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                        collapsed && "px-0 justify-center"
                      )}
                    >
                      {sub.icon && <sub.icon size={collapsed ? 18 : 14} className={cn(activeTab === sub.id ? "text-blue-600" : "text-slate-400")} />}
                      {!collapsed && <span>{sub.label}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
            activeTab === 'settings' 
              ? "bg-blue-50 text-blue-700" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <SettingsIcon size={20} className={cn(activeTab === 'settings' ? "text-blue-600" : "text-slate-400")} />
          {!collapsed && <span>Configuración</span>}
        </button>
      </div>
    </div>
  );
}
