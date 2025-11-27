import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WidgetSelector } from '@/components/analytics/WidgetSelector';
import { DashboardBuilder } from '@/components/analytics/DashboardBuilder';
import { DashboardPreview, type DashboardConfig, type WidgetConfig } from '@/components/analytics/DashboardPreview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AdminLayout } from '@/layouts/AdminLayout';

export default function AdminCreateDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [config, setConfig] = useState<DashboardConfig>({ widgets: [] });
  const [saving, setSaving] = useState(false);

  const handleAddWidget = (widget: WidgetConfig) => {
    setConfig({
      widgets: [...config.widgets, widget],
    });
    toast.success('Widget adicionado ao painel!');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Por favor, informe um título para o painel');
      return;
    }

    if (config.widgets.length === 0) {
      toast.error('Adicione pelo menos um widget ao painel');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('dashboards').insert([{
        title: title.trim(),
        description: description.trim() || null,
        config: config as any,
        is_public: isPublic,
        is_approved: false,
        user_id: user?.id,
      }]);

      if (error) throw error;

      toast.success(
        isPublic
          ? 'Painel criado! Aguarde aprovação para publicação.'
          : 'Painel privado criado com sucesso!'
      );
      
      navigate('/admin/dashboards');
    } catch (error: any) {
      console.error('Error saving dashboard:', error);
      toast.error(error.message || 'Erro ao salvar o painel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/dashboards')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Criar Painel Personalizado
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure e construa um novo painel analítico
            </p>
          </div>
        </div>

        {/* Dashboard Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Painel</CardTitle>
            <CardDescription>
              Defina o título, descrição e visibilidade do seu painel analítico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Painel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Análise de Relatos Urbanos por Região"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo e insights deste painel..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="is-public">Solicitar Publicação</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar para aprovação da administração para tornar público
                </p>
              </div>
              <Switch
                id="is-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {isPublic && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Atenção:</strong> Painéis públicos passam por revisão da administração 
                  antes de serem visíveis para outros usuários.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: Build vs Preview */}
        <Tabs defaultValue="build" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="build">Construir</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Widget Selector */}
              <div>
                <WidgetSelector onAddWidget={handleAddWidget} />
              </div>

              {/* Dashboard Builder */}
              <div>
                <DashboardBuilder config={config} onChange={setConfig} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Preview Completo</CardTitle>
                <CardDescription>
                  Visualize como seu painel ficará quando publicado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardPreview config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/dashboards')}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Painel'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
