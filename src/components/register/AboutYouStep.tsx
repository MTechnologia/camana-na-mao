import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Users, Info } from "lucide-react";

interface AboutYouData {
  birthDate: string;
  gender: string;
  race: string;
  incomeRange: string;
}

interface AboutYouStepProps {
  data: AboutYouData;
  onChange: (field: keyof AboutYouData, value: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "nao_binario", label: "Não-binário" },
  { value: "prefiro_nao_dizer", label: "Prefiro não dizer" },
];

const RACE_OPTIONS = [
  { value: "branca", label: "Branca" },
  { value: "preta", label: "Preta" },
  { value: "parda", label: "Parda" },
  { value: "amarela", label: "Amarela" },
  { value: "indigena", label: "Indígena" },
  { value: "prefiro_nao_dizer", label: "Prefiro não dizer" },
];

// Faixas baseadas no IBGE - apresentadas de forma mais amigável
const INCOME_OPTIONS = [
  { value: "ate_2sm", label: "Até R$ 2.824" },
  { value: "2_a_4sm", label: "R$ 2.824 a R$ 5.648" },
  { value: "4_a_10sm", label: "R$ 5.648 a R$ 14.120" },
  { value: "acima_10sm", label: "Acima de R$ 14.120" },
  { value: "prefiro_nao_dizer", label: "Prefiro não informar" },
];

const AboutYouStep = ({ data, onChange, onContinue, onSkip }: AboutYouStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Sobre você</h2>
        <p className="text-muted-foreground text-sm">
          Informações opcionais para personalizar sua experiência
        </p>
      </div>

      {/* Card explicativo */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm mb-1">
              Por que pedimos isso?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Essas informações nos ajudam a entender melhor quem usa os serviços 
              públicos e garantir que todas as vozes sejam ouvidas pela Câmara Municipal. 
              Seus dados são protegidos e usados apenas para análises estatísticas.
            </p>
          </div>
        </div>
      </Card>

      {/* Data de nascimento */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-2 block">
          Data de nascimento
        </Label>
        <Input
          type="date"
          value={data.birthDate}
          onChange={(e) => onChange("birthDate", e.target.value)}
          className="h-12 bg-muted/50 border-border rounded-xl"
          max={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Gênero */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Gênero
        </Label>
        <RadioGroup
          value={data.gender}
          onValueChange={(value) => onChange("gender", value)}
          className="grid grid-cols-2 gap-2"
        >
          {GENDER_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroupItem
                value={option.value}
                id={`gender-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`gender-${option.value}`}
                className="flex-1 flex items-center justify-center px-3 py-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 border-border hover:border-primary/50"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Raça/Cor */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Raça/Cor
        </Label>
        <RadioGroup
          value={data.race}
          onValueChange={(value) => onChange("race", value)}
          className="grid grid-cols-2 gap-2"
        >
          {RACE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroupItem
                value={option.value}
                id={`race-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`race-${option.value}`}
                className="flex-1 flex items-center justify-center px-3 py-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 border-border hover:border-primary/50"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Renda familiar - apresentação light */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Label className="text-sm font-medium text-foreground">
            Renda familiar mensal
          </Label>
          <div className="group relative">
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              Soma de todos os rendimentos da família
            </div>
          </div>
        </div>
        <RadioGroup
          value={data.incomeRange}
          onValueChange={(value) => onChange("incomeRange", value)}
          className="space-y-2"
        >
          {INCOME_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroupItem
                value={option.value}
                id={`income-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`income-${option.value}`}
                className="flex-1 flex items-center px-4 py-3 rounded-lg border-2 cursor-pointer text-sm transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 border-border hover:border-primary/50"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Botões */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onContinue}
          className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl"
        >
          Continuar
        </Button>
        <Button
          onClick={onSkip}
          variant="ghost"
          className="w-full h-10 text-muted-foreground hover:text-foreground"
        >
          Pular esta etapa
        </Button>
      </div>
    </div>
  );
};

export default AboutYouStep;
