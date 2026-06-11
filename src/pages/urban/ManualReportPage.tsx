import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import {
  resolveReturnToChatAction,
  type ManualReportNavigationState,
} from "@/lib/manualReportNavigation";
import PageHeader from "@/components/ui/page-header";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Send, Mic, MicOff, Camera, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { moderateUploadedImage, IMAGE_MODERATION_BLOCKED_MESSAGE } from "@/lib/moderateImage";
import { convertHeicToJpegIfNeeded } from "@/lib/heicConvert";
import { useAuth } from "@/contexts/AuthContext";
import { logManualClassificationPrediction } from "@/lib/classificationPredictionLog";
import { isGpsAccuracyAcceptable } from "@/lib/gpsAccuracy";

/** Valores alinhados a `VALID_URBAN_CATEGORIES` / relato via chat (OS: pavimentação, sinalização, drenagem explícitas). */
const categories = [
  { value: "iluminacao", label: "Iluminação pública" },
  { value: "calcada", label: "Calçada" },
  { value: "via_publica", label: "Via pública (buraco, erosão, lombada)" },
  { value: "pavimentacao", label: "Pavimentação (recape, asfaltamento, obra)" },
  { value: "sinalizacao", label: "Sinalização (semáforo, placa, faixa)" },
  { value: "drenagem", label: "Drenagem / água pluvial (sarjeta, galeria)" },
  { value: "esgoto", label: "Esgoto / bueiro sanitário" },
  { value: "lixo", label: "Lixo e limpeza" },
  { value: "area_verde", label: "Área verde / praça" },
  { value: "higiene_urbana", label: "Higiene urbana" },
  { value: "animais", label: "Animais" },
  { value: "poluicao", label: "Poluição / barulho" },
  { value: "feedback_camara", label: "Feedback à Câmara" },
  { value: "outro", label: "Outro" },
];

function normalizeManualCategory(raw: string): string {
  if (raw === "via") return "via_publica";
  if (raw === "verde") return "area_verde";
  return raw;
}

const DRAFT_KEY = "cmsp_urban_report_draft";

export default function ManualReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveConversationId } = useAIJourney();
  const returnNavState = location.state as ManualReportNavigationState | null | undefined;
  const hasReturnToChat = Boolean(returnNavState?.returnToChatConversationId?.trim());
  const { user } = useAuth();

  const handleReturnToChat = () => {
    const { path, conversationId } = resolveReturnToChatAction(returnNavState);
    if (conversationId) setActiveConversationId(conversationId);
    navigate(path);
  };
  const MAX_PHOTOS = 3;
  const MAX_PHOTO_MB = 15;
  const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;

  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInApp =
    typeof window !== "undefined" &&
    !!(window as unknown as { __CAMARA_IN_APP__?: boolean }).__CAMARA_IN_APP__;
  const isSupported =
    typeof window !== "undefined" &&
    !isInApp &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const [formData, setFormData] = useState(() => {
    // Carregar draft do sessionStorage na inicialização
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        if (typeof parsed.category === "string") {
          parsed.category = normalizeManualCategory(parsed.category);
        }
        return parsed;
      }
    } catch {
      /* ignore parse errors for draft */
    }
    return {
      category: "",
      title: "",
      description: "",
      location: "",
      latitude: null as number | null,
      longitude: null as number | null,
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
      const w = window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognition;
        SpeechRecognition?: new () => SpeechRecognition;
      };
      const SpeechRecognition = w.webkitSpeechRecognition ?? w.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "pt-BR";
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setFormData((prev) => ({
          ...prev,
          description: prev.description + (prev.description ? " " : "") + transcript,
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

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photoFiles.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos. Remova uma para adicionar outra.`);
      input.value = "";
      return;
    }

    const toAdd: File[] = [];
    for (let i = 0; i < files.length && toAdd.length < remaining; i++) {
      const file = await convertHeicToJpegIfNeeded(files[i]); // HEIC (iPhone) → JPEG
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`"${file.name}" é muito grande. Máximo ${MAX_PHOTO_MB}MB por imagem.`);
        continue;
      }
      toAdd.push(file);
    }

    if (toAdd.length) {
      setPhotoFiles((prev) => [...prev, ...toAdd].slice(0, MAX_PHOTOS));
      setPhotoPreviews((prev) =>
        [...prev, ...toAdd.map((f) => URL.createObjectURL(f))].slice(0, MAX_PHOTOS),
      );
    }
    input.value = "";
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
        const { latitude, longitude, accuracy } = position.coords;
        if (!isGpsAccuracyAcceptable(accuracy)) {
          toast.error(
            accuracy != null
              ? `Precisão insuficiente (${Math.round(accuracy)}m). Requer ≤15m. Tente em área aberta ou informe CEP.`
              : "Não foi possível verificar a precisão do GPS. Tente em área aberta ou informe o CEP.",
          );
          return;
        }
        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));
        toast.success("Localização capturada!");
      },
      () => {
        toast.error("Não foi possível obter sua localização");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    if (!photoFiles.length) return [];

    const urls: string[] = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`;

      const { error } = await supabase.storage.from("urban-reports").upload(fileName, file);

      if (error) {
        console.error("Erro ao fazer upload da foto:", error);
        throw error;
      }

      // Moderação de conteúdo: se reprovada, o servidor já removeu o objeto; pula a foto.
      const moderation = await moderateUploadedImage("urban-reports", fileName);
      if (moderation.blocked) {
        toast.error(`"${file.name}": ${IMAGE_MODERATION_BLOCKED_MESSAGE}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("urban-reports").getPublicUrl(fileName);
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
        severity: null,
        location_address: formData.location || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        photos: photoUrls.length ? photoUrls : null,
        status: "pending",
      };

      const { data: insertedReport, error } = await supabase
        .from("urban_reports")
        .insert(reportPayload)
        .select()
        .single();

      if (error) throw error;

      await logManualClassificationPrediction(supabase, {
        userId: user.id,
        reportId: insertedReport.id,
        reportType: "urban",
        predictedCategory: formData.category,
        predictedSubcategory: formData.title?.trim() || null,
      });

      // Limpar draft após sucesso
      sessionStorage.removeItem(DRAFT_KEY);

      toast.success("Relato enviado com sucesso!");

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
      <PageHeader
        title="Relato Manual"
        onBack={hasReturnToChat ? handleReturnToChat : undefined}
        backTo={hasReturnToChat ? undefined : "/relatos"}
      />

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
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
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
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
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
                <Label>
                  Fotos (até {MAX_PHOTOS}, máx. {MAX_PHOTO_MB}MB cada)
                </Label>
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
                      <div
                        key={index}
                        className="relative rounded-lg overflow-hidden border aspect-square"
                      >
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
                      onClick={() => document.getElementById("photo-camera")?.click()}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Tirar Foto{" "}
                      {photoPreviews.length > 0 &&
                        `(${MAX_PHOTOS - photoPreviews.length} restante${MAX_PHOTOS - photoPreviews.length === 1 ? "" : "s"})`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("photo-gallery")?.click()}
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
                  <p className="text-xs text-muted-foreground">📍 {formData.location}</p>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4">
                {hasReturnToChat ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReturnToChat}
                    className="flex-1"
                    disabled={loading}
                  >
                    Voltar ao chat
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/relatos")}
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={loading}>
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
