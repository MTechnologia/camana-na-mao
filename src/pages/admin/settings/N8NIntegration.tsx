import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link2, CheckCircle2, XCircle, TestTube, Activity, Loader2, AlertTriangle, ChevronDown, Copy, Database, ArrowLeftRight, Clock, ExternalLink, Download, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventConfig {
  key: string;
  label: string;
  enabled: boolean;
}

interface IntegrationLog {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  status: string;
  created_at: string;
  error_message: string | null;
}

type Environment = 'test' | 'production' | 'unknown';

const detectEnvironment = (url: string): Environment => {
  if (!url) return 'unknown';
  if (url.includes('/webhook-test/')) return 'test';
  if (url.includes('/webhook/')) return 'production';
  return 'unknown';
};

const SUPABASE_URL = 'https://vzkwkcypkfrpfhhsghwn.supabase.co';
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/n8n-callback`;

// Template de workflow N8N pré-configurado (v3 Switch Node + v4.2 HTTP Request)
const n8nWorkflowTemplate = {
  "name": "CMSP Connect - Processamento de Manifestações",
  "nodes": [
    {
      "parameters": { "httpMethod": "POST", "path": "cmsp-manifestacao", "options": {} },
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Webhook CMSP",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "webhookId": "cmsp-manifestacao"
    },
    {
      "parameters": {
        "mode": "rules",
        "rules": {
          "values": [
            {
              "conditions": {
                "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
                "conditions": [{ "leftValue": "={{ $json.body.event }}", "rightValue": "urban_report_created", "operator": { "type": "string", "operation": "equals" } }],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Urbano"
            },
            {
              "conditions": {
                "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
                "conditions": [{ "leftValue": "={{ $json.body.event }}", "rightValue": "transport_report_created", "operator": { "type": "string", "operation": "equals" } }],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Transporte"
            },
            {
              "conditions": {
                "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
                "conditions": [{ "leftValue": "={{ $json.body.event }}", "rightValue": "service_rating_created", "operator": { "type": "string", "operation": "equals" } }],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Avaliacao"
            }
          ]
        },
        "options": { "fallbackOutput": "none" }
      },
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "name": "Tipo de Evento",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [500, 300]
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json.body;\nconst report = input.report;\nconst description = (report.description || '').toLowerCase();\nlet priority = 'normal';\nlet tags = [];\nconst urgentKeywords = ['urgente', 'perigo', 'risco', 'acidente'];\nif (urgentKeywords.some(k => description.includes(k))) {\n  priority = 'urgente';\n  tags.push('ATENCAO_IMEDIATA');\n}\nreturn { report_id: report.id, report_type: 'urban', callback_url: input.callback_url, secret_key: input.secret_key, processed_data: { priority, validated_category: report.category, tags, workflow_id: $workflow.id } };"
      },
      "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "name": "Processar Relato Urbano",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [750, 150]
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json.body;\nconst report = input.report;\nlet priority = 'normal';\nlet tags = [];\nconst criticalKeywords = ['acidente', 'colisão', 'quebrado'];\nif (criticalKeywords.some(k => (report.description || '').toLowerCase().includes(k))) {\n  priority = 'urgente';\n  tags.push('INCIDENTE_CRITICO');\n}\nreturn { report_id: report.id, report_type: 'transport', callback_url: input.callback_url, secret_key: input.secret_key, processed_data: { priority, validated_category: report.report_type, tags, workflow_id: $workflow.id } };"
      },
      "id": "d4e5f6a7-b8c9-0123-defa-456789012345",
      "name": "Processar Relato Transporte",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [750, 300]
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json.body;\nconst report = input.report;\nlet priority = 'normal';\nlet tags = [];\nif (report.rating_stars <= 2) { priority = 'alta'; tags.push('AVALIACAO_NEGATIVA'); }\nreturn { report_id: report.id, report_type: 'service_rating', callback_url: input.callback_url, secret_key: input.secret_key, processed_data: { priority, validated_category: 'avaliacao_servico', tags, workflow_id: $workflow.id } };"
      },
      "id": "e5f6a7b8-c9d0-1234-efab-567890123456",
      "name": "Processar Avaliação Serviço",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [750, 450]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.callback_url }}",
        "sendHeaders": true,
        "headerParameters": { "parameters": [{ "name": "Content-Type", "value": "application/json" }] },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"report_id\": \"{{ $json.report_id }}\",\n  \"report_type\": \"{{ $json.report_type }}\",\n  \"secret_key\": \"{{ $json.secret_key }}\",\n  \"processed_data\": {{ JSON.stringify($json.processed_data) }}\n}",
        "options": { "timeout": 10000 }
      },
      "id": "f6a7b8c9-d0e1-2345-fabc-678901234567",
      "name": "Callback CMSP",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1000, 300]
    }
  ],
  "connections": {
    "Webhook CMSP": { "main": [[{ "node": "Tipo de Evento", "type": "main", "index": 0 }]] },
    "Tipo de Evento": { "main": [[{ "node": "Processar Relato Urbano", "type": "main", "index": 0 }], [{ "node": "Processar Relato Transporte", "type": "main", "index": 0 }], [{ "node": "Processar Avaliação Serviço", "type": "main", "index": 0 }]] },
    "Processar Relato Urbano": { "main": [[{ "node": "Callback CMSP", "type": "main", "index": 0 }]] },
    "Processar Relato Transporte": { "main": [[{ "node": "Callback CMSP", "type": "main", "index": 0 }]] },
    "Processar Avaliação Serviço": { "main": [[{ "node": "Callback CMSP", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1", "saveManualExecutions": true, "callerPolicy": "workflowsFromSameOwner" },
  "staticData": null,
  "pinData": {},
  "active": false,
  "triggerCount": 1
};

const N8NIntegration = () => {
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [connectionInfoOpen, setConnectionInfoOpen] = useState(true);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  const environment = detectEnvironment(webhookUrl);
  
  const [events, setEvents] = useState<EventConfig[]>([
    { key: 'urban_report', label: 'Novo relato urbano criado', enabled: true },
    { key: 'transport_report', label: 'Novo relato de transporte criado', enabled: true },
    { key: 'service_rating', label: 'Nova avaliação de serviço', enabled: false },
    { key: 'report_critical', label: 'Relato marcado como crítico', enabled: true },
    { key: 'pattern_detected', label: 'Padrão detectado pela IA', enabled: false },
  ]);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadLogs();
    }
  }, [user]);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('n8n_integration_logs')
        .select('id, event_type, entity_type, entity_id, status, created_at, error_message')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs((data || []) as IntegrationLog[]);
    } catch (error) {
      console.error('Error loading N8N logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

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
          <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                  Ativo
                </Badge>
              )}
              {environment === 'test' && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  🟡 TESTE
                </Badge>
              )}
              {environment === 'production' && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  🟢 PRODUÇÃO
                </Badge>
              )}
            </div>
          </div>
          
          {/* Aviso para Ambiente de Teste */}
          {environment === 'test' && (
            <Alert className="bg-yellow-500/5 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                <strong>Ambiente de Teste Detectado</strong>
                <p className="mt-1">
                  Para que o webhook funcione, você precisa <strong>executar manualmente o workflow</strong> no N8N cada vez que fizer um teste. 
                  URLs de teste não ficam ativas permanentemente.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  💡 Para uso em produção, remova <code className="bg-muted px-1 rounded">/webhook-test/</code> da URL e use <code className="bg-muted px-1 rounded">/webhook/</code>
                </p>
              </AlertDescription>
            </Alert>
          )}
        </Card>

        {/* Configuração do Webhook */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Configuração do Webhook</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">URL do Webhook N8N *</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://n8n.example.com/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-xs text-muted-foreground">
                  Cole o URL do webhook gerado no seu workflow N8N
                </p>
                {environment === 'test' && (
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <TestTube className="h-3 w-3" />
                    URL de teste - requer execução manual no N8N
                  </p>
                )}
                {environment === 'production' && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    URL de produção - workflow sempre ativo
                  </p>
                )}
              </div>
            </div>

            {/* Configurações Avançadas - Colapsável */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                    Configurações Avançadas (opcional)
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div>
                  <Label htmlFor="secret-key">Secret Key</Label>
                  <Input
                    id="secret-key"
                    type="password"
                    placeholder="••••••••••••"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione uma chave secreta apenas se você configurou autenticação no seu webhook N8N
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-2 pt-2">
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

        {/* Dados de Conexão para N8N */}
        <Card className="p-6">
          <Collapsible open={connectionInfoOpen} onOpenChange={setConnectionInfoOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Dados de Conexão para N8N</h3>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${connectionInfoOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use estes dados para configurar seu workflow no N8N
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Supabase URL</p>
                    <p className="font-mono text-sm">{SUPABASE_URL}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(SUPABASE_URL, 'URL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Callback URL (para retorno do N8N)</p>
                    <p className="font-mono text-sm break-all">{CALLBACK_URL}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(CALLBACK_URL, 'Callback URL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {secretKey && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Secret Key</p>
                      <p className="font-mono text-sm">••••••••{secretKey.slice(-4)}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(secretKey, 'Secret Key')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Alert className="bg-primary/5 border-primary/20">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <strong>Fluxo Bidirecional</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Relato criado → Enviado automaticamente para seu webhook N8N</li>
                    <li>N8N processa (valida, prioriza, categoriza)</li>
                    <li>N8N envia resultado para o <strong>Callback URL</strong> acima</li>
                    <li>Dados enriquecidos aparecem no Kanban admin</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Logs de Integração */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Logs de Integração</h3>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={logsLoading}>
              {logsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
            </Button>
          </div>
          
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum log de integração ainda
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={log.event_type === 'outbound' ? 'default' : 'secondary'}>
                        {log.event_type === 'outbound' ? '↑ Enviado' : '↓ Recebido'}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {log.entity_type === 'urban' ? 'Relato Urbano' : 
                           log.entity_type === 'transport' ? 'Relato Transporte' : log.entity_type}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {log.entity_id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          log.status === 'delivered' || log.status === 'received'
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : log.status === 'failed'
                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                        }
                      >
                        {log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Template de Workflow N8N */}
        <Card className="p-6">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent mb-4">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Template de Workflow N8N</h3>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Importe este template diretamente no N8N para ter um workflow pré-configurado com processamento de manifestações.
              </p>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const template = JSON.stringify(n8nWorkflowTemplate, null, 2);
                    navigator.clipboard.writeText(template);
                    toast.success('Template copiado para a área de transferência!');
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const template = JSON.stringify(n8nWorkflowTemplate, null, 2);
                    const blob = new Blob([template], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'cmsp-connect-n8n-workflow.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('Template baixado!');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arquivo
                </Button>
              </div>

              <Alert className="bg-blue-500/5 border-blue-500/20">
                <FileJson className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  <strong>Como importar no N8N:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Abra seu N8N e vá em <strong>Workflows → Import</strong></li>
                    <li>Cole o JSON ou selecione o arquivo baixado</li>
                    <li>Configure o webhook URL e ative o workflow</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-muted rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">cmsp-connect-n8n-workflow.json</span>
                </div>
                <ScrollArea className="h-[400px]">
                  <pre className="p-4 font-mono text-xs whitespace-pre overflow-x-auto">
                    {JSON.stringify(n8nWorkflowTemplate, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Payload de Exemplo */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Payload Enviado ao N8N</h3>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{`{
  "event": "urban_report_created",
  "timestamp": "2024-12-08T14:30:00Z",
  "report": {
    "id": "uuid-do-relato",
    "type": "urban",
    "category": "iluminacao",
    "description": "Poste apagado há 3 dias...",
    "location_address": "Rua das Flores, 123"
  },
  "user": {
    "id": "abc12345..."
  },
  "callback_url": "${CALLBACK_URL}",
  "secret_key": "sua-secret-key"
}`}</pre>
          </div>

          <Separator className="my-4" />

          <h3 className="text-lg font-semibold mb-4">Payload de Retorno do N8N</h3>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{`{
  "report_id": "uuid-do-relato",
  "report_type": "urban",
  "secret_key": "sua-secret-key",
  "processed_data": {
    "priority": "alta",
    "validated_category": "iluminacao_publica",
    "tags": ["zona_leste", "recorrente"],
    "enriched_data": {
      "similar_reports_count": 5,
      "suggested_department": "ILUME"
    },
    "workflow_id": "n8n-workflow-123"
  }
}`}</pre>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default N8NIntegration;
