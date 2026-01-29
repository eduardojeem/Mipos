'use client';

import { useState, useEffect } from 'react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Search,
  Plus,
  Eye,
  Send,
  Loader2,
  Code,
  FileText,
  Save,
  Undo
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: 'auth' | 'billing' | 'system' | 'marketing';
  last_updated: string;
  is_active: boolean;
}

const mockTemplates: EmailTemplate[] = [
  { id: '1', name: 'Bienvenida a Nueva Organización', subject: 'Bienvenido a MiPOS - Comencemos', category: 'auth', last_updated: '2026-01-20T10:00:00Z', is_active: true },
  { id: '2', name: 'Recuperación de Contraseña', subject: 'Restablece tu contraseña', category: 'auth', last_updated: '2026-01-15T14:30:00Z', is_active: true },
  { id: '3', name: 'Factura Generada', subject: 'Tu factura de MiPOS está lista', category: 'billing', last_updated: '2026-01-25T09:15:00Z', is_active: true },
  { id: '4', name: 'Suscripción Cancelada', subject: 'Lamentamos que te vayas', category: 'billing', last_updated: '2026-01-28T16:45:00Z', is_active: true },
  { id: '5', name: 'Alerta de Límite de Usuarios', subject: 'Has alcanzado el límite de usuarios de tu plan', category: 'system', last_updated: '2026-01-29T11:00:00Z', is_active: true },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    // Simular carga de datos
    const loadTemplates = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setTemplates(mockTemplates);
      setLoading(false);
    };
    loadTemplates();
  }, []);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'auth': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Autenticación</Badge>;
      case 'billing': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Facturación</Badge>;
      case 'system': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Sistema</Badge>;
      case 'marketing': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Marketing</Badge>;
      default: return <Badge variant="outline">{category}</Badge>;
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Cargando plantillas de email...</p>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-pink-500/50">
                <Mail className="h-7 w-7 text-white" />
              </div>
              Plantillas de Email
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
              Gestiona los correos transaccionales y notificaciones del sistema
            </p>
          </div>
          
          <Button className="gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform">
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List Section */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-800/50 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar plantillas..." 
                    className="pl-10" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTemplates.map((t) => (
                    <div 
                      key={t.id} 
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedTemplate?.id === t.id ? 'bg-pink-50/50 dark:bg-pink-900/10 border-l-4 border-pink-500' : ''}`}
                      onClick={() => setSelectedTemplate(t)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{t.name}</h3>
                        {getCategoryBadge(t.category)}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mb-2">{t.subject}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Actualizado: {new Date(t.last_updated).toLocaleDateString()}</span>
                        <Badge variant="outline" className={`h-4 text-[9px] ${t.is_active ? 'text-green-600 border-green-200' : 'text-slate-400'}`}>
                          {t.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor/Detail Section */}
          <div className="lg:col-span-2 space-y-4">
            {selectedTemplate ? (
              <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl min-h-[600px] flex flex-col">
                <CardHeader className="border-b bg-slate-50/30 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedTemplate.name}</CardTitle>
                      <CardDescription>Editando plantilla transaccional</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Send className="h-4 w-4" />
                        Test
                      </Button>
                      <Button className="gap-1 bg-pink-600 text-white">
                        <Save className="h-4 w-4" />
                        Guardar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Asunto del Email</label>
                      <Input defaultValue={selectedTemplate.subject} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categoría</label>
                      <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950">
                        <option value="auth">Autenticación</option>
                        <option value="billing">Facturación</option>
                        <option value="system">Sistema</option>
                        <option value="marketing">Marketing</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Contenido HTML</label>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px]">
                          <Undo className="h-3 w-3" /> Deshacer
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px]">
                          <Code className="h-3 w-3" /> Ver Código
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-[350px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 font-mono text-sm text-pink-400 overflow-auto">
                      <pre>
                        {`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(to right, #db2777, #7c3aed); padding: 2px; border-radius: 8px; }
    .content { background: #fff; padding: 30px; border-radius: 6px; }
    .btn { display: inline-block; padding: 12px 24px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div className="container">
    <div className="header">
      <div className="content">
        <h1>Hola {{user_name}}!</h1>
        <p>Tu organización <strong>{{org_name}}</strong> ha sido creada con éxito.</p>
        <p>Haz clic en el botón de abajo para empezar a configurar tu punto de venta.</p>
        <a href="{{login_url}}" className="btn">Entrar a MiPOS</a>
      </div>
    </div>
  </div>
</body>
</html>`}
                      </pre>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">
                      Variables disponibles: user_name, org_name, login_url, support_email
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl min-h-[600px] flex items-center justify-center text-center p-12">
                <div className="space-y-4">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                    <FileText className="h-10 w-10 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Seleccionar una plantilla</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">
                      Elige una plantilla de la lista de la izquierda para ver su contenido y poder editarla.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
