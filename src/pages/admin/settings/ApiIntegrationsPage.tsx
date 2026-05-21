import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Zap } from 'lucide-react';
import { PlatformContentCard } from '@/components/admin/platform/PlatformContentCard';
import { SettingsLayout } from '@/components/admin/settings/SettingsLayout';
import { useConfigEnvironment } from '@/contexts/ConfigEnvironmentContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiHealthStatus } from '@/types/systemConfig';

const healthLabel: Record<ApiHealthStatus, string> = {
  up: 'Operacional',
  degraded: 'Degradado',
  down: 'Indisponível',
  unknown: 'Desconhecido',
};

const healthVariant: Record<
  ApiHealthStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  up: 'default',
  degraded: 'secondary',
  down: 'destructive',
  unknown: 'outline',
};

export function ApiIntegrationsPage() {
  const { config, environmentLabel } = useConfigEnvironment();
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  return (
    <SettingsLayout
      title="Integrações e APIs"
      actions={
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova integração
        </Button>
      }
    >
      {showForm ? (
        <Card className="mb-4">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Cadastrar integração customizada</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="int-slug">Slug</Label>
                <Input
                  id="int-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="minha-api-interna"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-name">Nome exibido</Label>
                <Input
                  id="int-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="API interna — relatórios"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="int-url">URL base</Label>
              <Input
                id="int-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  toast.success('Integração cadastrada', {
                    description: `${slug || 'nova-api'} em ${environmentLabel}.`,
                  });
                  setShowForm(false);
                  setSlug('');
                  setDisplayName('');
                  setBaseUrl('');
                }}
              >
                Salvar
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PlatformContentCard title="Catálogo de integrações" bodyClassName="p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Integração</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Saúde</th>
              <th className="px-4 py-3">Limite/min</th>
              <th className="px-4 py-3">Ativa</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {config.integrations.map((api) => (
              <tr key={api.id} className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{api.displayName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{api.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={api.source === 'catalog' ? 'secondary' : 'outline'}>
                    {api.source === 'catalog' ? 'Catálogo' : 'Custom'}
                  </Badge>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
                  {api.baseUrl}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={healthVariant[api.healthStatus]}>
                    {healthLabel[api.healthStatus]}
                  </Badge>
                </td>
                <td className="px-4 py-3 tabular-nums">{api.rateLimitPerMinute}</td>
                <td className="px-4 py-3">
                  <Badge variant={api.enabled ? 'default' : 'outline'}>
                    {api.enabled ? 'Sim' : 'Não'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      toast.message('Health check', { description: api.slug })
                    }
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden />
                    Testar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PlatformContentCard>
    </SettingsLayout>
  );
}
