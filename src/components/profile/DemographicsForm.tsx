import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Users, Palette, Briefcase } from "lucide-react";
import { format, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { demographicsSchema } from "@/lib/validations";

// Helper function to format date as YYYY-MM-DD without timezone conversion
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to parse date from YYYY-MM-DD string without timezone issues
const parseDateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date in local timezone (not UTC)
  return new Date(year, month - 1, day);
};

const months = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

interface DemographicsFormProps {
  userId: string;
}

const DemographicsForm = ({ userId }: DemographicsFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState<Date>();
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [race, setRace] = useState("");
  const [socialClass, setSocialClass] = useState("");

  // Generate year options (1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse();

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
          const date = parseDateLocal(data.birth_date);
          setBirthDate(date);
          setDisplayMonth(date);
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
      
      // Redirect to profile page after successful save
      setTimeout(() => {
        navigate("/perfil");
      }, 500);
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
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                <div className="p-3 space-y-3">
                  {/* Year/Month selectors */}
                  <div className="flex gap-2">
                    <Select
                      value={displayMonth.getMonth().toString()}
                      onValueChange={(monthValue) => {
                        const newDate = setMonth(displayMonth, parseInt(monthValue));
                        setDisplayMonth(newDate);
                      }}
                    >
                      <SelectTrigger className="flex-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 z-[60] bg-popover">
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={displayMonth.getFullYear().toString()}
                      onValueChange={(yearValue) => {
                        const newDate = setYear(displayMonth, parseInt(yearValue));
                        setDisplayMonth(newDate);
                      }}
                    >
                      <SelectTrigger className="w-24 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 z-[60] bg-popover">
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Calendar */}
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={(date) => {
                      if (date) {
                        // Create date in local timezone to avoid timezone issues
                        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        setBirthDate(localDate);
                        setDisplayMonth(localDate);
                        // Close calendar after selection
                        setCalendarOpen(false);
                      }
                    }}
                    month={displayMonth}
                    onMonthChange={setDisplayMonth}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    locale={ptBR}
                    className={cn("pointer-events-auto")}
                  />
                </div>
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
