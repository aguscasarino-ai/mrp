/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { RawMaterials } from '@/components/inventory/RawMaterials';
import { Products } from '@/components/inventory/Products';
import { Production } from '@/components/production/Production';
import { Purchasing } from '@/components/purchasing/Purchasing';
import { Sales } from '@/components/sales/Sales';
import { Settings } from '@/components/settings/Settings';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Bell, User as UserIcon, Search, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SettingsProvider, useSettings } from '@/lib/SettingsContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

function AppContent() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const { user, signOut } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'rawMaterials':
        return <RawMaterials />;
      case 'production':
      case 'production_boms':
        return <Production activeTab="boms" />;
      case 'production_orders':
        return <Production activeTab="orders" />;
      case 'production_stock':
        return <Products />;
      case 'purchasing':
        return <Purchasing />;
      case 'sales':
        return <Sales />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            {/* Search removed */}
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => toast.info('No tienes notificaciones nuevas')} className="p-2 text-slate-500 hover:bg-slate-50 rounded-full relative transition-colors">
              <Bell size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 pl-1 hover:bg-slate-50 p-1 rounded-lg transition-colors outline-none cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900 leading-none">{user?.displayName || 'Usuario'}</p>
                  <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
                </div>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="h-9 w-9 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                    {user?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      
      <Toaster position="top-right" closeButton />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

