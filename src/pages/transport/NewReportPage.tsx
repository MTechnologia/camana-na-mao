import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, ImageIcon, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineSearchInput } from '@/components/transport/LineSearchInput';
import { ProblemTypeSelector } from '@/components/transport/ProblemTypeSelector';
import { ReportSummaryCard } from '@/components/transport/ReportSummaryCard';
import { ReportSuccessCard } from '@/components/shared/ReportSuccessCard';
import { PatternAlert } from '@/components/transport/PatternAlert';
import { Input } from '@/components/ui/input';
import { StandardDatePicker } from '@/components/ui/standard-date-picker';
import { StandardTimeInput } from '@/components/ui/standard-time-input';
import { formatDateLocal, parseDateLocal } from '@/lib/datePickerConstants';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/ui/page-header';
import { useTransportReport } from '@/hooks/useTransportReport';
import { useReportPatterns } from '@/hooks/useReportPatterns';
import { useTransportSubscriptions } from '@/hooks/useTransportSubscriptions';
import { useTransportLines } from '@/hooks/useTransportLines';
import { resolveTransportLine } from '@/lib/transportLinesApi';
import { TransportLineFollowButton } from '@/components/transport/TransportLineFollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_PHOTOS = 3;
const MAX_PHOTO_MB = 50;
const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;

export default function NewReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitReport, submitting } = useTransportReport();
  const { patterns } = useReportPatterns();
  const transportFollow = useTransportSubscriptions();
  const { searchLinesRemote } = useTransportLines({ loadCatalog: false });
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState<Record<string, unknown>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState('');
  const [relatedPattern, setRelatedPattern] = useState<{ id: string; [key: string]: unknown } | null>(null);
  const [followableLine, setFollowableLine] = useState<{ id: string; label: string } | null>(null);
  const [resolvingFollowLine, setResolvingFollowLine] = useState(false);

  useEffect(() => {
    if (reportData.line_id && reportData.report_type) {
      const pattern = patterns.find(p => 
        p.line_id === reportData.line_id && 
        p.pattern_type === reportData.report_type
      );
      setRelatedPattern(pattern);
    }
  }, [reportData.line_id, reportData.report_type, patterns]);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;
  const selectedLineCode =
    typeof reportData.line_code === 'string' && reportData.line_code.trim().length > 0
      ? reportData.line_code.trim()
      : '';
  const selectedLineLabel =
    followableLine?.label ||
    [
      typeof reportData.line_code === 'string' ? reportData.line_code : '',
      typeof reportData.line_name === 'string' && reportData.line_name !== 'Linha informada manualmente'
        ? reportData.line_name
        : '',
    ]
      .filter(Boolean)
      .join(' - ') ||
    undefined;
  const canFollowSelectedLine = Boolean(followableLine?.id);

  const resolveLineForFollow = async (line: {
    id?: string | null;
    line_code: string;
    line_name: string;
  }) => {
    if (line.id) {
      return {
        id: line.id,
        label: `${line.line_code} - ${line.line_name}`,
      };
    }

    const searchTerm = line.line_code.trim();
    if (searchTerm.length < 2) {
      return null;
    }

    setResolvingFollowLine(true);
    try {
      const matches = await searchLinesRemote(searchTerm, 8);
      const normalized = searchTerm.toLowerCase();
      const exactMatch =
        matches.find((item) => item.line_code.trim().toLowerCase() === normalized) ??
        matches.find((item) => item.line_name.trim().toLowerCase() === normalized) ??
        (matches.length === 1 ? matches[0] : null);

      if (!exactMatch) {
        const resolved = await resolveTransportLine({
          line_code: line.line_code,
          line_name: line.line_name,
        });
        return {
          id: resolved.id,
          label: `${resolved.line_code} - ${resolved.line_name}`,
        };
      }

      if (exactMatch.id) {
        return {
          id: exactMatch.id,
          label: `${exactMatch.line_code} - ${exactMatch.line_name}`,
        };
      }

      const resolved = await resolveTransportLine({
        line_code: exactMatch.line_code,
        line_name: exactMatch.line_name,
        sptrans_codigo_linha: exactMatch.sptrans_codigo_linha,
        line_type: exactMatch.line_type,
      });
      return {
        id: resolved.id,
        label: `${resolved.line_code} - ${resolved.line_name}`,
      };
    } catch (error) {
      console.error('Erro ao resolver linha para acompanhamento:', error);
      return null;
    } finally {
      setResolvingFollowLine(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Você precisa estar autenticado', variant: 'destructive' });
      return;
    }
    try {
      const photoUrls = photoFiles.length ? await uploadPhotos(user.id) : [];
      const result = await submitReport({
        line_id: reportData.line_id,
        line_code_custom: reportData.line_code,
        report_type: reportData.report_type,
        description: reportData.description,
        occurrence_date: reportData.occurrence_date,
        occurrence_time: reportData.occurrence_time,
        location: reportData.location,
        impact_description: reportData.impact_description,
        photos: photoUrls.length ? photoUrls : null,
      });
      
      setReportId(result.id);
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting report:', err);
    }
  };

  const handleNewReport = () => {
    setStep(1);
    setReportData({});
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setSuccess(false);
    setReportId('');
    setRelatedPattern(null);
    setFollowableLine(null);
    setResolvingFollowLine(false);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photoFiles.length;
    if (remaining <= 0) {
      toast({ title: `Máximo de ${MAX_PHOTOS} fotos`, variant: 'destructive' });
      e.target.value = '';
      return;
    }
    const toAdd: File[] = [];
    for (let i = 0; i < files.length && toAdd.length < remaining; i++) {
      if (files[i].size > MAX_PHOTO_BYTES) {
        toast({ title: `"${files[i].name}" é muito grande. Máximo ${MAX_PHOTO_MB}MB por imagem.`, variant: 'destructive' });
        continue;
      }
      toAdd.push(files[i]);
    }
    setPhotoFiles((prev) => [...prev, ...toAdd].slice(0, MAX_PHOTOS));
    setPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))].slice(0, MAX_PHOTOS));
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    if (!photoFiles.length) return [];
    const urls: string[] = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from('urban-reports').upload(fileName, file);
      if (error) {
        console.error('Erro ao fazer upload da foto:', error);
        throw error;
      }
      const { data: { publicUrl } } = supabase.storage.from('urban-reports').getPublicUrl(fileName);
      urls.push(publicUrl);
    }
    return urls;
  };

  if (success) {
    return (
      <>
        <PageHeader title="Novo Relato" backTo="/relatos" />
        <div className="min-h-screen bg-gray-50 pt-[60px] p-4 pb-6 flex items-center justify-center">
          <div className="max-w-md w-full">
            <ReportSuccessCard
              reportId={reportId}
              variant="transport"
              onViewPatterns={() =>
                navigate(
                  canFollowSelectedLine
                    ? `/transporte/padroes?lineId=${encodeURIComponent(followableLine!.id)}`
                    : '/transporte/padroes',
                )
              }
              subscribeContent={
                canFollowSelectedLine ? (
                  <TransportLineFollowButton
                    lineId={followableLine!.id}
                    lineLabel={selectedLineLabel}
                    subscriptions={transportFollow.subscriptions}
                    loading={transportFollow.loading}
                    toggleSubscription={transportFollow.toggleSubscription}
                    className="w-full"
                  />
                ) : undefined
              }
              onNewReport={handleNewReport}
            />
            {!canFollowSelectedLine && selectedLineCode ? (
              <Alert className="mt-3">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Não foi possível vincular essa linha ao cadastro oficial, então o acompanhamento automático não está
                  disponível para este relato.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title={`Passo ${step} de ${totalSteps}`}
        onBack={step > 1 ? handleBack : undefined}
        backTo={step === 1 ? '/relatos' : undefined}
      />
      <div className="min-h-screen bg-gray-50 pt-[60px] pb-6">
        <div className="sticky top-[60px] z-10 bg-gray-50 border-b px-4 py-2">
          <Progress value={progress} />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
          {relatedPattern && (
            <PatternAlert pattern={relatedPattern} />
          )}

          {step >= 2 &&
            canFollowSelectedLine && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Quer ser avisado quando houver novos relatos ou padrões nesta linha?
                </p>
                <TransportLineFollowButton
                  lineId={followableLine!.id}
                  lineLabel={selectedLineLabel}
                  subscriptions={transportFollow.subscriptions}
                  loading={transportFollow.loading}
                  toggleSubscription={transportFollow.toggleSubscription}
                  className="shrink-0 self-start sm:self-center"
                />
              </div>
            )}
          {step >= 2 && !canFollowSelectedLine && selectedLineCode && !resolvingFollowLine ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Você pode continuar com o relato, mas o acompanhamento da linha só fica disponível quando conseguimos
                identificar a linha no cadastro oficial.
              </AlertDescription>
            </Alert>
          ) : null}
          
          {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Qual linha?</h2>
              <p className="text-muted-foreground">Busque a linha de ônibus ou metrô</p>
            </div>
            <LineSearchInput
              onSelectLine={async (line) => {
                const resolvedLine = await resolveLineForFollow(line);
                setFollowableLine(resolvedLine);
                setReportData({
                  ...reportData,
                  line_id: resolvedLine?.id ?? line.id ?? null,
                  line_code: line.line_code,
                  line_name: line.line_name,
                });
                handleNext();
              }}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Tipo de problema</h2>
              <p className="text-muted-foreground">Selecione o que melhor descreve a situação</p>
            </div>
            <ProblemTypeSelector
              selectedType={reportData.report_type}
              onSelect={(type) => {
                setReportData({ ...reportData, report_type: type });
                setTimeout(handleNext, 300);
              }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Quando aconteceu?</h2>
              <p className="text-muted-foreground">Informe data e horário aproximado</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Data</Label>
                <StandardDatePicker
                  value={
                    reportData.occurrence_date
                      ? parseDateLocal(reportData.occurrence_date)
                      : undefined
                  }
                  onChange={(date) =>
                    setReportData({
                      ...reportData,
                      occurrence_date: date ? formatDateLocal(date) : '',
                    })
                  }
                  maxYear={new Date().getFullYear()}
                  disabled={(date) => date > new Date()}
                />
              </div>
              <div>
                <Label>Horário (opcional)</Label>
                <StandardTimeInput
                  value={reportData.occurrence_time || ''}
                  onChange={(e) =>
                    setReportData({ ...reportData, occurrence_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Local específico (opcional)</Label>
                <Input
                  placeholder="Ex: Ponto Terminal Jabaquara"
                  value={reportData.location || ''}
                  onChange={(e) => setReportData({ ...reportData, location: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleNext} disabled={!reportData.occurrence_date} className="w-full">
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Conte mais detalhes</h2>
              <p className="text-muted-foreground">Isso nos ajuda a entender melhor o problema</p>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Descreva o que aconteceu..."
                value={reportData.description || ''}
                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>Como isso impactou sua rotina? (opcional)</Label>
              <Textarea
                placeholder="Ex: Cheguei 30 minutos atrasado no trabalho"
                value={reportData.impact_description || ''}
                onChange={(e) => setReportData({ ...reportData, impact_description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Fotos (opcional, até {MAX_PHOTOS})</Label>
              <p className="text-xs text-muted-foreground mb-2">Máximo {MAX_PHOTO_MB}MB por imagem</p>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
                id="transport-photo-camera"
              />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
                id="transport-photo-gallery"
              />
              {photoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden border w-16 h-16 shrink-0">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-0 right-0 h-6 w-6"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {photoPreviews.length < MAX_PHOTOS && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('transport-photo-camera')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-1.5" />
                    Câmera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('transport-photo-gallery')?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-1.5" />
                    Galeria ({MAX_PHOTOS - photoPreviews.length})
                  </Button>
                </div>
              )}
            </div>
            <Button onClick={handleNext} className="w-full">
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Resumo do relato</h2>
              <p className="text-muted-foreground">Revise as informações e as fotos antes de enviar</p>
            </div>
            <ReportSummaryCard
              data={{
                ...reportData,
                photos: photoPreviews.length > 0 ? photoPreviews : undefined,
              }}
              onEdit={() => setStep(1)}
              onConfirm={handleSubmit}
              loading={submitting}
            />
          </div>
        )}
        </div>
      </div>
    </>
  );
}
