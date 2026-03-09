import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Send, Mic, MicOff, Camera, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const categories = [
  { value: "iluminacao", label: "Iluminação Pública" },
  { value: "calcada", label: "Calçada" },
  { value: "via", label: "Via Pública" },
  { value: "lixo", label: "Lixo e Limpeza" },
  { value: "verde", label: "Área Verde" },
  { value: "outro", label: "Outro" }
];

// Buscar configurações de automação
const getN8NSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('n8n_settings')
      .select('webhook_url, secret_key, enabled_events')
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

// Enviar para processamento automático em background
const sendToN8N = async (reportData: Record<string, unknown>) => {
  try {
    const settings = await getN8NSettings();
    if (!settings || !settings.webhook_url) return;

    // Verificar se o evento urban_report_created está habilitado
    const events = (settings.enabled_events as Array<{ key?: string; enabled?: boolean }>) || [];
    const isEnabled = events.find((e) => e.key === 'urban_report_created')?.enabled;
    if (!isEnabled) return;

    // Enviar para N8N via edge function
    await supabase.functions.invoke('n8n-webhook', {
      body: {
        webhookUrl: settings.webhook_url,
        secretKey: settings.secret_key,
        payload: {
          event: 'urban_report_created',
          timestamp: new Date().toISOString(),
          data: reportData
        }
      }
    });
    
    console.log('✅ Relato enviado para processamento');
  } catch (error) {
    // Log silencioso - não bloquear o fluxo do usuário
    console.error('⚠️ Erro ao enviar para processamento automático (não crítico):', error);
  }
};

const DRAFT_KEY = 'cmsp_urban_report_draft';

export default function ManualReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const MAX_PHOTOS = 3;
  const MAX_PHOTO_MB = 50;
  const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;

  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInApp = typeof window !== 'undefined' && !!(window as unknown as { __CAMARA_IN_APP__?: boolean }).__CAMARA_IN_APP__;
  const isSupported = typeof window !== 'undefined' && !isInApp && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const [formData, setFormData] = useState(() => {
    // Carregar draft do sessionStorage na inicialização
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch { /* ignore parse errors for draft */ }
    return {
      category: "",
      title: "",
      description: "",
      location: "",
      latitude: null as number | null,
      longitude: null as number | null
    };
  });

  // Salvar draft a cada mudança
  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 300);
    return () => clearTimeout(timer);
  }, [formData]);

  // Initialize Web Speech API
  useEffect(() => {
    if (isSupported) {
      const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition; SpeechRecognition?: new () => SpeechRecognition };
      const SpeechRecognition = w.webkitSpeechRecognition ?? w.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setFormData(prev => ({
          ...prev,
          description: prev.description + (prev.description ? ' ' : '') + transcript
        }));
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        toast.error("Erro no reconhecimento de voz");
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Reconhecimento de voz não suportado");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photoFiles.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos. Remova uma para adicionar outra.`);
      e.target.value = "";
      return;
    }

    const toAdd: File[] = [];
    for (let i = 0; i < files.length && toAdd.length < remaining; i++) {
      if (files[i].size > MAX_PHOTO_BYTES) {
        toast.error(`"${files[i].name}" é muito grande. Máximo ${MAX_PHOTO_MB}MB por imagem.`);
        continue;
      }
      toAdd.push(files[i]);
    }

    if (toAdd.length) {
      setPhotoFiles((prev) => [...prev, ...toAdd].slice(0, MAX_PHOTOS));
      setPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))].slice(0, MAX_PHOTOS));
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        }));
        toast.success("Localização capturada!");
      },
      () => {
        toast.error("Não foi possível obter sua localização");
      }
    );
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    if (!photoFiles.length) return [];

    const urls: string[] = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`;

      const { error } = await supabase.storage
        .from('urban-reports')
        .upload(fileName, file);

      if (error) {
        console.error("Erro ao fazer upload da foto:", error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('urban-reports')
        .getPublicUrl(fileName);
      urls.push(publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar autenticado");
      navigate("/login");
      return;
    }

    if (!formData.category || !formData.title || !formData.description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const photoUrls = photoFiles.length ? await uploadPhotos(user.id) : [];

      const reportPayload = {
        user_id: user.id,
        category: formData.category,
        subcategory: formData.title,
        description: formData.description,
        severity: null, // Será classificado pelo N8N
        location_address: formData.location || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        photos: photoUrls.length ? photoUrls : null,
        status: "pending"
      };

      const { data: insertedReport, error } = await supabase
        .from("urban_reports")
        .insert(reportPayload)
        .select()
        .single();

      if (error) throw error;

      // Limpar draft após sucesso
      sessionStorage.removeItem(DRAFT_KEY);
      
      toast.success("Relato enviado com sucesso!");

      // Enviar para N8N em background (não-bloqueante)
      sendToN8N({
        id: insertedReport.id,
        ...reportPayload,
        created_at: insertedReport.created_at,
        categoryLabel: categories.find(c => c.value === formData.category)?.label,
        user: {
          id: user.id,
          name: profile?.full_name || 'Não informado',
          email: user.email || 'Não informado'
        }
      });

      navigate("/relato-urbano/historico");
    } catch (error) {
      console.error("Erro ao enviar relato:", error);
      toast.error("Erro ao enviar relato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Relato Manual" />
      
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Descreva o Problema</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título do Problema *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Buraco na calçada, Poste apagado..."
                  required
                />
              </div>

              {/* Descrição com Ditado */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva detalhadamente o problema ou use o microfone..."
                    rows={4}
                    required
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 bottom-2"
                    onClick={handleVoiceInput}
                    disabled={!isSupported}
                    title="Ditar por voz"
                  >
                    {isRecording ? (
                      <MicOff className="w-5 h-5 text-destructive" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                {isRecording && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    🔴 Gravando... Clique novamente para parar
                  </p>
                )}
              </div>

              {/* Upload de Fotos (até 3, máx 50MB cada) */}
              <div className="space-y-2">
                <Label>Fotos (até {MAX_PHOTOS}, máx. {MAX_PHOTO_MB}MB cada)</Label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoCapture}
                  className="hidden"
                  id="photo-camera"
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoCapture}
                  className="hidden"
                  id="photo-gallery"
                />
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden border aspect-square">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7"
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
                      onClick={() => document.getElementById('photo-camera')?.click()}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Tirar Foto {photoPreviews.length > 0 && `(${MAX_PHOTOS - photoPreviews.length} restante${MAX_PHOTOS - photoPreviews.length === 1 ? "" : "s"})`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo-gallery')?.click()}
                      className="flex-1"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Galeria {photoPreviews.length > 0 && `(${MAX_PHOTOS - photoPreviews.length})`}
                    </Button>
                  </div>
                )}
              </div>

              {/* Localização */}
              <div className="space-y-2">
                <Label>Localização</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestLocation}
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {formData.latitude ? "Localização Capturada ✓" : "Capturar Localização"}
                </Button>
                {formData.location && (
                  <p className="text-xs text-muted-foreground">
                    📍 {formData.location}
                  </p>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/relatos")}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? "Enviando..." : "Enviar Relato"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
