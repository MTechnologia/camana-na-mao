import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandardDatePicker } from "@/components/ui/standard-date-picker";
import { CalendarIcon, Users, Palette, Briefcase } from "lucide-react";
import { formatDateLocal, parseDateLocal } from "@/lib/datePickerConstants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { demographicsSchema } from "@/lib/validations";

interface DemographicsFormProps {
  userId: string;
  /** Callback opcional após save bem-sucedido. Quando passado, substitui o
   *  redirect default para /perfil. Usado no fluxo pós-convite (HU-11.1). */
  onSaved?: () => void;
}

const DemographicsForm = ({ userId, onSaved }: DemographicsFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState<Date>();
  const [gender, setGender] = useState("");
  const [race, setRace] = useState("");
  const [socialClass, setSocialClass] = useState("");

  const loadDemographics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_demographics')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.birth_date) {
          // Parse date without timezone conversion
          setBirthDate(parseDateLocal(data.birth_date));
        }
        if (data.gender) setGender(data.gender);
        if (data.race) setRace(data.race);
        // social_class no cadastro vem como E/D/C/AB (complete-registration); exibir corretamente
        if (data.social_class) setSocialClass(data.social_class);
        else setSocialClass("prefiro_nao_informar");
      }
    } catch (error: unknown) {
      console.error("Error loading demographics:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadDemographics();
  }, [loadDemographics]);

  const handleSave = async () => {
    try {
      const validated = demographicsSchema.parse({
        birthDate: birthDate || null,
        gender,
        race,
        socialClass,
      });

      setLoading(true);

      const { data: existing } = await supabase
        .from('user_demographics')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_demographics')
          .update({
            birth_date: birthDate ? formatDateLocal(birthDate) : null,
            gender: validated.gender,
            race: validated.race,
            social_class: validated.socialClass,
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_demographics')
          .insert({
            user_id: userId,
            birth_date: birthDate ? formatDateLocal(birthDate) : null,
            gender: validated.gender,
            race: validated.race,
            social_class: validated.socialClass,
          });

        if (error) throw error;
      }

      toast.success("Dados demográficos salvos com sucesso!");

      // Se há callback (fluxo pós-convite), delega; senão segue para perfil.
      if (onSaved) {
        setTimeout(() => onSaved(), 500);
      } else {
        setTimeout(() => {
          navigate("/perfil");
        }, 500);
      }
    } catch (error: unknown) {
      const err = error as { errors?: Array<{ message?: string }>; message?: string };
      if (err?.errors) {
        err.errors.forEach((e) => toast.error(e.message ?? 'Erro'));
      } else {
        toast.error(err?.message || "Erro ao salvar dados");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Dados Demográficos
          </CardTitle>
          <CardDescription>
            Esses dados ajudam a entender melhor as necessidades da população e são usados de forma anônima para estatísticas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              Data de Nascimento
            </label>
            <StandardDatePicker
              value={birthDate}
              onChange={setBirthDate}
              minYear={1900}
              maxYear={new Date().getFullYear()}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Gênero <span className="text-destructive">*</span>
            </label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione seu gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="nao_binario">Não-binário</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
              <Palette className="h-3.5 w-3.5" />
              Raça/Cor <span className="text-destructive">*</span>
            </label>
            <Select value={race} onValueChange={setRace}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione sua raça/cor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branca">Branca</SelectItem>
                <SelectItem value="preta">Preta</SelectItem>
                <SelectItem value="parda">Parda</SelectItem>
                <SelectItem value="amarela">Amarela</SelectItem>
                <SelectItem value="indigena">Indígena</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5" />
              Classe Social <span className="text-destructive">*</span>
            </label>
            <Select value={socialClass} onValueChange={setSocialClass}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione sua classe social" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Classe A (Acima de R$ 20.000)</SelectItem>
                <SelectItem value="B">Classe B (R$ 10.000 - R$ 20.000)</SelectItem>
                <SelectItem value="AB">Classe A/B (Acima de R$ 10.000)</SelectItem>
                <SelectItem value="C">Classe C (R$ 4.000 - R$ 10.000)</SelectItem>
                <SelectItem value="D">Classe D (R$ 2.000 - R$ 4.000)</SelectItem>
                <SelectItem value="E">Classe E (Até R$ 2.000)</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={loading || !gender || !race || !socialClass}
        className="w-full h-11"
      >
        {loading ? "Salvando..." : "Salvar Dados Demográficos"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        * Campos obrigatórios
      </p>
    </div>
  );
};

export default DemographicsForm;
