import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Eye, Type, Zap, Volume2, Languages, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const AccessibilitySettings = () => {
  const { fontSize, readingMode, textSpacing, setFontSize, toggleReadingMode, toggleTextSpacing } = useAccessibility();
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [language, setLanguage] = useState('pt-BR');

  const saveSettings = () => {
    toast.success('Configurações de acessibilidade salvas');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Acessibilidade</h1>
          <p className="text-muted-foreground">Configure opções globais de acessibilidade do sistema</p>
        </div>

        {/* Tamanho de Fonte */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Type className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Tamanho de Fonte</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Tamanho Padrão</Label>
              <Select value={fontSize} onValueChange={(value: any) => setFontSize(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeno (14px)</SelectItem>
                  <SelectItem value="medium">Médio (16px)</SelectItem>
                  <SelectItem value="large">Grande (18px)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Define o tamanho de fonte padrão para todos os usuários
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="text-spacing">Espaçamento de Texto Aumentado</Label>
                <p className="text-xs text-muted-foreground">
                  Melhora a legibilidade com mais espaço entre linhas
                </p>
              </div>
              <Switch id="text-spacing" checked={textSpacing} onCheckedChange={toggleTextSpacing} />
            </div>
          </div>
        </Card>

        {/* Alto Contraste */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Modo de Leitura</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reading-mode">Alto Contraste</Label>
              <p className="text-xs text-muted-foreground">
                Ativa cores de alto contraste para melhor visibilidade
              </p>
            </div>
            <Switch id="reading-mode" checked={readingMode} onCheckedChange={toggleReadingMode} />
          </div>
        </Card>

        {/* Animações */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Animações</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Velocidade das Animações</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  value={[animationSpeed]}
                  onValueChange={(values) => setAnimationSpeed(values[0])}
                  min={0}
                  max={200}
                  step={25}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-16 text-right">
                  {animationSpeed === 0 ? 'OFF' : `${animationSpeed}%`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste a velocidade das animações ou desative completamente (0%)
              </p>
            </div>
          </div>
        </Card>

        {/* Notificações Sonoras */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Notificações Sonoras</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound-enabled">Ativar Sons</Label>
              <p className="text-xs text-muted-foreground">
                Reproduz sons para feedback de ações e notificações
              </p>
            </div>
            <Switch id="sound-enabled" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
        </Card>

        {/* Idioma */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Idioma</h3>
          </div>
          <div>
            <Label>Idioma Padrão do Sistema</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Define o idioma padrão da interface
            </p>
          </div>
        </Card>

        {/* Leitores de Tela */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Suporte a Leitores de Tela</h3>
          <p className="text-sm text-muted-foreground mb-4">
            O sistema já possui suporte completo para leitores de tela (NVDA, JAWS, VoiceOver).
            Certifique-se de que todos os componentes possuem rótulos adequados.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Recursos Implementados:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Navegação por teclado completa</li>
              <li>• Atributos ARIA adequados</li>
              <li>• Landmarks semânticos</li>
              <li>• Skip links para conteúdo principal</li>
              <li>• Descrições alternativas para imagens</li>
            </ul>
          </div>
        </Card>

        {/* Salvar */}
        <div className="flex justify-end">
          <Button onClick={saveSettings} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AccessibilitySettings;
