import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { registerStep1Schema, registerStep2Schema } from "@/lib/validations";
import { toast } from "sonner";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/integrations/supabase/client";
import StepIndicator from "@/components/register/StepIndicator";
import AboutYouStep from "@/components/register/AboutYouStep";
import LocationStep from "@/components/register/LocationStep";
import InterestsStep from "@/components/register/InterestsStep";
import { formatPhone, unformatPhone } from "@/lib/phoneMask";

const TOTAL_STEPS = 5;

interface FormData {
  // Step 1: Basic info
  fullName: string;
  email: string;
  phone: string;
  // Step 2: Password
  password: string;
  confirmPassword: string;
  // Terms acceptance
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  // Step 3: About You
  birthDate: string;
  gender: string;
  race: string;
  incomeRange: string;
  // Step 4: Location
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  // Step 5: Interests
  interests: string[];
}

const Register = () => {
  const navigate = useNavigate();
  const { signUp, signOut } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
    acceptedPrivacy: false,
    birthDate: "",
    gender: "",
    race: "",
    incomeRange: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    interests: [],
  });

  const handleChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "" };
    if (password.length < 6) return { strength: 33, label: "Fraca", color: "bg-red-500" };
    if (password.length < 10) return { strength: 66, label: "Média", color: "bg-yellow-500" };
    return { strength: 100, label: "Forte", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      registerStep1Schema.parse({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });
      setCurrentStep(2);
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => toast.error(err.message));
      }
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      registerStep2Schema.parse({
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      
      // Validate terms acceptance
      if (!formData.acceptedTerms || !formData.acceptedPrivacy) {
        toast.error("Você precisa aceitar os termos de uso e a política de privacidade para continuar");
        return;
      }

      setLoading(true);
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone
      );

      if (!error && data?.user) {
        setUserId(data.user.id);
        // Garantir que nome e celular fiquem no perfil (upsert: cria se trigger ainda não rodou, atualiza se já existir)
        await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              full_name: formData.fullName.trim() || "Usuário",
              phone: formData.phone.trim() || null,
            },
            { onConflict: "id" }
          );

        // Record consents in database
        try {
          await supabase.rpc('grant_consent', {
            _user_id: data.user.id,
            _consent_type: 'terms_of_use',
            _version: '1.0'
          });
          
          await supabase.rpc('grant_consent', {
            _user_id: data.user.id,
            _consent_type: 'privacy_policy',
            _version: '1.0'
          });
        } catch (consentErr) {
          console.error('Error recording consents:', consentErr);
          // Don't block registration if consent recording fails
        }
        
        setCurrentStep(3);
      }
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => toast.error(err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAboutYouContinue = () => {
    if (!formData.birthDate?.trim()) {
      toast.error("Informe sua data de nascimento.");
      return;
    }
    if (!formData.gender?.trim()) {
      toast.error("Selecione o gênero.");
      return;
    }
    if (!formData.race?.trim()) {
      toast.error("Selecione raça/cor.");
      return;
    }
    if (!formData.incomeRange?.trim()) {
      toast.error("Selecione a faixa de renda familiar.");
      return;
    }
    setCurrentStep(4);
  };

  const handleLocationContinue = () => {
    if (!formData.cep || !formData.neighborhood) {
      toast.error("Informe o CEP e aguarde o endereço ser preenchido.");
      return;
    }
    if (!formData.number?.trim()) {
      toast.error("Informe o número do endereço.");
      return;
    }
    setCurrentStep(5);
  };

  const toggleInterest = (interestId: string) => {
    const current = formData.interests;
    const updated = current.includes(interestId)
      ? current.filter(id => id !== interestId)
      : [...current, interestId];
    handleChange("interests", updated);
  };

  const handleFinalSubmit = async () => {
    if (formData.interests.length < 3) {
      toast.error("Selecione pelo menos 3 interesses");
      return;
    }

    if (!formData.birthDate?.trim() || !formData.gender?.trim() || !formData.race?.trim() || !formData.incomeRange?.trim()) {
      toast.error("Preencha todos os campos da etapa Sobre você.");
      return;
    }

    if (!userId) {
      toast.error("Erro no cadastro. Tente novamente.");
      return;
    }

    // Endereço obrigatório no cadastro (CEP e número; complemento é opcional)
    const hasAddress = formData.cep && formData.neighborhood && formData.number?.trim();
    if (!hasAddress) {
      toast.error("Preencha o CEP e o número do endereço.");
      return;
    }

    setLoading(true);
    try {
      if (!supabaseAnonKey || !supabaseUrl) {
        toast.error("Configuração do app incompleta. Tente novamente ou contate o suporte.");
        setLoading(false);
        return;
      }
      const payload = {
        userId,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim() || null,
        birthDate: formData.birthDate || null,
        gender: formData.gender || null,
        race: formData.race || null,
        incomeRange: formData.incomeRange || "",
        cep: formData.cep,
        street: formData.street || "",
        number: formData.number.trim(),
        complement: formData.complement?.trim() || null,
        neighborhood: formData.neighborhood,
        city: formData.city || "São Paulo",
        state: formData.state || "SP",
        interests: formData.interests,
      };

      // Usar token da sessão do usuário (válido após signUp); evita 401 quando anon key não está disponível em produção
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? supabaseAnonKey;
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente e complete o cadastro em Perfil.");
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/complete-registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string };
      if (!res.ok) {
        console.error("complete-registration error:", res.status, data);
        toast.error(data?.details || data?.error || "Não foi possível concluir o cadastro. Tente novamente.");
        return;
      }
      if (data?.error) {
        toast.error(data.details || data.error);
        return;
      }

      toast.success("Cadastro concluído! Confirme seu e-mail para acessar o app.");
      await signOut();
      navigate("/confirmar-email", { state: { email: formData.email }, replace: true });
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/login");
    } else if (currentStep > 2) {
      // After account creation, allow going back through profile steps
      setCurrentStep(prev => prev - 1);
    } else {
      setCurrentStep(1);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return { main: "Olá!", sub: "queremos\nte conhecer!" };
      case 2: return { main: "Quase lá!", sub: "Crie sua senha" };
      case 3: return { main: "Conta criada!", sub: "Agora, conte mais\nsobre você" };
      case 4: return { main: "Onde você", sub: "mora?" };
      case 5: return { main: "Por fim,", sub: "seus interesses" };
      default: return { main: "", sub: "" };
    }
  };

  const title = getStepTitle();

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <button
          onClick={handleBack}
          className="mb-4 -ml-2 text-foreground hover:text-primary transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <h1 className="text-3xl font-bold text-foreground leading-tight whitespace-pre-line">
          {title.main}<br />
          {title.sub}
        </h1>
      </div>

      {/* Step Indicator */}
      <div className="px-6">
        <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Form Card */}
      <div className="flex-1 bg-background rounded-t-[32px] px-6 pt-6 pb-8 overflow-y-auto">
        {currentStep === 1 && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Vamos começar</h2>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Nome completo
                </label>
                <Input
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="h-12 bg-muted/50 border-border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="h-12 bg-muted/50 border-border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Celular
                </label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formatPhone(formData.phone)}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    handleChange("phone", unformatPhone(formatted));
                  }}
                  className="h-12 bg-muted/50 border-border rounded-xl"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium mt-4"
              >
                Continuar
              </Button>
            </form>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">Segurança</h2>
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="h-12 bg-muted/50 border-border rounded-xl pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite sua senha novamente"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className="h-12 bg-muted/50 border-border rounded-xl pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              {/* Terms and Privacy Acceptance */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptedTerms}
                    onCheckedChange={(checked) => handleChange("acceptedTerms", checked as boolean)}
                    className="mt-1"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-foreground leading-relaxed cursor-pointer"
                  >
                    Aceito os{" "}
                    <Link
                      to="/privacidade"
                      target="_blank"
                      className="text-primary underline hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      termos de uso
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacy"
                    checked={formData.acceptedPrivacy}
                    onCheckedChange={(checked) => handleChange("acceptedPrivacy", checked as boolean)}
                    className="mt-1"
                  />
                  <label
                    htmlFor="privacy"
                    className="text-sm text-foreground leading-relaxed cursor-pointer"
                  >
                    Aceito a{" "}
                    <Link
                      to="/privacidade"
                      target="_blank"
                      className="text-primary underline hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      política de privacidade
                    </Link>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !formData.acceptedTerms || !formData.acceptedPrivacy}
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Criando conta..." : "Continuar"}
              </Button>
            </form>
          </>
        )}

        {currentStep === 3 && (
          <AboutYouStep
            data={{
              birthDate: formData.birthDate,
              gender: formData.gender,
              race: formData.race,
              incomeRange: formData.incomeRange,
            }}
            onChange={(field, value) => handleChange(field, value)}
            onContinue={handleAboutYouContinue}
          />
        )}

        {currentStep === 4 && (
          <LocationStep
            data={{
              cep: formData.cep,
              street: formData.street,
              number: formData.number,
              complement: formData.complement,
              neighborhood: formData.neighborhood,
              city: formData.city,
              state: formData.state,
            }}
            onChange={(field, value) => handleChange(field, value)}
            onContinue={handleLocationContinue}
          />
        )}

        {currentStep === 5 && (
          <InterestsStep
            selectedInterests={formData.interests}
            onToggle={toggleInterest}
            onContinue={handleFinalSubmit}
            loading={loading}
          />
        )}

        {/* Login Link - only show on first two steps */}
        {currentStep <= 2 && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-foreground font-semibold">
              Fazer login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Register;
