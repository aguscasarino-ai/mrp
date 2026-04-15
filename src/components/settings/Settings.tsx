import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings as SettingsIcon, 
  Users, 
  Shield, 
  Coins, 
  Save,
  UserPlus,
  Trash2,
  Mail
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useSettings } from '@/lib/SettingsContext';

export function Settings() {
  const { settings, updateSettings } = useSettings();
  const [currency, setCurrency] = React.useState(settings.currency);
  const [businessName, setBusinessName] = React.useState(settings.businessName);
  const [productionCapacity, setProductionCapacity] = React.useState(settings.productionCapacity || 0);

  React.useEffect(() => {
    setCurrency(settings.currency);
    setBusinessName(settings.businessName);
    setProductionCapacity(settings.productionCapacity || 0);
  }, [settings]);

  const handleSaveGeneral = async () => {
    try {
      await updateSettings({ currency, businessName, productionCapacity });
      toast.success('Configuración general guardada');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Configuración</h2>
        <p className="text-slate-500 text-sm">Gestiona los parámetros de tu negocio, usuarios y permisos.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">General</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Usuarios y Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5 text-blue-600" />
                Parámetros del Negocio
              </CardTitle>
              <CardDescription>Configura la moneda y el nombre de tu empresa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio</Label>
                  <Input 
                    id="businessName" 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda (Símbolo)</Label>
                  <Input 
                    id="currency" 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="$"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productionCapacity">Capacidad de Producción Diaria (Órdenes)</Label>
                  <Input 
                    id="productionCapacity" 
                    type="number"
                    value={productionCapacity} 
                    onChange={(e) => setProductionCapacity(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button onClick={handleSaveGeneral} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="mr-2 h-4 w-4" /> Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2 border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Listado de Usuarios
                  </CardTitle>
                  <CardDescription>Usuarios con acceso a la plataforma.</CardDescription>
                </div>
                <Button onClick={() => toast.info('Función de invitación en desarrollo')} size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  <UserPlus className="mr-2 h-4 w-4" /> Invitar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">A</div>
                      <div>
                        <p className="text-sm font-semibold">Agustin Casarino</p>
                        <p className="text-xs text-slate-500">agustin.casarino@coinboxmarketing.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">Administrador</span>
                      <Button onClick={() => toast.info('No puedes eliminar al administrador principal')} variant="ghost" size="icon" className="text-slate-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Roles y Permisos
                </CardTitle>
                <CardDescription>Define qué puede hacer cada rol.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold">Administrador</p>
                  <p className="text-xs text-slate-500">Acceso total a todas las secciones y configuraciones.</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-sm font-bold">Operador</p>
                  <p className="text-xs text-slate-500">Puede gestionar inventario y producción, pero no ver reportes financieros.</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-sm font-bold">Vendedor</p>
                  <p className="text-xs text-slate-500">Solo acceso a la sección de ventas.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
