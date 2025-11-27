import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
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
import { useVoiceChat } from "@/hooks/useVoiceChat";

const categories = [
  { value: "iluminacao", label: "Iluminação Pública" },
  { value: "calcada", label: "Calçada" },
  { value: "via", label: "Via Pública" },
  { value: "lixo", label: "Lixo e Limpeza" },
  { value: "verde", label: "Área Verde" },
  { value: "outro", label: "Outro" }
];

export default function ManualReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRecording, isProcessing, startRecording, stopRecording } = useVoiceChat();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null
  });

  const handleVoiceInput = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        setFormData(prev => ({
          ...prev,
          description: prev.description + (prev.description ? ' ' : '') + text
        }));
      }
    } else {
      await startRecording();
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande. Máximo 5MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
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

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('urban-reports')
      .upload(fileName, photoFile);

    if (error) {
      console.error("Erro ao fazer upload da foto:", error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('urban-reports')
      .getPublicUrl(fileName);

    return publicUrl;
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
      let photoUrl: string | null = null;
      
      // Upload da foto se existir
      if (photoFile) {
        photoUrl = await uploadPhoto(user.id);
      }

      const { error } = await supabase
        .from("urban_reports")
        .insert({
          user_id: user.id,
          category: formData.category,
          subcategory: formData.title,
          description: formData.description,
          severity: "medium",
          location_address: formData.location || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          photos: photoUrl ? [photoUrl] : null,
          status: "pending"
        });

      if (error) throw error;

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
                    disabled={isProcessing}
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

              {/* Upload de Foto */}
              <div className="space-y-2">
                <Label>Foto</Label>
                {!photoPreview ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                      id="photo-camera"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoCapture}
                      className="hidden"
                      id="photo-gallery"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-camera')?.click()}
                        className="flex-1"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Tirar Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-gallery')?.click()}
                        className="flex-1"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Galeria
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removePhoto}
                    >
                      <X className="w-4 h-4" />
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
                  onClick={() => navigate("/relato-urbano")}
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

      <FloatingNavbar />
    </div>
  );
}
