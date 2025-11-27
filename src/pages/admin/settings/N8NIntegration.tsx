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
import { Link2, CheckCircle2, XCircle, TestTube, Activity } from 'lucide-react';
import { toast } from 'sonner';

const N8NIntegration = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [events, setEvents] = useState({
    urban_report_created: true,
    transport_report_created: true,
    report_critical: true,
    report_resolved: false,
    pattern_detected: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load from localStorage (in production, this would come from Supabase)
    const savedUrl = localStorage.getItem('n8n_webhook_url');
    const savedSecret = localStorage.getItem('n8n_secret_key');
    const savedEvents = localStorage.getItem('n8n_events');
    
    if (savedUrl) setWebhookUrl(savedUrl);
    if (savedSecret) setSecretKey(savedSecret);
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    
    setIsConnected(!!savedUrl);
  };

  const saveSettings = () => {
    localStorage.setItem('n8n_webhook_url', webhookUrl);
    localStorage.setItem('n8n_secret_key', secretKey);
    localStorage.setItem('n8n_events', JSON.stringify(events));
    setIsConnected(true);
    toast.success('Configurações salvas com sucesso');
  };

  const testConnection = async () => {
    if (!webhookUrl) {
      toast.error('Configure o URL do webhook primeiro');
      return;
    }

    setIsTesting(true);
    try {
      const testPayload = {
        event: 'test_connection',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Teste de conexão do CMSP Connect',
        },
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secretKey && { 'X-Secret-Key': secretKey }),
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast.success('Conexão testada com sucesso!');
      } else {
        toast.error(`Erro na conexão: ${response.status}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const toggleEvent = (eventKey: string) => {
    setEvents((prev) => ({ ...prev, [eventKey]: !prev[eventKey as keyof typeof prev] }));
  };

  const eventLabels = {
    urban_report_created: 'Novo relato urbano criado',
    transport_report_created: 'Novo relato de transporte criado',
    report_critical: 'Relato marcado como crítico',
    report_resolved: 'Relato resolvido',
    pattern_detected: 'Padrão detectado pela IA',
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
              <Button onClick={saveSettings} className="flex-1">
                Salvar Configurações
              </Button>
              <Button
                onClick={testConnection}
                variant="outline"
                disabled={isTesting || !webhookUrl}
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Testando...' : 'Testar Conexão'}
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
            {Object.entries(eventLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                <Label htmlFor={key} className="cursor-pointer">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={events[key as keyof typeof events]}
                  onCheckedChange={() => toggleEvent(key)}
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
