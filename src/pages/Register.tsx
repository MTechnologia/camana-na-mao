import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordRequirementsChecklist } from "@/components/auth/PasswordRequirementsChecklist";
import {
  passwordRequirements,
  registerCredentialsSchema,
  registerStep1Schema,
  validatePasswordPolicy,
} from "@/lib/validations";
import type { ZodError } from "zod";
import { toast } from "sonner";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/integrations/supabase/client";
import StepIndicator from "@/components/register/StepIndicator";
import AboutYouStep from "@/components/register/AboutYouStep";
import LocationStep from "@/components/register/LocationStep";
import InterestsStep from "@/components/register/InterestsStep";
import { formatPhone, unformatPhone } from "@/lib/phoneMask";

const TOTAL_STEPS = 4;

// Mensagem amigável exibida em pop-up (toast) quando o e-mail informado é inválido.
const INVALID_EMAIL_MESSAGE =
  "Ops! Este e-mail não é válido. Digite um novo endereço de e-mail e tente novamente.";

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
  const { signUp } = useAuth();
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "" };
    const metRequirements = passwordRequirements.filter((requirement) =>
      requirement.test(password),
    ).length;
    if (metRequirements < 3) return { strength: 33, label: "Fraca", color: "bg-red-500" };
    if (metRequirements < passwordRequirements.length)
      return { strength: 66, label: "Média", color: "bg-yellow-500" };
    return { strength: 100, label: "Forte", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const showZodErrors = (error: unknown) => {
    const zodErr = error as ZodError;
    if (zodErr?.issues?.length) {
      zodErr.issues.forEach((issue) => toast.error(issue.message));
      return;
    }
    const legacy = error as { errors?: Array<{ message?: string }> };
    legacy.errors?.forEach((e) => toast.error(e.message ?? "Erro"));
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      registerCredentialsSchema.parse({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (!formData.acceptedTerms || !formData.acceptedPrivacy) {
        toast.error(
          "Você precisa aceitar os termos de uso e a política de privacidade para continuar",
        );
        return;
      }

      // Conta já criada (usuário voltou a esta etapa e avançou de novo): só avança,
      // sem tentar recriar (evita erro "e-mail já cadastrado").
      if (userId) {
        setCurrentStep(2);
        return;
      }

      setLoading(true);
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
      );

      if (!error && data?.user) {
        // Conta criada. Segue para o onboarding (dados demográficos, endereço,
        // interesses) ANTES de mandar o usuário para a tela de confirmação de e-mail.
        setUserId(data.user.id);
        setCurrentStep(2);
        return;
      }
    } catch (error: unknown) {
      showZodErrors(error);
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
    setCurrentStep(3);
  };

  const handleLocationContinue = () => {
    const hasCompleteAddress = !!(formData.cep && formData.neighborhood && formData.number?.trim());
    if (!hasCompleteAddress) {
      toast.info("Você pode concluir agora e cadastrar o endereço depois em Perfil > Endereço.");
    }
    setCurrentStep(4);
  };

  const toggleInterest = (interestId: string) => {
    const current = formData.interests;
    const updated = current.includes(interestId)
      ? current.filter((id) => id !== interestId)
      : [...current, interestId];
    handleChange("interests", updated);
  };

  const handleFinalSubmit = async () => {
    if (formData.interests.length < 3) {
      toast.error("Selecione pelo menos 3 interesses");
      return;
    }

    if (
      !formData.birthDate?.trim() ||
      !formData.gender?.trim() ||
      !formData.race?.trim() ||
      !formData.incomeRange?.trim()
    ) {
      toast.error("Preencha todos os campos da etapa Sobre você.");
      return;
    }

    if (!userId) {
      toast.error("Erro no cadastro. Tente novamente.");
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

      // Token: preferir sessão (atualizada), depois anon key (produção pode não ter env no build)
      await supabase.auth.refreshSession();
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        toast.error(
          data?.details || data?.error || "Não foi possível concluir o cadastro. Tente novamente.",
        );
        return;
      }
      if (data?.error) {
        toast.error(data.details || data.error);
        return;
      }

      toast.success("Cadastro concluído! Confirme seu e-mail para acessar o app.");
      // Encerra a sessão silenciosamente (sem o toast/redirect de "Logout realizado") —
      // o usuário ainda precisa confirmar o e-mail antes de acessar o app.
      await supabase.auth.signOut().catch(() => undefined);
      navigate("/confirmar-email", {
        replace: true,
        state: { email: formData.email.trim() },
      });
    } catch (error: unknown) {
      toast.error(error.message || "Erro ao salvar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/login");
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return { main: "Olá!", sub: "Seja bem vindo a Câmara na Mão - Crie sua conta aqui" };
      case 2:
        return { main: "Conta criada!", sub: "Agora, conte mais\nsobre você" };
      case 3:
        return { main: "Onde você", sub: "mora?" };
      case 4:
        return { main: "Por fim,", sub: "seus interesses" };
      default:
        return { main: "", sub: "" };
    }
  };

  const emailFieldValid =
    formData.email.length > 0 && registerStep1Schema.shape.email.safeParse(formData.email).success;
  const passwordFieldValid = validatePasswordPolicy(formData.password);
  const passwordsMatch =
    formData.password.length > 0 && formData.password === formData.confirmPassword;

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
          {title.main}
          <br />
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
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
                <label className="text-sm font-medium text-foreground mb-2 block">E-mail</label>
                <Input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => {
                    if (formData.email.trim().length > 0 && !emailFieldValid) {
                      toast.error(INVALID_EMAIL_MESSAGE, { id: "register-email-invalido" });
                    }
                  }}
                  className="h-12 bg-muted/50 border-border rounded-xl"
                  required
                />
                {formData.email.length > 0 && (
                  <p
                    className={`text-xs mt-1 ${
                      emailFieldValid ? "text-green-700" : "text-destructive"
                    }`}
                  >
                    {emailFieldValid
                      ? "E-mail com formato válido"
                      : "Informe um e-mail válido com domínio reconhecível"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Celular</label>
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
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Senha</label>
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
                {formData.password.length > 0 && (
                  <PasswordRequirementsChecklist password={formData.password} className="mt-3" />
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
                {formData.confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-destructive mt-1">As senhas não coincidem.</p>
                )}
              </div>
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
                      to="/termos-de-uso"
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
                    onCheckedChange={(checked) =>
                      handleChange("acceptedPrivacy", checked as boolean)
                    }
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
                disabled={
                  loading ||
                  !formData.acceptedTerms ||
                  !formData.acceptedPrivacy ||
                  !emailFieldValid ||
                  !passwordFieldValid ||
                  !passwordsMatch
                }
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-base font-medium mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
          </>
        )}

        {currentStep === 2 && (
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

        {currentStep === 3 && (
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

        {currentStep === 4 && (
          <InterestsStep
            selectedInterests={formData.interests}
            onToggle={toggleInterest}
            onContinue={handleFinalSubmit}
            loading={loading}
          />
        )}

        {/* Login Link - only show on first two steps */}
        {currentStep === 1 && (
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
