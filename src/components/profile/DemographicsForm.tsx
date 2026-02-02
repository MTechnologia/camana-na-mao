import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Users, Palette, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { demographicsSchema } from "@/lib/validations";

interface DemographicsFormProps {
  userId: string;
}

const DemographicsForm = ({ userId }: DemographicsFormProps) => {
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState<Date>();
  const [gender, setGender] = useState("");
  const [race, setRace] = useState("");
  const [socialClass, setSocialClass] = useState("");

  useEffect(() => {
    loadDemographics();
  }, [userId]);

  const loadDemographics = async () => {
    try {
      const { data, error } = await supabase
        .from('user_demographics')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.birth_date) setBirthDate(new Date(data.birth_date));
        if (data.gender) setGender(data.gender);
        if (data.race) setRace(data.race);
        if (data.social_class) setSocialClass(data.social_class);
      }
    } catch (error: any) {
      console.error("Error loading demographics:", error);
    }
  };

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
            birth_date: birthDate?.toISOString().split('T')[0] || null,
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
            birth_date: birthDate?.toISOString().split('T')[0] || null,
            gender: validated.gender,
            race: validated.race,
            social_class: validated.socialClass,
          });

        if (error) throw error;
      }

      toast.success("Dados demográficos salvos com sucesso!");
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        toast.error(error.message || "Erro ao salvar dados");
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
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
