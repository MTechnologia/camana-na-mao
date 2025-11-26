import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  { value: "iluminacao", label: "Iluminação Pública" },
  { value: "calcada", label: "Calçada" },
  { value: "via", label: "Via Pública" },
  { value: "lixo", label: "Lixo e Limpeza" },
  { value: "verde", label: "Área Verde" },
  { value: "outro", label: "Outro" }
];

const severities = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" }
];

export default function ManualReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    subcategory: "",
    description: "",
    severity: "medium",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar autenticado");
      navigate("/login");
      return;
    }

    if (!formData.category || !formData.description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("urban_reports")
        .insert({
          user_id: user.id,
          category: formData.category,
          subcategory: formData.subcategory || null,
          description: formData.description,
          severity: formData.severity,
          location_address: formData.location || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
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

              {/* Subcategoria */}
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategoria (opcional)</Label>
                <Textarea
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                  placeholder="Ex: Poste apagado, buraco grande, etc."
                  rows={2}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva detalhadamente o problema..."
                  rows={4}
                  required
                />
              </div>

              {/* Gravidade */}
              <div className="space-y-2">
                <Label htmlFor="severity">Gravidade</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severities.map((sev) => (
                      <SelectItem key={sev.value} value={sev.value}>
                        {sev.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Localização */}
              <div className="space-y-2">
                <Label>Localização</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={requestLocation}
                    className="flex-1"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {formData.latitude ? "Localização Capturada" : "Capturar Localização"}
                  </Button>
                </div>
                {formData.location && (
                  <p className="text-xs text-muted-foreground">
                    {formData.location}
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
