import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link2, CheckCircle2, XCircle, TestTube, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EventConfig {
  key: string;
  label: string;
  enabled: boolean;
}

const N8NIntegration = () => {
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  
  const [events, setEvents] = useState<EventConfig[]>([
    { key: 'urban_report_created', label: 'Novo relato urbano criado', enabled: true },
    { key: 'transport_report_created', label: 'Novo relato de transporte criado', enabled: true },
    { key: 'report_critical', label: 'Relato marcado como crítico', enabled: true },
    { key: 'report_resolved', label: 'Relato resolvido', enabled: false },
    { key: 'pattern_detected', label: 'Padrão detectado pela IA', enabled: false },
  ]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('n8n_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettingsId(data.id);
        setWebhookUrl(data.webhook_url);
        setSecretKey(data.secret_key || '');
        setIsConnected(data.is_connected);
        
        // Parse enabled_events do JSONB
        if (Array.isArray(data.enabled_events)) {
          setEvents(data.enabled_events as unknown as EventConfig[]);
        }
      }
    } catch (error) {
      console.error('Error loading N8N settings:', error);
      toast.error('Erro ao carregar configurações');
    }
  };

  const saveSettings = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!webhookUrl) {
      toast.error('URL do webhook é obrigatória');
      return;
    }

    // Validar URL
    try {
      new URL(webhookUrl);
    } catch {
      toast.error('URL inválida');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        user_id: user.id,
        webhook_url: webhookUrl,
        secret_key: secretKey || null,
        is_connected: isConnected,
        enabled_events: events as unknown as any,
      };

      if (settingsId) {
        const { error } = await supabase
          .from('n8n_settings')
          .update(payload)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('n8n_settings')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (data) setSettingsId(data.id);
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving N8N settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!webhookUrl) {
      toast.error('Configure o URL do webhook primeiro');
      return;
    }

    setIsTesting(true);

    try {
      const testPayload = {
        event: 'test.connection',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Teste de conexão do CMSP Connect',
          app_version: '1.0.0',
        }
      };

      // Usar a Edge Function como proxy para evitar CORS
      const { data, error } = await supabase.functions.invoke('n8n-webhook', {
        body: {
          webhookUrl,
          payload: testPayload,
          secretKey: secretKey || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        setIsConnected(true);
        toast.success('Conexão estabelecida com sucesso!');
        
        // Salvar automaticamente após conexão bem-sucedida
        await saveSettings();
      } else {
        setIsConnected(false);
        toast.error(data.message || 'Falha na conexão');
      }
    } catch (error) {
      setIsConnected(false);
      toast.error('Erro ao testar conexão. Verifique a URL e tente novamente.');
      console.error('Connection test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleEvent = (eventKey: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.key === eventKey ? { ...event, enabled: !event.enabled } : event
      )
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integração N8N</h1>
          <p className="text-muted-foreground">Configure webhooks para automação de workflows</p>
        </div>

        {/* Status da Conexão */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-500/10' : 'bg-muted'}`}>
                {isConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">Status da Conexão</p>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? 'Conectado' : 'Não configurado'}
                </p>
              </div>
            </div>
            {isConnected && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                Ativo
              </Badge>
            )}
          </div>
        </Card>

        {/* Configuração do Webhook */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Configuração do Webhook</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">URL do Webhook N8N</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://n8n.example.com/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole o URL do webhook gerado no seu workflow N8N
              </p>
            </div>
            <div>
              <Label htmlFor="secret-key">Secret Key (Opcional)</Label>
              <Input
                id="secret-key"
                type="password"
                placeholder="••••••••••••"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Adicione uma chave secreta para autenticação do webhook
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={saveSettings} 
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
              <Button
                onClick={testConnection}
                variant="outline"
                disabled={isTesting || !webhookUrl}
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Eventos Ativos */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Eventos que Disparam o Webhook</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione quais eventos devem disparar notificações para o N8N
          </p>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.key} className="flex items-center justify-between p-3 rounded-lg border">
                <Label htmlFor={event.key} className="cursor-pointer">
                  {event.label}
                </Label>
                <Switch
                  id={event.key}
                  checked={event.enabled}
                  onCheckedChange={() => toggleEvent(event.key)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Dados Enviados */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Dados Enviados no Payload</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Dados completos do relato</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Dados do usuário (anonimizados)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Análise de sentimento da IA</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Geolocalização (quando disponível)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Timestamp do evento</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{`{
  "event": "urban_report_created",
  "timestamp": "2024-11-27T14:30:00Z",
  "data": {
    "report_id": "uuid",
    "category": "infraestrutura",
    "severity": "high",
    "location": {...},
    "sentiment": "negative",
    "user": {
      "id": "anonymized_id",
      "region": "Zona Leste"
    }
  }
}`}</pre>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default N8NIntegration;
